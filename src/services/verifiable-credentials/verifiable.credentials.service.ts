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
  ICredential,
  IDDCCCredential,
  IDDCCVerifiableCredential,
  IType1Proof,
  IVerifiableCredential
} from 'src/interfaces/verifiable-credential/ddcc.credential';
import crypto from 'crypto';
import { Service } from 'typedi';
import { ethers, keccak256 } from 'ethers';
import {
  CHAIN_ID,
  log4TSProvider,
  resolveVerificationRegistryContractAddress
} from '../../config';
import { DidDocumentService } from '@services/did/did.document.service';
import { BadRequestError } from 'routing-controllers';
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
import { ISignPlainMessageByAddress } from 'lacchain-key-manager';
import { MEDICINAL_PRODUCT_NAMES } from '@constants/ddcc.medicinal.code.mapper';
import {
  IAttachment,
  IContent,
  IDDCCToVC,
  IDocumentReference
} from './iddcc.to.vc';
import { Attachment, Content, DocumentReference } from '@dto/DDCCToVC';
import { DISEASE_LIST } from '@constants/disease.code.mapper';

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
  private assertionPublicKeys: Map<
    string,
    { hexPubKey: string; keyId: string }
  > = new Map<string, { hexPubKey: string; keyId: string }>();
  private didServiceLac1: DidServiceLac1;
  private keyManager: KeyManagerService;
  constructor() {
    this.secureRelayService = new SecureRelayService();
    this.didServiceLac1 = new DidServiceLac1();
    this.keyManager = new KeyManagerService();
    this.domain = this.encode();
    this.didDocumentService = new DidDocumentService();
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
  ): Promise<any> {
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
    return this.secureRelayService.sendData(
      issuerDid,
      authAddress,
      keyExchangePublicKey,
      receiverDid,
      message
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

  async getOrSetOrCreateAssertionPublicKeyFromDid(
    did: string,
    type: 'secp256k1'
  ): Promise<{ hexPubKey: string; keyId: string }> {
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
        'secp256k1'
      );
    if (foundAssertionPublicKeys) {
      for (const assertionPublicKey of foundAssertionPublicKeys) {
        // TODO: generalize find algorithm to fit with any kind of key.
        // and apply to all methods
        const hexPubKey =
          '0x' + assertionPublicKey.publicKeyBuffer.toString('hex');
        const messageRequest: ISignPlainMessageByAddress = {
          address: ethers.computeAddress(hexPubKey),
          messageHash:
            '0x' + crypto.createHash('sha256').update('Proof').digest('hex')
        };
        try {
          await this.keyManager.secpSignPlainMessage(messageRequest);
        } catch (e: any) {
          // TODO:check in "DEPENDENT SERVICE" way
          if (e && e.message === 'Key not found') {
            console.log('error was', e.message);
            this.log.info(
              'secp256 private key related to',
              hexPubKey,
              ' assertion key was not found. Ignoring this key ...'
            );
            continue;
          }
          this.log.info(
            'Unexpected error encountered from key manager, error was',
            e
          );
          throw new BadRequestError(ErrorsMessages.INTERNAL_SERVER_ERROR);
        }
        this.log.info('Selecting Assertion Public Key', hexPubKey);
        const pk = {
          hexPubKey,
          keyId: assertionPublicKey.id
        };
        this.assertionPublicKeys.set(did, pk);
        return pk;
      }
    }

    const validDays = 365;
    this.log.info(
      // eslint-disable-next-line max-len
      `Couldn't find "assertion" key with type ${assertionRelationshipSearchKeyword} for did ${did} ... creating one for ${validDays} days`
    );
    const attribute: INewJwkAttribute = {
      did,
      validDays,
      relation: 'asse',
      jwkType: type
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
        'secp256k1'
      )?.find(el => {
        const hexPubKey = '0x' + el.publicKeyBuffer.toString('hex');
        return (
          ethers.computeAddress(hexPubKey) ===
          ethers.computeAddress(newAssertionKeyHex)
        );
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
        'https://www.w3.org/2018/credentials/v1',
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
      issuanceDate: new Date().toJSON(),
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
        ddccCredential.issuanceDate = new Date(
          certificate.period.start
        ).toJSON();
      } catch (e) {
        this.log.info(
          'invalid certificate start date, defaulting to current date'
        );
      }
    }

    if (certificate && certificate.period && certificate.period.end) {
      try {
        ddccCredential.expirationDate = new Date(
          certificate.period.end
        ).toJSON();
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
      ddccCredential.credentialSubject.nextVaccinationDate =
        vaccination.validFrom;
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
    const assertionKey = await this.getOrSetOrCreateAssertionPublicKeyFromDid(
      issuerDid,
      'secp256k1'
    );
    const hexPubKey = assertionKey.hexPubKey.startsWith('0x')
      ? assertionKey.hexPubKey
      : '0x' + assertionKey.hexPubKey;
    const messageRequest: ISignPlainMessageByAddress = {
      address: ethers.computeAddress(hexPubKey),
      messageHash: credentialHash
    };
    const proofValueResponse = await this.keyManager.secpSignPlainMessage(
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
