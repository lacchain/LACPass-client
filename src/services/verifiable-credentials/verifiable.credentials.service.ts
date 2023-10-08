import { DidServiceLac1 } from '@services/external/did-lac/did-service';
import { SecureRelayService } from '@services/secure-relay-service/secure.relay.service';
import { randomUUID } from 'crypto';
import {
  INewAttribute,
  resolveChainOfTrustAddress,
  resolvePublicDirectoryAddress
} from 'lacchain-trust';
import { INewJwkAttribute, EcJwk } from 'lacchain-identity';
import {
  ICredentialV2,
  IDDCCCredential,
  IDDCCVerifiableCredential,
  IType1Proof,
  IType2Proof,
  IType2ProofConfig,
  IVerifiableCredential
} from 'src/interfaces/verifiable-credential/ddcc.credential';
import crypto from 'crypto';
import { Service } from 'typedi';
import {
  CHAIN_ID,
  PROOF_OF_EXISTENCE_MODE,
  log4TSProvider,
  resolveVerificationRegistryContractAddress
} from '../../config';
import { DidDocumentService } from '@services/did/did.document.service';
import { BadRequestError, InternalServerError } from 'routing-controllers';
import { ErrorsMessages } from '../../constants/errorMessages';
import {
  CodeSystem,
  DDCCFormatValidator,
  DDCCCoreDataSet,
  Identifier
} from './ddcc.format';
import { validateOrReject } from 'class-validator';
import canonicalize from 'canonicalize';
import { KeyManagerService } from '@services/external/key-manager/key-manager.service';
import {
  ISignPlainMessageByAddress,
  ISignPlainMessageByCompressedPublicKey
} from 'lacchain-key-manager';
import { MEDICINAL_PRODUCT_NAMES } from '@constants/ddcc.medicinal.code.mapper';
import {
  IAttachment,
  IContent,
  IDDCCToVC,
  IDocumentReference
} from './iddcc.to.vc';
import { Attachment, Content, DocumentReference } from '@dto/DDCCToVC';
import { DISEASE_LIST } from '@constants/disease.code.mapper';
import { computeAddress, keccak256 } from 'ethers/lib/utils';
import { VerificationRegistry } from './verification.registry';
import { IEthereumTransactionResponse } from 'src/interfaces/ethereum/transaction';
import { ProofOfExistenceMode } from '@constants/poe';

