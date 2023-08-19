export interface ICredential {
  context: string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate: string;
}
export interface IDDCCCredential extends ICredential {
  credentialSubject: {
    id: string;
    name: string;
    birthDate: string;
    sex: string;
    identifier: string;
    vaccine: {
      vaccine: string;
      brand: string;
      manufacturer: string;
      authorization: string;
      batch: string;
      dose: number;
      vaccinationDate: string;
      country: string;
      administeringCentre: string;
      worker: string;
      disease: string;
      birthDate: string;
    };
  };
  evidence: any[];
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
