import { Service } from 'typedi';
import {
  DidLacService,
  DidType,
  IJwkRsaAttribute,
  didWelLacAttributes,
  IJwkEcAttribute
} from 'lacpass-identity';
import {
  DID_WEB_LAC,
  DID_WEB_LAC_CONTROLLER,
  DID_WEB_LAC_DECODE_DID,
  DID_WEB_LAC_ADD_RSA_JWK_ATTR,
  DID_WEB_LAC_ADD_EC_JWK_ATTR,
  IDENTITY_MANAGER_BASE_URL,
  IS_DEPENDENT_SERVICE,
  log4TSProvider
} from '@config';
import { InternalServerError } from 'routing-controllers';
import { ErrorsMessages } from '@constants/errorMessages';
import fetch from 'node-fetch';

@Service()
export class DidServiceWL {
  public createDid: () => Promise<DidType>;
  public addRsaJwkAttribute: (
    jwkRsaAttribute: IJwkRsaAttribute
  ) => Promise<any>;
  public addEcJwkAttribute: (ecJwkAttribute: IJwkEcAttribute) => Promise<any>;
  public getController: (did: string) => Promise<any>;
  public decodeDid: (did: string) => Promise<didWelLacAttributes>;

  private didService: DidLacService | null;
  log = log4TSProvider.getLogger('IdentityManagerService');
  constructor() {
    if (IS_DEPENDENT_SERVICE !== 'true') {
      this.log.info('Configuring identity-manager library usage');

      this.createDid = this.createDidByLib;
      this.getController = this.getControllerByLib;
      this.decodeDid = this.decodeDidByLib;
      this.addRsaJwkAttribute = this.addRsaJwkAttributeByLib;
      this.addEcJwkAttribute = this.addEcJwkAttributeByLib;
      const S = require('lacpass-identity').DidServiceWebLac;
      this.didService = new S();
    } else {
      this.log.info('Configuring identity-manager external service connection');
      this.didService = null;
      this.createDid = this.createDidByExternalService;
      this.getController = this.getControllerByExternalService;
      this.decodeDid = this.decodeDidByExternalService;
      this.addRsaJwkAttribute = this.addRsaJwkAttributeByExternalService;
      this.addEcJwkAttribute = this.addEcJwkAttributeByExternalService;
    }
  }
  private async createDidByLib(): Promise<DidType> {
    return (await this.didService?.createDid()) as DidType;
  }
  private async createDidByExternalService(): Promise<DidType> {
    const result = await fetch(`${IDENTITY_MANAGER_BASE_URL}${DID_WEB_LAC}`, {
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
      `${IDENTITY_MANAGER_BASE_URL}${DID_WEB_LAC_CONTROLLER}/${did}`,
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

  private async decodeDidByLib(did: string): Promise<didWelLacAttributes> {
    return (await this.didService?.decodeDid(did)) as any;
  }
  private async decodeDidByExternalService(
    did: string
  ): Promise<didWelLacAttributes> {
    const result = await fetch(
      `${IDENTITY_MANAGER_BASE_URL}${DID_WEB_LAC_DECODE_DID}/${did}`,
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
      throw new InternalServerError(ErrorsMessages.DECODE_DID_CONTROLLER_ERROR);
    }
    return (await result.json()) as didWelLacAttributes;
  }
  private async addRsaJwkAttributeByLib(
    jwkRsaAttribute: IJwkRsaAttribute
  ): Promise<any> {
    return (await this.didService?.addRsaJwkAttribute(jwkRsaAttribute)) as any;
  }
  private async addRsaJwkAttributeByExternalService(
    jwkRsaAttribute: IJwkRsaAttribute
  ): Promise<didWelLacAttributes> {
    const result = await fetch(
      `${IDENTITY_MANAGER_BASE_URL}${DID_WEB_LAC_ADD_RSA_JWK_ATTR}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jwkRsaAttribute)
      }
    );
    console.log('status', result.status);
    if (result.status !== 200) {
      console.log(await result.text());
      throw new InternalServerError(ErrorsMessages.ADD_ATTRIBUTE_ERROR);
    }
    return (await result.json()) as any;
  }

  private async addEcJwkAttributeByLib(
    ecJwkAttribute: IJwkEcAttribute
  ): Promise<any> {
    return (await this.didService?.addEcJwkAttribute(ecJwkAttribute)) as any;
  }
  private async addEcJwkAttributeByExternalService(
    ecJwkAttribute: IJwkEcAttribute
  ): Promise<didWelLacAttributes> {
    const result = await fetch(
      `${IDENTITY_MANAGER_BASE_URL}${DID_WEB_LAC_ADD_EC_JWK_ATTR}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ecJwkAttribute)
      }
    );
    console.log('status', result.status);
    if (result.status !== 200) {
      console.log(await result.text());
      throw new InternalServerError(ErrorsMessages.ADD_ATTRIBUTE_ERROR);
    }
    return (await result.json()) as any;
  }
}