type keyType = 'secp256k1' | 'P-256';
type assertionPublicKeyType = { hexPubKey: string; keyId: string };
@Service()
export class VerifiableCredentialService {
  private readonly base58 = require('base-x')(
    '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  );
  static type = '0001';
  static version = '0001';
  private readonly domain: string;
  log = log4TSProvider.getLogger('VerifiableCreddentialsService');
  private secureRelayService: SecureRelayService;
  private readonly didDocumentService: DidDocumentService;
  private authPublicKeys: Map<string, Uint8Array> = new Map<
    string,
    Uint8Array
  >();
  private keyExchangePublicKeys: Map<string, string> = new Map<
    string,
    string
  >();
  private assertionPublicKeys: Map<string, assertionPublicKeyType> = new Map<
    string,
    assertionPublicKeyType
  >();
  private didServiceLac1: DidServiceLac1;
  private keyManager: KeyManagerService;
  private verificationRegistryService: VerificationRegistry;
  private proofOfExistenceMode = PROOF_OF_EXISTENCE_MODE;
  constructor() {
    this.secureRelayService = new SecureRelayService();
    this.didServiceLac1 = new DidServiceLac1();
    this.keyManager = new KeyManagerService();
    this.domain = this.encode();
    this.didDocumentService = new DidDocumentService();
    this.verificationRegistryService = new VerificationRegistry();
  }
  async transformAndSend(ddccToVc: IDDCCToVC): Promise<any> {
    const foundDocumentReference = ddccToVc.bundle.entry.find(
      el => el.resource.resourceType === 'DocumentReference'
    );
    if (!foundDocumentReference) {
      throw new BadRequestError(ErrorsMessages.DOCUMENT_REFERENCE_NOT_FOUND);
    }
    const documentReference =
      foundDocumentReference.resource as IDocumentReference;
    const imageContent = documentReference.content.find(
      el => el.attachment?.contentType === 'image/png'
    );
    if (!imageContent) {
      throw new BadRequestError(ErrorsMessages.IMAGE_NOT_FOUND);
    }
    await this._validateContentItem(imageContent);
    // TODO: validate is a valid image
    const ddccCoreDataSet = documentReference.content.find(
      el => el.attachment?.contentType === 'application/json'
    );
    if (!ddccCoreDataSet) {
      throw new BadRequestError(ErrorsMessages.DDCCCOREDATASET_NOT_FOUND);
    }
    await this._validateContentItem(ddccCoreDataSet);
    await this._validateDocumentReference(documentReference);

    let parsedDdccCoreDataSet: DDCCFormatValidator;
    try {
      const stringDdccCoreDataSet = Buffer.from(
        ddccCoreDataSet.attachment.data,
        'base64'
      ).toString();
      parsedDdccCoreDataSet = JSON.parse(stringDdccCoreDataSet);
    } catch (err) {
      throw new BadRequestError(ErrorsMessages.DDCCCOREDATASET_PARSE_ERROR);
    }
    const ddccCoreDataSetObject = await this._validateAndExtractData({
      issuerDid: ddccToVc.issuerDid,
      receiverDid: ddccToVc.receiverDid,
      ddccData: parsedDdccCoreDataSet
    } as DDCCCoreDataSet);
    const qrDescription = documentReference.description;
    return this.send(ddccCoreDataSetObject, imageContent, qrDescription);
  }
  async _validateContentItem(item: IContent) {
    const itemToValidate = new Content();
    await this._validateAttachment(item.attachment);
    itemToValidate.attachment = item.attachment;
    // eslint-disable-next-line max-len
    itemToValidate.format = item.format; // skipping format validation, since it is not used
    try {
      await validateOrReject(itemToValidate);
    } catch (err) {
      const errorMessage =
        ErrorsMessages.INVALID_CONTENT_ATTRIBUTE + ': ' + err;
      throw new BadRequestError(errorMessage);
    }
  }
  async _validateAttachment(attachment: IAttachment) {
    const attachmentToValidate = new Attachment();
    attachmentToValidate.contentType = attachment.contentType;
    attachmentToValidate.data = attachment.data;
    try {
      await validateOrReject(attachmentToValidate);
    } catch (err) {
      const errorMessage =
        ErrorsMessages.INVALID_ATTACHMENT_ATTRIBUTE + ': ' + err;
      this.log.info(errorMessage);
      throw new BadRequestError(errorMessage);
    }
  }
  async _validateDocumentReference(documentReference: IDocumentReference) {
    const { content, description, resourceType } = documentReference;
    const drToValidate = new DocumentReference();
    drToValidate.content = content;
    drToValidate.description = description;
    drToValidate.resourceType = resourceType;
    try {
      await validateOrReject(drToValidate);
    } catch (err) {
      const errorMessage =
        ErrorsMessages.INVALID_DOCUMENT_REFERENCE + ': ' + err;
      this.log.info(errorMessage);
      throw new BadRequestError(
        // eslint-disable-next-line max-len
        errorMessage // ErrorsMessages.DOCUMENT_REFERENCE_CONTENT_NOT_FOUND
      );
    }
  }
  async send(
    ddccCoreDataSet: DDCCCoreDataSet,
    imageContent: IContent,
    qrDescription: string
  ): Promise<{ deliveryId: string; txHash: string | null }> {
    const ddccCredential = await this.assembleDDCCCredential(
      ddccCoreDataSet,
      imageContent.attachment,
      qrDescription
    );
    const { issuerDid, receiverDid } = ddccCoreDataSet;
    const ddccVerifiableCredential = (await this.addProof(
      ddccCredential,
      issuerDid
    )) as IDDCCVerifiableCredential;
    const message = JSON.stringify(ddccVerifiableCredential);
    const authAddress = await this.getAuthAddressFromDid(issuerDid);
    const keyExchangePublicKey =
      await this.getOrSetOrCreateKeyExchangePublicKeyFromDid(issuerDid);
    // proof of existence
    let issueTxResponse: IEthereumTransactionResponse | null = null;
    // TODO: add environment varible to configure PoE behavior
    if (this.proofOfExistenceMode !== ProofOfExistenceMode.DISABLED) {
      try {
        issueTxResponse = await this.addProofOfExistence(
          issuerDid,
          ddccCredential
        );
      } catch (e) {
        this.log.info('Error adding proof of existence', e);
        if (this.proofOfExistenceMode === ProofOfExistenceMode.STRICT) {
          throw new InternalServerError(
            ErrorsMessages.PROOF_OF_EXISTENCE_FAILED
          );
        }
      }
    }

    const sentData = await this.secureRelayService.sendData(
      issuerDid,
      authAddress,
      keyExchangePublicKey,
      receiverDid,
      message
    );
    return {
      deliveryId: sentData.deliveryId,
      txHash: issueTxResponse ? issueTxResponse.txHash : null
    };
  }
  /**
   * Leaves a proof of existence. Resolves the controller of the issuer did and signs
   * the proof of existence with its associated private key
   * @param {string} issuerDid
   * @param {ICredentialV2} credentialData
   */
  async addProofOfExistence(
    issuerDid: string,
    credentialData: ICredentialV2
  ): Promise<IEthereumTransactionResponse> {
    const credentialHash = this.computeRfc8785AndSha256(credentialData);
    let expiration = 0;
    if (credentialData && credentialData.validUntil) {
      const d = new Date(credentialData.validUntil).getTime();
      if (d < new Date().getTime()) {
        this.log.info(
          // eslint-disable-next-line max-len
          'Credential is expired, setting onchain expiration date to zero => never expires'
        );
      } else {
        expiration = Math.floor(
          new Date(credentialData.validUntil).getTime() / 1000
        );
      }
    }
    return this.verificationRegistryService.verifyAndIssueSigned(
      issuerDid,
      credentialHash,
      expiration
    );
  }
  async getOrSetOrCreateKeyExchangePublicKeyFromDid(
    did: string
  ): Promise<string> {
    const keyExchangePublicKey = this.keyExchangePublicKeys.get(did);
    if (keyExchangePublicKey) {
      return keyExchangePublicKey;
    }
    const keyExchangeAlgorithmSearchKeyword = 'X25519KeyAgreementKey2019';
    const didDoc = await this.didDocumentService.resolver.resolve(did);
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
      `Couldn't find "key exchange" key with type ${keyExchangeAlgorithmSearchKeyword} for did ${did} ... creating one for ${validDays} days`
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
    this.keyExchangePublicKeys.set(did, hexPubKey);
    return Buffer.from(buffPubKey).toString('hex');
  }

  /**
   * Gets Jwk assertion keys from DIDDocument and returns the one that matches
   * with the provided params
   * @param {string} did - Decentralized identifier
   * @param  {keyType} type - Type of Key: e.g. 'secp256k1', 'P-256', etc
   * @return {Promise<assertionPublicKeyType>} - returned value
   */
  async getOrSetOrCreateAssertionPublicKeyFromDid(
    did: string,
    type: keyType
  ): Promise<assertionPublicKeyType> {
    const assertionPublicKey = this.assertionPublicKeys.get(did);
    if (assertionPublicKey) {
      return assertionPublicKey;
    }
    const assertionRelationshipSearchKeyword = 'JsonWebKey2020';
    let didDoc = await this.didDocumentService.resolver.resolve(did);
    const foundAssertionPublicKeys =
      DidDocumentService.filterSecp256k1PublicKeysFromJwkAssertionKeys(
        didDoc,
        assertionRelationshipSearchKeyword,
        type
      );
    let pk;
    if (foundAssertionPublicKeys) {
      if (type === 'secp256k1') {
        pk = await this.trySetForSecp256k1(foundAssertionPublicKeys);
      } else if (type === 'P-256') {
        pk = await this.trySetForP256(foundAssertionPublicKeys);
      }
    }

    if (pk) {
      this.assertionPublicKeys.set(did, pk);
      return pk;
    }

    const validDays = 365 * 4;
    this.log.info(
      // eslint-disable-next-line max-len
      `Couldn't find "assertion" key with type ${assertionRelationshipSearchKeyword} and key type ${type} for did ${did} ... creating one for ${validDays} days`
    );
    const attribute: INewJwkAttribute = {
      did,
      validDays,
      relation: 'asse',
      jwkType: type == 'P-256' ? 'secp256r1' : type
    };

    const response = await this.didServiceLac1.addNewJwkAttribute(attribute);
    const newAssertionKey = response.jwk as EcJwk;
    const newAssertionKeyHex =
      '0x' + Buffer.from(newAssertionKey.x, 'base64url').toString('hex');
    didDoc = await this.didDocumentService.resolver.resolve(did);
    // this method is partial since it is working with secp256k1 keys
    const foundAssertionPublicKey =
      DidDocumentService.filterSecp256k1PublicKeysFromJwkAssertionKeys(
        didDoc,
        assertionRelationshipSearchKeyword,
        type
      )?.find(el => {
        const hexPubKey = '0x' + el.publicKeyBuffer.toString('hex');
        // eslint-disable-next-line max-len
        return computeAddress(hexPubKey) === computeAddress(newAssertionKeyHex); // kust using as as way to compare them
      });
    if (foundAssertionPublicKey) {
      const hexPubKey = Buffer.from(
        foundAssertionPublicKey.publicKeyBuffer
      ).toString('hex');
      const pk = {
        hexPubKey,
        keyId: foundAssertionPublicKey.id
      };
      this.assertionPublicKeys.set(did, pk);
      return pk;
    }
    throw new BadRequestError(ErrorsMessages.VM_NOT_FOUND);
  }

  async trySetForSecp256k1(
    assertionPublicKeys: {
      id: string;
      publicKeyBuffer: Buffer;
    }[]
  ): Promise<assertionPublicKeyType | false> {
    for (const assertionPublicKey of assertionPublicKeys) {
      const r = await this.verifyKeyForSecp256k1(assertionPublicKey);
      if (!r) {
        continue;
      }
      return r;
    }
    return false;
  }

  async verifyKeyForSecp256k1(assertionPublicKey: {
    id: string;
    publicKeyBuffer: Buffer;
  }): Promise<assertionPublicKeyType | false> {
    // TODO: generalize find algorithm to fit with any kind of key.
    // and apply to all methods
    const hexPubKey = '0x' + assertionPublicKey.publicKeyBuffer.toString('hex');
    const messageRequest: ISignPlainMessageByAddress = {
      address: computeAddress(hexPubKey),
      message: '0x' + crypto.createHash('sha256').update('Proof').digest('hex')
    };
    try {
      await this.keyManager.secp256k1SignPlainMessage(messageRequest);
    } catch (e: any) {
      // TODO:check in "DEPENDENT SERVICE" way
      if (e && e.message === 'Key not found') {
        console.log('error was', e.message);
        this.log.info(
          'secp256 private key related to',
          hexPubKey,
          ' assertion key was not found. Ignoring this key ...'
        );
        return false;
      }
      this.log.info(
        'Unexpected error encountered from key manager, error was',
        e
      );
      throw new BadRequestError(ErrorsMessages.INTERNAL_SERVER_ERROR);
    }
    this.log.info('Selecting secp256k1 Assertion Public Key', hexPubKey);
    const pk = {
      hexPubKey,
      keyId: assertionPublicKey.id
    };
    // this.assertionPublicKeys.set(did, pk);
    return pk;
  }

  async trySetForP256(
    assertionPublicKeys: {
      id: string;
      publicKeyBuffer: Buffer;
    }[]
  ): Promise<assertionPublicKeyType | false> {
    for (const assertionPublicKey of assertionPublicKeys) {
      const r = await this.verifyKeyForP256(assertionPublicKey);
      if (!r) {
        continue;
      }
      return r;
    }
    return false;
  }

  async verifyKeyForP256(assertionPublicKey: {
    id: string;
    publicKeyBuffer: Buffer;
  }): Promise<assertionPublicKeyType | false> {
    // TODO: generalize find algorithm to fit with any kind of key.
    // and apply to all methods
    const hexPubKey = '0x' + assertionPublicKey.publicKeyBuffer.toString('hex');
    const messageRequest: ISignPlainMessageByCompressedPublicKey = {
      compressedPublicKey:
        // eslint-disable-next-line max-len
        '0x02' + assertionPublicKey.publicKeyBuffer.toString('hex'), // TODO: set all pub keys with 0x02/0x04 prefixes
      message: '0x' + crypto.createHash('sha256').update('Proof').digest('hex')
    };
    try {
      await this.keyManager.p256SignPlainMessage(messageRequest);
    } catch (e: any) {
      // TODO:check in "DEPENDENT SERVICE" way
      if (e && e.message === 'Key not found') {
        console.log('error was', e.message);
        this.log.info(
          'secp256 private key related to',
          hexPubKey,
          ' assertion key was not found. Ignoring this key ...'
        );
        return false;
      }
      this.log.info(
        'Unexpected error encountered from key manager, error was',
        e
      );
      throw new BadRequestError(ErrorsMessages.INTERNAL_SERVER_ERROR);
    }
    this.log.info('Selecting P-256 Assertion Public Key', hexPubKey);
    const pk = {
      hexPubKey,
      keyId: assertionPublicKey.id
    };
    // this.assertionPublicKeys.set(did, pk);
    return pk;
  }

  async getAuthAddressFromDid(issuerDid: string): Promise<string> {
    const buffAuthPublicKey = Buffer.from(
      await this.getOrSetAuthPublicKey(issuerDid)
    );
    return computeAddress('0x' + buffAuthPublicKey.toString('hex'));
  }

  async getOrSetAuthPublicKey(did: string): Promise<Uint8Array> {
    let authPubKey = this.authPublicKeys.get(did);
    if (authPubKey) {
      return authPubKey;
    }
    // retrieve auth key from didDocument
    // TODO:esecp256k1vk As Wallet
    const authAlgorithmKeywork = 'EcdsaSecp256k1RecoveryMethod2020';
    const didDoc = await this.didDocumentService.resolver.resolve(did);
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
      `Couldn't find "authentication" key with type ${authAlgorithmKeywork} for did ${did} ... creating one for ${validDays} days`
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
    await this._validateDDCCCoreCodeSystemAttribute(country);
    const vaccine = vaccinationData.vaccine;
    if (!vaccine) {
      throw new BadRequestError(ErrorsMessages.VACCINE_MISSING_ATTRIBUTE);
    }
    await this._validateDDCCCoreCodeSystemAttribute(vaccine);
    const brand = vaccinationData.brand;
    if (!brand) {
      throw new BadRequestError(ErrorsMessages.BRAND_MISSING_ATTRIBUTE);
    }
    if (vaccinationData.maholder) {
      await this._validateDDCCCoreCodeSystemAttribute(vaccinationData.maholder);
    }
    if (vaccinationData.disease) {
      await this._validateDDCCCoreCodeSystemAttribute(vaccinationData.disease);
    }
    if (vaccinationData.practitioner) {
      await this._validateDDCCCoreIdentifierAttribute(
        vaccinationData.practitioner
      );
    }
    const ddcc = new DDCCFormatValidator();
    if (ddcc.birthDate) {
      ddcc.birthDate = ddccData.birthDate;
    }
    if (ddcc.identifier) {
      ddcc.identifier = ddccData.identifier;
    }
    ddcc.name = ddccData.name;
    if (ddcc.sex) {
      ddcc.sex = ddccData.sex;
    }
    ddcc.vaccination = ddccData.vaccination;
    try {
      await validateOrReject(ddcc);
    } catch (err: any) {
      throw new BadRequestError(err);
    }
  }

  async _validateDDCCCoreCodeSystemAttribute(attribute: CodeSystem) {
    const c = new CodeSystem();
    c.code = attribute.code;
    try {
      await validateOrReject(c);
    } catch (err: any) {
      throw new BadRequestError(err);
    }
  }

  async _validateDDCCCoreIdentifierAttribute(attribute: Identifier) {
    const c = new Identifier();
    c.value = attribute.value;
    try {
      await validateOrReject(c);
    } catch (err: any) {
      throw new BadRequestError(err);
    }
  }

  async _validateAndExtractData(
    inputData: DDCCCoreDataSet
  ): Promise<DDCCCoreDataSet> {
    try {
      await this.didServiceLac1.decodeDid(inputData.issuerDid);
      await this.didServiceLac1.decodeDid(inputData.receiverDid);
    } catch (e) {
      throw new BadRequestError(ErrorsMessages.INVALID_DID);
    }
    if (!inputData.ddccData) {
      throw new BadRequestError(ErrorsMessages.DDCC_DATA_ERROR);
    }
    await this._validateDDCCCoreRequiredData(inputData.ddccData);
    return inputData;
  }
  async new(): Promise<IDDCCCredential> {
    return {
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
        // eslint-disable-next-line max-len
        'https://credentials-library.lacchain.net/credentials/health/vaccination/v3'
      ],
      // eslint-disable-next-line quote-props
      id: randomUUID().toString(),
      // eslint-disable-next-line quote-props
      type: ['VerifiableCredential', 'VaccinationCertificate'],
      // eslint-disable-next-line quote-props
      issuer: '',
      // eslint-disable-next-line quote-props
      name: '',
      // eslint-disable-next-line quote-props
      identifier: '',
      // eslint-disable-next-line quote-props
      validFrom: this.getUtcDate(),
      // eslint-disable-next-line quote-props
      credentialSubject: {
        type: 'VaccinationEvent',
        batchNumber: '',
        countryOfVaccination: '',
        dateOfVaccination: '',
        order: '',
        recipient: {
          type: 'VaccineRecipient',
          id: '',
          name: '',
          birthDate: '',
          gender: ''
        },
        vaccine: {
          type: 'Vaccine',
          atcCode: '',
          medicinalProductName: ''
        },
        image: {
          type: 'ImageObject',
          name: 'QRCode',
          alternateName: 'QRCode',
          description:
            // eslint-disable-next-line max-len
            'QR code containing the DDCCCoreDatSet plus signature',
          encodingFormat: '',
          contentUrl: ''
        }
      }
    };
  }

