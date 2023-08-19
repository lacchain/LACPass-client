import { DidServiceLac1 } from '@services/external/did-lac/did-service';
import { SecureRelayService } from '@services/secure-relay-service/secure.relay.service';
import { randomUUID } from 'crypto';
import { INewAttribute } from 'lacpass-chain-of-trust';
import {
  ICredential,
  IDDCCCredential,
  IDDCCVerifiableCredential,
  IType1Proof,
  IVerifiableCredential
} from 'src/interfaces/verifiable-credential/ddcc.credential';
import { Service } from 'typedi';
import { ethers } from 'ethers';
import { log4TSProvider } from '../../config';
import { DidDocumentService } from '@services/did/did.document.service';
import { BadRequestError } from 'routing-controllers';
import { ErrorsMessages } from '../../constants/errorMessages';

@Service()
export class VerifiableCredentialService {
  log = log4TSProvider.getLogger('IdentityManagerService');
  private secureRelayService: SecureRelayService;
  private authPublicKeys: Map<string, Uint8Array> = new Map<
    string,
    Uint8Array
  >();
  private keyExchangePublicKeys: Map<string, string> = new Map<
    string,
    string
  >();
  private didServiceLac1: DidServiceLac1;
  constructor() {
    this.secureRelayService = new SecureRelayService();
    this.didServiceLac1 = new DidServiceLac1();
  }
  async send(formData: any, _evidence: Express.Multer.File): Promise<any> {
    const { issuerDid, receiverDid } = await this._validateAndExtractData(
      formData
    );
    // console.log('qr code: ', evidence.buffer.toString('base64'));
    // TODO: send credentials
    const ddccCredential = await this.assembleDDCCCredential();
    const ddccVerifiableCredential = (await this.addProof(
      ddccCredential
    )) as IDDCCVerifiableCredential;
    // TODO: send ddcc credential through secure relay server
    const message = JSON.stringify(ddccVerifiableCredential); // TODO: stringify VC
    const authAddress = await this.getAuthAddressFromDid(issuerDid);
    const keyExchangePublicKey =
      await this.getOrSetOrCreateKeyExchangePublicKeyFromDid(issuerDid);
    await this.secureRelayService.sendData(
      issuerDid,
      authAddress,
      keyExchangePublicKey,
      receiverDid,
      message
    );
    return {
      status: 'Ok',
      ddccVerifiableCredential
    };
  }
  async getOrSetOrCreateKeyExchangePublicKeyFromDid(
    did: string
  ): Promise<string> {
    const keyExchangePublicKey = this.keyExchangePublicKeys.get(did);
    if (keyExchangePublicKey) {
      return keyExchangePublicKey;
    }
    const keyExchangeAlgorithmSearchKeyword = 'X25519KeyAgreementKey2019';
    const didDoc = await this.secureRelayService.resolver.resolve(did);
    const foundkeyExchangePublicKey = DidDocumentService.findKeyAgreement(
      didDoc,
      keyExchangeAlgorithmSearchKeyword
    );
    if (foundkeyExchangePublicKey) {
      const hexPubKey = Buffer.from(foundkeyExchangePublicKey).toString('hex');
      this.keyExchangePublicKeys.set(did, hexPubKey);
      return hexPubKey;
    }
    const validDays = 365;
    this.log.info(
      // eslint-disable-next-line max-len
      `Couldn't find key exchange key with type ${keyExchangeAlgorithmSearchKeyword} for did ${did} ... creating one for ${validDays} days`
    );
    const attribute: INewAttribute = {
      did,
      validDays,
      relation: 'keya'
    };

    const hexPubKey = (
      await this.didServiceLac1.addNewEd25519Attribute(attribute)
    ).publicKey;
    const buffPubKey = Buffer.from(hexPubKey.replace('0x', ''), 'hex');
    this.authPublicKeys.set(did, buffPubKey);
    this.keyExchangePublicKeys.set(did, hexPubKey);
    return Buffer.from(buffPubKey).toString('hex');
  }

