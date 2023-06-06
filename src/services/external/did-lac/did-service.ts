import { Service } from 'typedi';
import {
  DidLacService,
  DidType,
  didLacAttributes,
  IEthereumTransactionResponse
} from 'lacpass-identity';
import {
  DID_LAC1_CONTROLLER,
  DID_LAC1_DECODE_DID,
  IDENTITY_MANAGER_BASE_URL,
  IS_CLIENT_DEPENDENT_SERVICE,
  log4TSProvider,
  DID_LAC1,
  DID_LAC1_ADD_JWK_ATTR_FROM_X509_CERT,
  DID_LAC1_REVOKE_JWK_ATTR_FROM_X509_CERT
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

  // attribute
  public rawAddAttributeFromX509Certificate: (
    formData: any,
    x509Cert: Express.Multer.File
  ) => Promise<IEthereumTransactionResponse>;
  public rawRevokeAttributeFromX509Certificate: (
    formData: any,
    x509Cert: Express.Multer.File
  ) => Promise<IEthereumTransactionResponse>;

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
}