  /**
   * @description - Assemble a Verifiable Credential starting from data
   coming from DDCCCoreDataSet
   * @param {DDCCCoreDataSet} data - data
   // eslint-disable-next-line max-len
   * @param {IAttachment} attachment - qr data and its related additional metadata
   * @param {string} qrDescription - Description to display
   * @return {IDDCCCredential}
   */
  async assembleDDCCCredential(
    data: DDCCCoreDataSet,
    attachment: IAttachment,
    qrDescription: string
  ): Promise<IDDCCCredential> {
    const ddccCredential = await this.new();
    const ddccData = data.ddccData;
    // Vaccination certificate
    const vaccination = data.ddccData.vaccination;
    ddccCredential.issuer = data.issuerDid;
    const certificate = ddccData.certificate;
    if (
      certificate &&
      certificate.issuer &&
      certificate.issuer.identifier &&
      certificate.issuer.identifier.value
    ) {
      ddccCredential.name = ddccData.certificate.issuer.identifier.value;
    }

    if (certificate && certificate.period && certificate.period.start) {
      try {
        ddccCredential.validFrom = this.getDate(
          new Date(certificate.period.start)
        );
      } catch (e) {
        this.log.info(
          'invalid certificate start date, defaulting to current date'
        );
      }
    }

    if (certificate && certificate.period && certificate.period.end) {
      try {
        ddccCredential.validUntil = this.getDate(
          new Date(certificate.period.end)
        );
      } catch (e) {
        this.log.info('invalid certificate end date, leaving it blank');
      }
    }

    if (ddccData.certificate.hcid.value) {
      ddccCredential.identifier = ddccData.certificate.hcid.value;
    }

    // Vaccination event
    ddccCredential.credentialSubject.batchNumber = vaccination.lot;
    ddccCredential.credentialSubject.countryOfVaccination =
      vaccination.country.code;
    ddccCredential.credentialSubject.dateOfVaccination = vaccination.date;

    if (vaccination.centre) {
      ddccCredential.credentialSubject.administeringCentre = vaccination.centre;
    }
    if (vaccination.nextDose) {
      ddccCredential.credentialSubject.nextVaccinationDate =
        vaccination.nextDose;
    }
    if (vaccination.totalDoses) {
      ddccCredential.credentialSubject.totalDoses = vaccination.totalDoses;
    }
    if (vaccination.validFrom) {
      try {
        ddccCredential.credentialSubject.validFrom = this.getDate(
          new Date(vaccination.validFrom)
        );
      } catch (e) {
        this.log.info(
          // eslint-disable-next-line max-len
          'Invalid certificate "validFrom" value ... skipping the update of this value in the credential'
        );
      }
    }
    ddccCredential.credentialSubject.order = vaccination.dose.toString();
    // recipient
    ddccCredential.credentialSubject.recipient.id = data.receiverDid;
    ddccCredential.credentialSubject.recipient.name = ddccData.name;
    if (ddccData.birthDate) {
      ddccCredential.credentialSubject.recipient.birthDate = ddccData.birthDate;
    }
    if (ddccData.identifier) {
      ddccCredential.credentialSubject.recipient.identifier =
        ddccData.identifier;
    }
    if (ddccData.sex) {
      ddccCredential.credentialSubject.recipient.gender = ddccData.sex;
    }
    // vaccine
    ddccCredential.credentialSubject.vaccine.atcCode =
      ddccData.vaccination.vaccine.code;
    const medicinalProductName = MEDICINAL_PRODUCT_NAMES.get(
      ddccData.vaccination.brand.code
    );
    ddccCredential.credentialSubject.vaccine.medicinalProductName =
      medicinalProductName
        ? medicinalProductName
        : ddccData.vaccination.brand.code;
    if (ddccData.vaccination.maholder && ddccData.vaccination.maholder.code) {
      ddccCredential.credentialSubject.vaccine.marketingAuthorizationHolder =
        ddccData.vaccination.maholder.code;
    }
    if (ddccData.vaccination.disease && ddccData.vaccination.disease.code) {
      const mappedDisease = DISEASE_LIST.get(ddccData.vaccination.disease.code);
      ddccCredential.credentialSubject.vaccine.disease = mappedDisease
        ? mappedDisease
        : ddccData.vaccination.disease.code;
    }
    if (
      ddccData.vaccination.practitioner &&
      ddccData.vaccination.practitioner.value
    ) {
      ddccCredential.credentialSubject.healthProfessional =
        ddccData.vaccination.practitioner.value;
    }
    // Image
    ddccCredential.credentialSubject.image.encodingFormat =
      attachment.contentType;
    ddccCredential.credentialSubject.image.contentUrl = attachment.data;
    if (qrDescription && qrDescription.length > 0) {
      ddccCredential.credentialSubject.image.description = qrDescription;
    }
    return ddccCredential;
  }

