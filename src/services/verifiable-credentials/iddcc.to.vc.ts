export interface IAttachment {
  contentType: string;
  data: string;
}

export interface IFormat {
  system: string;
  code: string;
}
export interface IContent {
  attachment: IAttachment;
  format: IFormat;
}
export interface IResource {
  resourceType: string;
}
export interface IDocumentReference extends IResource {
  description: string;
  content: IContent[];
}
export interface IEntry {
  resource: IResource;
}
export interface IBundle {
  entry: IEntry[];
}
export interface IDDCCToVC {
  bundle: IBundle;
  issuerDid: string;
  receiverDid: string;
}
