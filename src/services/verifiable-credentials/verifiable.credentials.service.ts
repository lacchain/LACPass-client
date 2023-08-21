import { DidServiceLac1 } from '@services/external/did-lac/did-service';
import { SecureRelayService } from '@services/secure-relay-service/secure.relay.service';
import { randomUUID } from 'crypto';
import { INewAttribute } from 'lacpass-chain-of-trust';
import { INewJwkAttribute, EcJwk } from 'lacpass-identity';
import {
  DDCCQrEvidence,
  ICredential,
  IDDCCCredential,
  IDDCCVerifiableCredential,
  IType1Proof,
  IVerifiableCredential
} from 'src/interfaces/verifiable-credential/ddcc.credential';
import crypto from 'crypto';
import { Service } from 'typedi';
import { ethers } from 'ethers';
import { log4TSProvider } from '../../config';
import { DidDocumentService } from '@services/did/did.document.service';
import { BadRequestError } from 'routing-controllers';
import { ErrorsMessages } from '../../constants/errorMessages';
import {
  Country,
  DDCCFormatValidator,
  DDCCVerifiableCredentialData,
  Vaccine
} from './ddcc.format';
import { validateOrReject } from 'class-validator';
import canonicalize from 'canonicalize';
import { KeyManagerService } from '@services/external/key-manager/key-manager.service';
import { ISignPlainMessageByAddress } from 'lacpass-key-manager';

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
  private assertionPublicKeys: Map<string, string> = new Map<string, string>();
  private didServiceLac1: DidServiceLac1;
  private keyManager: KeyManagerService;
  constructor() {
    this.secureRelayService = new SecureRelayService();
    this.didServiceLac1 = new DidServiceLac1();
    this.keyManager = new KeyManagerService();
  }
  async send(formData: any, _evidence: Express.Multer.File): Promise<any> {
    const ddccVerifiableCredentialData = await this._validateAndExtractData(
      formData
    );
    const base64QrCode = _evidence.buffer.toString('base64');
    // TODO: send credentials
    const ddccCredential = await this.assembleDDCCCredential(
      ddccVerifiableCredentialData,
      base64QrCode
    );
    const { issuerDid, receiverDid } = ddccVerifiableCredentialData;
    const ddccVerifiableCredential = (await this.addProof(
      ddccCredential,
      issuerDid
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

  async getOrSetOrCreateAssertionPublicKeyFromDid(
    did: string,
    type: 'secp256k1'
  ): Promise<string> {
    const assertionPublicKey = this.assertionPublicKeys.get(did);
    if (assertionPublicKey) {
      return assertionPublicKey;
    }
    const assertionRelationshipSearchKeyword = 'JsonWebKey2020';
    const didDoc = await this.secureRelayService.resolver.resolve(did);
    const foundAssertionPublicKey =
      DidDocumentService.findPublicKeyFromJwkAssertionKey(
        didDoc,
        assertionRelationshipSearchKeyword,
        type
      );
    // because method is jsonWeKey2020, the expected format is to be 'json'
    if (foundAssertionPublicKey) {
      const hexPubKey = Buffer.from(foundAssertionPublicKey).toString('hex');
      this.assertionPublicKeys.set(did, hexPubKey);
      return hexPubKey;
    }
    const validDays = 365;
    this.log.info(
      // eslint-disable-next-line max-len
      `Couldn't find assertion key with type ${assertionRelationshipSearchKeyword} for did ${did} ... creating one for ${validDays} days`
    );
    const attribute: INewJwkAttribute = {
      did,
      validDays,
      relation: 'asse',
      jwkType: type
    };

    const jwkCreationResponse = await this.didServiceLac1.addNewJwkAttribute(
      attribute
    );
    const base64UrlPubKey = (jwkCreationResponse.jwk as EcJwk).x;
    const hexPubKey = Buffer.from(base64UrlPubKey, 'base64url').toString('hex');
    this.assertionPublicKeys.set(did, hexPubKey);
    return hexPubKey;
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

  async _validateDDCCCoreRequiredData(ddccData: DDCCFormatValidator) {
    const vaccinationData = ddccData.vaccination;
    if (!vaccinationData) {
      throw new BadRequestError(ErrorsMessages.VACCINATION_MISSING_ATTRIBUTE);
    }

    const country = vaccinationData.country;
    if (!country) {
      throw new BadRequestError(ErrorsMessages.COUNTRY_MISSING_ATTRIBUTE);
    }
    await this._validateDDCCCoreRequiredDataCountry(country);
    const vaccine = vaccinationData.vaccine;
    if (!vaccine) {
      throw new BadRequestError(ErrorsMessages.VACCINE_MISSING_ATTRIBUTE);
    }
    await this._validateDDCCCoreRequiredDataVaccine(vaccine);
    const ddcc = new DDCCFormatValidator();
    ddcc.birthDate = ddccData.birthDate;
    ddcc.identifier = ddccData.identifier;
    ddcc.name = ddccData.name;
    ddcc.sex = ddccData.sex;
    ddcc.vaccination = ddccData.vaccination;
    try {
      await validateOrReject(ddcc);
    } catch (err: any) {
      throw new BadRequestError(err);
    }
  }

  async _validateDDCCCoreRequiredDataCountry(country: Country) {
    const c = new Country();
    c.code = country.code;
    try {
      await validateOrReject(c);
    } catch (err: any) {
      throw new BadRequestError(err);
    }
  }

  async _validateDDCCCoreRequiredDataVaccine(vaccine: Vaccine) {
    const v = new Vaccine();
    v.code = vaccine.code;
    try {
      await validateOrReject(v);
    } catch (err: any) {
      throw new BadRequestError(err);
    }
  }

  async _validateAndExtractData(
    formData: any
  ): Promise<DDCCVerifiableCredentialData> {
    const ddccInputData = JSON.parse(
      formData.data
    ) as DDCCVerifiableCredentialData;
    // validate dids
    try {
      await this.didServiceLac1.decodeDid(ddccInputData.issuerDid);
      await this.didServiceLac1.decodeDid(ddccInputData.receiverDid);
    } catch (e) {
      throw new BadRequestError(ErrorsMessages.INVALID_DID);
    }
    // validate ddcc incoming data
    if (!ddccInputData.ddccData) {
      throw new BadRequestError(ErrorsMessages.DDCC_DATA_ERROR);
    }
    await this._validateDDCCCoreRequiredData(ddccInputData.ddccData);
    return ddccInputData;
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
          vaccineCode: '',
          brand: '',
          dose: 0,
          country: '',
          date: '',
          centre: '',
          lot: ''
        }
      },
      evidence: []
    };
  }

  /**
   * @description - Assemble a Verifiable Credential starting from data
   comming from DDCCCoreData
   * @param {DDCCVerifiableCredentialData} data - data
   * @param {string} qrEvidence - qr health data in base64 format
   * @return {IDDCCCredential}
   */
  async assembleDDCCCredential(
    data: DDCCVerifiableCredentialData,
    qrEvidence: string
  ): Promise<IDDCCCredential> {
    const ddccCredential = await this.new();
    ddccCredential.id = randomUUID();
    const ddccData = data.ddccData;
    const vaccination = data.ddccData.vaccination;
    ddccCredential.issuer = data.issuerDid;
    ddccCredential.credentialSubject = {
      id: data.receiverDid,
      name: ddccData.name,
      birthDate: ddccData.birthDate,
      identifier: ddccData.identifier,
      sex: ddccData.sex,
      vaccine: {
        vaccineCode: vaccination.vaccine.code,
        date: vaccination.date,
        dose: vaccination.dose,
        country: vaccination.country.code,
        centre: vaccination.centre,
        lot: vaccination.lot,
        brand: vaccination.brand.code
      }
    };
    ddccCredential.evidence.push({
      qrb64: qrEvidence
    } as DDCCQrEvidence);
    return ddccCredential;
  }

  /**
   * Adds proof to a Credential of type DDCC
   * @param {IDDCCCredential} credential - Credential without proof
   * @param {string} issuerDid - Issuing entity
   * @return {Promise<IDDCCVerifiableCredential>} A DDCC Verifiable credential
   */
  async addProof(
    credential: ICredential,
    issuerDid: string
  ): Promise<IVerifiableCredential> {
    const proof = await this.getIType1ProofAssertionMethodTemplate(
      credential,
      issuerDid
    );
    // TODO: add custom fields to proof
    return { ...credential, proof };
  }

  async getIType1ProofAssertionMethodTemplate(
    credentialData: ICredential,
    issuerDid: string
  ): Promise<IType1Proof> {
    const credentialDataString = canonicalize(credentialData);
    if (!credentialDataString) {
      throw new BadRequestError(ErrorsMessages.CANONICALIZE_ERROR);
    }
    const credentialHash =
      '0x' +
      crypto.createHash('sha256').update(credentialDataString).digest('hex');
    let assertionKey = await this.getOrSetOrCreateAssertionPublicKeyFromDid(
      issuerDid,
      'secp256k1'
    );
    assertionKey = assertionKey.startsWith('0x')
      ? assertionKey
      : '0x' + assertionKey;
    const messageRequest: ISignPlainMessageByAddress = {
      address: ethers.computeAddress(assertionKey),
      messageHash: credentialHash
    };
    const proofValueResponse = await this.keyManager.secpSignPlainMessage(
      messageRequest
    );
    // TODO: add onchain proof
    // TODO: add domain according to encoding algorithm for this
    const type1Proof: IType1Proof = {
      id: issuerDid,
      type: 'EcdsaSecp256k1Signature2019',
      proofPurpose: 'assertionMethod',
      verificationMethod: '',
      domain: '',
      proofValue: proofValueResponse.signature
    };
    return type1Proof;
  }
}