  /**
   * Adds proof to a Credential of type DDCC
   * @param {IDDCCCredential} credential - Credential without proof
   * @param {string} issuerDid - Issuing entity
   * @return {Promise<IDDCCVerifiableCredential>} A DDCC Verifiable credential
   */
  async addProof(
    credential: ICredentialV2,
    issuerDid: string
  ): Promise<IVerifiableCredential> {
    const proof = await this.getIType2ProofAssertionMethodTemplate(
      credential,
      issuerDid
    );
    return { ...credential, proof };
  }

  computeRfc8785AndSha256(data: any) {
    const canonizedData = canonicalize(data);
    if (!canonizedData) {
      throw new BadRequestError(ErrorsMessages.CANONICALIZE_ERROR);
    }
    return (
      '0x' + crypto.createHash('sha256').update(canonizedData).digest('hex')
    );
  }

  async getIType1ProofAssertionMethodTemplate(
    credentialData: ICredentialV2,
    issuerDid: string
  ): Promise<IType1Proof> {
    const credentialHash = this.computeRfc8785AndSha256(credentialData); // TODO: !!
    const assertionKey = await this.getOrSetOrCreateAssertionPublicKeyFromDid(
      issuerDid,
      'P-256'
    );
    // invariant verification:
    const pubKey = assertionKey.hexPubKey.replace('0x', '');
    if (!pubKey || pubKey.length !== 64) {
      throw new InternalServerError(ErrorsMessages.INTERNAL_SERVER_ERROR);
    }

    const p256CompressedPubKey = '0x02' + pubKey;
    const messageRequest: ISignPlainMessageByCompressedPublicKey = {
      compressedPublicKey: p256CompressedPubKey,
      message: credentialHash
    };
    const proofValueResponse = await this.keyManager.p256SignPlainMessage(
      messageRequest
    );
    // TODO: add onchain proof
    const type1Proof: IType1Proof = {
      id: issuerDid,
      type: 'EcdsaSecp256k1Signature2019',
      proofPurpose: 'assertionMethod',
      verificationMethod: assertionKey.keyId,
      domain: this.domain,
      proofValue: proofValueResponse.signature
    };
    return type1Proof;
  }

