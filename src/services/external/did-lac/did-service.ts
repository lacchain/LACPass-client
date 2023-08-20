import { Service } from 'typedi';
import {
  DidLacService,
  DidType,
  didLacAttributes,
  IEthereumTransactionResponse,
  INewAttribute,
  INewECAttributeCreationResponse,
  INewJwkAttribute,
  INewJwkAttributeCreationResponse
} from 'lacpass-identity';
import {
  DID_LAC1_CONTROLLER,
  DID_LAC1_DECODE_DID,
  IDENTITY_MANAGER_BASE_URL,
  IS_CLIENT_DEPENDENT_SERVICE,
  log4TSProvider,
  DID_LAC1,
  DID_LAC1_ADD_JWK_ATTR_FROM_X509_CERT,
  DID_LAC1_REVOKE_JWK_ATTR_FROM_X509_CERT,
  DID_LAC1_ADD_NEW_SECP256K1_ATTRIBUTE,
  DID_LAC1_ADD_NEW_ED25519_ATTRIBUTE,
  DID_LAC1_ADD_NEW_JWK_ATTRIBUTE
} from '../../../config';
import { InternalServerError } from 'routing-controllers';
import { ErrorsMessages } from '../../../constants/errorMessages';
import fetch from 'node-fetch';
import FormData from 'form-data';

@Service()
export class DidServiceLac1 {
  // did
  public createDid: () => Promise<DidType>;
  public getController: (did: string) => Promise<any>;
  public decodeDid: (did: string) => Promise<didLacAttributes>;

  // jwk attribute
  public rawAddAttributeFromX509Certificate: (
    formData: any,
    x509Cert: Express.Multer.File
  ) => Promise<IEthereumTransactionResponse>;
  public rawRevokeAttributeFromX509Certificate: (
    formData: any,
    x509Cert: Express.Multer.File
  ) => Promise<IEthereumTransactionResponse>;

  // secp256k1 attribute
  public addNewSecp256k1Attribute: (
    newSecp256k1Attribute: INewAttribute
  ) => Promise<INewECAttributeCreationResponse>;

  // x25519 key attribute
  public addNewEd25519Attribute: (
    newEd25519Attribute: INewAttribute
  ) => Promise<INewECAttributeCreationResponse>;

  // Jwk attribute
  public addNewJwkAttribute: (
    attribute: INewJwkAttribute
  ) => Promise<INewJwkAttributeCreationResponse>;

  // TODO: Chain of trust

