export interface ICredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate: string;
}
export interface IDDCCCredential extends ICredential {
  credentialSubject: IDDCCCredentialSubject;
  evidence: any[];
}

export interface IDDCCCredentialSubject {
  id: string;
  name: string;
  birthDate: string;
  sex: string;
  identifier: string;
  vaccine: {
    vaccineCode: string;
    date: string;
    dose: number;
    country: string;
    centre: string;
    brand: string;
    lot: string;
  };
}
export interface DDCCQrEvidence {
  qrb64: string;
  verificationUrlReference?: string;
}

export interface QRDDCC {
  qrb64: string;
  verificationUrlReference: string;
}

export interface IType1Proof {
  id: string;
  type: string;
  proofPurpose: string;
  verificationMethod: string;
  domain?: string;
  proofValue: string;
}

export type IDDCCVerifiableCredential = IDDCCCredential & {
  proof: IType1Proof;
};

export type IVerifiableCredential = ICredential & { proof: IType1Proof };