  async getIType2ProofAssertionMethodTemplate(
    unsecuredDocument: ICredentialV2,
    issuerDid: string
  ): Promise<IType2Proof> {
    const canonicalDocumentHash = this.computeRfc8785AndSha256(
      unsecuredDocument
    ).replace('0x', ''); // TODO: !!
    const assertionKey = await this.getOrSetOrCreateAssertionPublicKeyFromDid(
      issuerDid,
      'P-256'
    );
    // invariant verification:
    const pubKey = assertionKey.hexPubKey.replace('0x', '');
    if (!pubKey || pubKey.length !== 64) {
      throw new InternalServerError(ErrorsMessages.INTERNAL_SERVER_ERROR);
    }

    const proofConfig: IType2ProofConfig = {
      type: 'DataIntegrityProof',
      proofPurpose: 'assertionMethod',
      verificationMethod: assertionKey.keyId,
      domain: this.domain,
      cryptosuite: 'ecdsa-jcs-2019',
      created: this.getUtcDate() // TODO: verify
    };

    const proofConfigHash = this.computeRfc8785AndSha256(proofConfig).replace(
      '0x',
      ''
    );

    const hashData = '0x' + proofConfigHash.concat(canonicalDocumentHash);

    const p256CompressedPubKey = '0x02' + pubKey;
    const messageRequest: ISignPlainMessageByCompressedPublicKey = {
      compressedPublicKey: p256CompressedPubKey,
      message: hashData
    };
    const proofValueResponse = await this.keyManager.p256SignPlainMessage(
      messageRequest
    );
    const type2Proof: IType2Proof = {
      ...proofConfig,
      proofValue: this.base58.encode(
        Buffer.from(proofValueResponse.signature.replace('0x', ''), 'hex')
      )
    };
    return type2Proof;
  }

