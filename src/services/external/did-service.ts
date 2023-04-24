import { Service } from 'typedi';
import { DidService, DidType } from 'lacpass-identity';
import {
  DID_WEB_LAC,
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
  private didService: DidService | null;
  log = log4TSProvider.getLogger('IdentityManagerService');
  constructor() {
    if (IS_DEPENDENT_SERVICE !== 'true') {
      this.log.info('Configuring identity-manager library usage');
      this.createDid = this.createDidByLib;
      const S = require('lacpass-identity').DidServiceWebLac;
      this.didService = new S();
    } else {
      this.log.info('Configuring identity-manager external service connection');
      this.didService = null;
      this.createDid = this.createDidByExternalService;
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
}