  private didService: DidLacService | null;
  log = log4TSProvider.getLogger('IdentityManagerService');
  constructor() {
    if (IS_CLIENT_DEPENDENT_SERVICE !== 'true') {
      this.log.info('Configuring library usage');

      this.createDid = this.createDidByLib;
      this.getController = this.getControllerByLib;
      this.decodeDid = this.decodeDidByLib;

      this.rawAddAttributeFromX509Certificate =
        this.rawAddAttributeFromX509CertificateByLib;

      this.rawRevokeAttributeFromX509Certificate =
        this.rawRevokeAttributeFromX509CertificateByLib;

      this.addNewSecp256k1Attribute = this.addNewSecp256k1AttributeByLib;

      this.addNewEd25519Attribute = this.addNewEd25519AttributeByLib;

      this.addNewJwkAttribute = this.addNewJwkAttributeByLib;

      const S = require('lacpass-identity').DidLac1Service;
      this.didService = new S();
    } else {
      this.log.info('Configuring external service connection');
      this.didService = null;
      this.createDid = this.createDidByExternalService;
      this.getController = this.getControllerByExternalService;
      this.decodeDid = this.decodeDidByExternalService;

      this.rawAddAttributeFromX509Certificate =
        this.rawAddAttributeFromX509CertificateByExternalService;
      this.rawRevokeAttributeFromX509Certificate =
        this.rawRevokeAttributeFromX509CertificateByExternalService;

      this.addNewSecp256k1Attribute =
        this.addNewSecp256k1AttributeByExternalService;

      this.addNewEd25519Attribute =
        this.addNewEd25519AttributeByExternalService;
      this.addNewJwkAttribute = this.addNewJwkAttributeByExternalService;
    }
  }
  private async createDidByLib(): Promise<DidType> {
    return (await this.didService?.createDid()) as DidType;
  }
  private async createDidByExternalService(): Promise<DidType> {
    const result = await fetch(`${IDENTITY_MANAGER_BASE_URL}${DID_LAC1}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('status', result.status);
    if (result.status !== 200) {
      console.log(await result.text());
      throw new InternalServerError(ErrorsMessages.CREATE_DID_ERROR);
    }
    return (await result.json()) as DidType;
  }

  private async getControllerByLib(did: string): Promise<any> {
    return (await this.didService?.getController(did)) as any;
  }
  private async getControllerByExternalService(did: string): Promise<any> {
    const result = await fetch(
      `${IDENTITY_MANAGER_BASE_URL}${DID_LAC1_CONTROLLER}/${did}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('status', result.status);
    if (result.status !== 200) {
      console.log(await result.text());
      throw new InternalServerError(ErrorsMessages.GET_DID_CONTROLLER_ERROR);
    }
    return (await result.json()) as any;
  }

  private async decodeDidByLib(did: string): Promise<didLacAttributes> {
    return (await this.didService?.decodeDid(did)) as any;
  }
  private async decodeDidByExternalService(
    did: string
  ): Promise<didLacAttributes> {
    const result = await fetch(
      `${IDENTITY_MANAGER_BASE_URL}${DID_LAC1_DECODE_DID}/${did}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    if (result.status !== 200) {
      console.log(await result.text());
      throw new InternalServerError(ErrorsMessages.DECODE_DID_CONTROLLER_ERROR);
    }
    return (await result.json()) as didLacAttributes;
  }

  private async rawAddAttributeFromX509CertificateByLib(
    formData: any,
    x509Cert: Express.Multer.File
  ): Promise<IEthereumTransactionResponse> {
    return await this.didService?.rawAddAttributeFromX509Certificate(
      formData,
      x509Cert
    );
  }

  private async rawAddAttributeFromX509CertificateByExternalService(
    formData: any,
    x509Cert: Express.Multer.File
  ): Promise<IEthereumTransactionResponse> {
    const payloadform = new FormData();
    const fileName = x509Cert.originalname ? x509Cert.originalname : 'x509Cert';
    payloadform.append('x509Cert', x509Cert.buffer, fileName);
    payloadform.append('data', formData.data || '');
    const result = await fetch(
      `${IDENTITY_MANAGER_BASE_URL}${DID_LAC1_ADD_JWK_ATTR_FROM_X509_CERT}`,
      {
        method: 'POST',
        body: payloadform,
        headers: payloadform.getHeaders()
      }
    );
    if (result.status !== 200) {
      console.log(await result.text());
      throw new InternalServerError(ErrorsMessages.ADD_ATTRIBUTE_ERROR);
    }
    return (await result.json()) as IEthereumTransactionResponse;
  }

  private async rawRevokeAttributeFromX509CertificateByLib(
    formData: any,
    x509Cert: Express.Multer.File
  ): Promise<IEthereumTransactionResponse> {
    return this.didService?.rawRevokeAttributeFromX509Certificate(
      formData,
      x509Cert
    );
  }

  private async rawRevokeAttributeFromX509CertificateByExternalService(
    formData: any,
    x509Cert: Express.Multer.File
  ): Promise<IEthereumTransactionResponse> {
    const payloadform = new FormData();
    const fileName = x509Cert.originalname ? x509Cert.originalname : 'x509Cert';
    payloadform.append('x509Cert', x509Cert.buffer, fileName);
    payloadform.append('data', formData.data || '');
    const result = await fetch(
      `${IDENTITY_MANAGER_BASE_URL}${DID_LAC1_REVOKE_JWK_ATTR_FROM_X509_CERT}`,
      {
        method: 'POST',
        body: payloadform,
        headers: payloadform.getHeaders()
      }
    );
    if (result.status !== 200) {
      console.log(await result.text());
      throw new InternalServerError(ErrorsMessages.ADD_ATTRIBUTE_ERROR);
    }
    return (await result.json()) as IEthereumTransactionResponse;
  }

  private async addNewSecp256k1AttributeByLib(
    newAttribute: INewAttribute
  ): Promise<INewECAttributeCreationResponse> {
    return (await this.didService?.addNewSecp256k1Attribute(
      newAttribute
    )) as INewECAttributeCreationResponse;
  }

  private async addNewEd25519AttributeByLib(
    newAttribute: INewAttribute
  ): Promise<INewECAttributeCreationResponse> {
    return (await this.didService?.addNewEd25519Attribute(
      newAttribute
    )) as INewECAttributeCreationResponse;
  }

  private async addNewSecp256k1AttributeByExternalService(
    newAttribute: INewAttribute
  ): Promise<INewECAttributeCreationResponse> {
    const result = await fetch(
      `${IDENTITY_MANAGER_BASE_URL}${DID_LAC1_ADD_NEW_SECP256K1_ATTRIBUTE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAttribute)
      }
    );
    console.log('status', result.status);
    if (result.status !== 200) {
      console.log(await result.text());
      throw new InternalServerError(ErrorsMessages.ADD_ATTRIBUTE_ERROR);
    }
    return (await result.json()) as INewECAttributeCreationResponse;
  }

  private async addNewEd25519AttributeByExternalService(
    newAttribute: INewAttribute
  ): Promise<INewECAttributeCreationResponse> {
    const result = await fetch(
      `${IDENTITY_MANAGER_BASE_URL}${DID_LAC1_ADD_NEW_ED25519_ATTRIBUTE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAttribute)
      }
    );
    console.log('status', result.status);
    if (result.status !== 200) {
      console.log(await result.text());
      throw new InternalServerError(ErrorsMessages.ADD_ATTRIBUTE_ERROR);
    }
    return (await result.json()) as INewECAttributeCreationResponse;
  }

  private async addNewJwkAttributeByLib(
    attribute: INewJwkAttribute
  ): Promise<INewJwkAttributeCreationResponse> {
    return await this.didService?.addNewJwkAttribute(attribute);
  }

  private async addNewJwkAttributeByExternalService(
    newAttribute: INewJwkAttribute
  ): Promise<INewJwkAttributeCreationResponse> {
    const result = await fetch(
      `${IDENTITY_MANAGER_BASE_URL}${DID_LAC1_ADD_NEW_JWK_ATTRIBUTE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAttribute)
      }
    );
    console.log('status', result.status);
    if (result.status !== 200) {
      console.log(await result.text());
      throw new InternalServerError(ErrorsMessages.ADD_ATTRIBUTE_ERROR);
    }
    return (await result.json()) as INewJwkAttributeCreationResponse;
  }
}