  private getUtcDate(t = new Date()) {
    const y = t.getUTCFullYear();
    const month = this.getTwoDigitFormat(t.getUTCMonth() + 1);
    const d = this.getTwoDigitFormat(t.getUTCDate());
    const h = this.getTwoDigitFormat(t.getUTCHours());
    const m = this.getTwoDigitFormat(t.getUTCMinutes());
    const s = this.getTwoDigitFormat(t.getUTCSeconds());
    return `${y}-${month}-${d}T${h}:${m}:${s}Z`;
  }

  private getDate(t: Date) {
    const y = t.getUTCFullYear();
    const month = this.getTwoDigitFormat(t.getMonth() + 1);
    const d = this.getTwoDigitFormat(t.getDate());
    const h = this.getTwoDigitFormat(t.getHours());
    const m = this.getTwoDigitFormat(t.getMinutes());
    const s = this.getTwoDigitFormat(t.getSeconds());
    return `${y}-${month}-${d}T${h}:${m}:${s}Z`;
  }

  private getTwoDigitFormat(el: number): string {
    if (el < 10) {
      return '0'.concat(el.toString());
    }
    return el.toString();
  }

  private encode() {
    const publicDirectoryContractAddress = resolvePublicDirectoryAddress();
    const chainOfTrustContractAddress = resolveChainOfTrustAddress();
    const verificationRegistryContractAddress =
      resolveVerificationRegistryContractAddress();
    const payload = [
      Buffer.from(VerifiableCredentialService.version.replace('0x', ''), 'hex'),
      Buffer.from(VerifiableCredentialService.type.replace('0x', ''), 'hex'),
      Buffer.from(verificationRegistryContractAddress.replace('0x', ''), 'hex'),
      Buffer.from(publicDirectoryContractAddress.replace('0x', ''), 'hex'),
      Buffer.from(chainOfTrustContractAddress.replace('0x', ''), 'hex'),
      Buffer.from(CHAIN_ID.replace('0x', ''), 'hex')
    ];
    payload.push(this.checksum(payload));
    return this.base58.encode(Buffer.concat(payload));
  }
  private checksum(payload: Buffer[]): Buffer {
    return Buffer.from(
      keccak256(Buffer.concat(payload)).replace('0x', ''),
      'hex'
    ).subarray(0, 4);
  }
}
