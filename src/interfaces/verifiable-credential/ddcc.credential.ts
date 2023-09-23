export interface ICredential {
  '@context': string[];
  id: string;
  type: string[] | string;
  issuer: string;
  name: string;
  identifier: string;
  issuanceDate: string;
  expirationDate?: string;
}
export interface IDDCCCredential extends ICredential {
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

export type IDDCCVerifiableCredential = IDDCCCredential & {
  proof: IType1Proof;
};

export type IVerifiableCredential = ICredential & { proof: IType1Proof };