  async getAuthAddressFromDid(issuerDid: string): Promise<string> {
    const buffAuthPublicKey = Buffer.from(
      await this.getOrSetAuthPublicKey(issuerDid)
    );
    return ethers.computeAddress('0x' + buffAuthPublicKey.toString('hex'));
  }

  async getOrSetAuthPublicKey(did: string): Promise<Uint8Array> {
    let authPubKey = this.authPublicKeys.get(did);
    if (authPubKey) {
      return authPubKey;
    }
    // retrieve auth key from didDocument
    // TODO:esecp256k1vk As Wallet
    const authAlgorithmKeywork = 'EcdsaSecp256k1RecoveryMethod2020';
    const didDoc = await this.secureRelayService.resolver.resolve(did);
    authPubKey = DidDocumentService.findAuthenticationKey(
      didDoc,
      authAlgorithmKeywork
    );
    if (authPubKey) {
      this.authPublicKeys.set(did, authPubKey);
      return authPubKey;
    }
    const validDays = 365;
    this.log.info(
      // eslint-disable-next-line max-len
      `Couldn't find auth key with type ${authAlgorithmKeywork} for did ${did} ... creating one for ${validDays} days`
    );
    const attribute: INewAttribute = {
      did,
      validDays,
      relation: 'auth'
    };

    const hexPubKey = (
      await this.didServiceLac1.addNewSecp256k1Attribute(attribute)
    ).publicKey;
    const buffPubKey = Buffer.from(hexPubKey.replace('0x', ''), 'hex');
    this.authPublicKeys.set(did, buffPubKey);
    return buffPubKey;
  }

  async _validateAndExtractData(formData: any): Promise<{
    issuerDid: string;
    receiverDid: string;
  }> {
    // TODO: validate form data to contain: "issuer did", "expirationDate", "data to show"
    const d = JSON.parse(formData.data) as {
      issuerDid: string;
      receiverDid: string;
    };
    try {
      await this.didServiceLac1.decodeDid(d.issuerDid);
      await this.didServiceLac1.decodeDid(d.receiverDid);
    } catch (e) {
      throw new BadRequestError(ErrorsMessages.INVALID_DID);
    }
    return d;
  }
  async new(): Promise<IDDCCCredential> {
    return {
      context: [
        'https://www.w3.org/2018/credentials/v1',
        // eslint-disable-next-line max-len
        'https://credentials-library.lacchain.net/credentials/health/vaccination/v1', // TODO: define
        'https://credentials-library.lacchain.net/credentials/health/DDCCQRCCode/v1'
      ],
      id: randomUUID().toString(),
      type: ['VerifiableCredential', 'VaccinationCertificate', 'DDCCQRCCode'],
      issuer: '',
      issuanceDate: new Date().toJSON(),
      expirationDate: '',
      credentialSubject: {
        id: '',
        name: '',
        birthDate: '',
        sex: '',
        identifier: '',
        vaccine: {
          vaccine: '',
          brand: '',
          manufacturer: '',
          authorization: '',
          batch: '',
          dose: 0,
          vaccinationDate: '',
          country: '',
          administeringCentre: '',
          worker: '',
          disease: '',
          birthDate: ''
        }
      },
      evidence: []
    };
  }

  /**
   *
   * Returns Credential without proof of validity
   * TODO: add params to create Credential
   */
  async assembleDDCCCredential(): Promise<IDDCCCredential> {
    const ddccCredential = await this.new();
    return ddccCredential;
  }

  /**
   * Adds proof to a Credential of type DDCC
   * @param {IDDCCCredential} credential: Credential without proof
   * @return {Promise<IDDCCVerifiableCredential>} A DDCC Verifiable credential
   */
  async addProof(credential: ICredential): Promise<IVerifiableCredential> {
    const proof = await this.getIType1ProofAssertionMethodTemplate();
    // TODO: add custom fields to proof
    return { ...credential, proof };
  }

  async getIType1ProofAssertionMethodTemplate(): Promise<IType1Proof> {
    const type1Proof: IType1Proof = {
      id: '',
      type: '',
      proofPurpose: 'assertionMethod',
      verificationMethod: '',
      domain: '',
      proofValue: ''
    };
    return type1Proof;
  }
}
