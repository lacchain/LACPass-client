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
  birthDate: string;
  identifier: string;
  gender: string;
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
  atcCode: string;
  medicinalProductName: string;
}

export interface IDDCCCredentialSubject {
  type: string[] | string;
  batchNumber: string;
  countryOfVaccination: string;
  dateOfVaccination: string;
  administeringCentre: string;
  order: string;
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
