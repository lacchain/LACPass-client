export interface ICredentialV2 {
  '@context': string[];
  id: string;
  type: string[] | string;
  issuer: string;
  name: string;
  identifier: string;
  validFrom: string;
  validUntil?: string;
}
export interface IDDCCCredential extends ICredentialV2 {
  credentialSubject: IDDCCCredentialSubject;
}

export interface VaccineRecipient {
  type: string[] | string;
  id: string;
  name: string;
  birthDate?: string;
  identifier?: string;
  gender?: string;
}

export interface ImageObject {
  type: string[] | string;
  name: string;
  alternateName: string;
  description: string;
  encodingFormat: string;
  contentUrl: string;
}

export interface Vaccine {
  type: string[] | string;
  atcCode: string; // vaccine code
  medicinalProductName: string; // brand "mapped" code
  marketingAuthorizationHolder?: string; // maholder code
  disease?: string; // disease "mapped" code
}

export interface IDDCCCredentialSubject {
  type: string[] | string;
  batchNumber: string;
  countryOfVaccination: string;
  dateOfVaccination: string;
  administeringCentre?: string;
  nextVaccinationDate?: string; // nextDose
  order: string; // dose
  totalDoses?: string; // totalDoses
  validFrom?: string; // validFrom
  healthProfessional?: string; // healthProfessional
  recipient: VaccineRecipient;
  vaccine: Vaccine;
  image: ImageObject;
}

export interface QRDDCC {
  qrb64: string;
  verificationUrlReference: string;
}

export interface IType1Proof {
  id: string;
  type: string[] | string;
  proofPurpose: string;
  verificationMethod: string;
  domain?: string;
  proofValue: string;
}

export interface IType2ProofConfig {
  type: 'DataIntegrityProof';
  cryptosuite: 'ecdsa-jcs-2019';
  created: string;
  proofPurpose: 'assertionMethod';
  verificationMethod: string;
  domain?: string;
}
export interface IType2Proof extends IType2ProofConfig {
  proofValue: string;
}

export type IDDCCVerifiableCredential = IDDCCCredential & {
  proof: IType2Proof;
};

export type IVerifiableCredential = ICredentialV2 & {
  proof: IType2Proof;
};
