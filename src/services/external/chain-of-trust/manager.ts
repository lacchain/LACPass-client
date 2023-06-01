// import { INewAccountIdAttribute } from 'lacpass-identity';
import {
  CHAIN_OF_TRUST_BASE_URL,
  COT_CREATE_MANAGER,
  COT_GET_MANAGER,
  IS_ORCHESTRATOR_DEPENDENT_SERVICE,
  log4TSProvider
} from '../../../config';
import { Service } from 'typedi';
import { InternalServerError } from 'routing-controllers';
import { ErrorsMessages } from '../../../constants/errorMessages';
import { IManagerService, IManager, INewManager } from 'lacpass-chain-of-trust';

@Service()
export class Manager {
  public createManager: (managerRequest: INewManager) => Promise<IManager>;
  public getManager: (entityDid: string) => Promise<IManager>;

  log = log4TSProvider.getLogger('ChainOfTrustManagerService');

  private manager: IManagerService | null;
  constructor() {
    if (IS_ORCHESTRATOR_DEPENDENT_SERVICE !== 'true') {
      this.log.info('Configuring library usage');
      this.createManager = this.createManagerByLib;
      this.getManager = this.getManagerByLib;

      // setting imported chain of trust manager service
      const S = require('lacpass-chain-of-trust').ManagerService;
      this.manager = new S();
    } else {
      this.log.info('Configuring external service connection');
      this.createManager = this.createManagerByExternalService;
      this.getManager = this.getManagerByExternalService;
      this.manager = null;
    }
  }

  private async createManagerByLib(
    managerRequest: INewManager
  ): Promise<IManager> {
    return (await this.manager?.createManager(managerRequest)) as IManager;
  }

  private async getManagerByLib(entityDid: string): Promise<IManager> {
    return (await this.manager?.getManager(entityDid)) as IManager;
  }

  private async createManagerByExternalService(
    managerRequest: INewManager
  ): Promise<IManager> {
    const result = await fetch(
      `${CHAIN_OF_TRUST_BASE_URL}${COT_CREATE_MANAGER}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(managerRequest)
      }
    );
    console.log('status', result.status);
    if (result.status !== 200) {
      console.log(await result.text());
      throw new InternalServerError(ErrorsMessages.MANAGER_CREATION_ERROR);
    }
    return (await result.json()) as IManager;
  }

  private async getManagerByExternalService(
    entityDid: string
  ): Promise<IManager> {
    const result = await fetch(
      `${CHAIN_OF_TRUST_BASE_URL}${COT_GET_MANAGER}/${entityDid}`,
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
      throw new InternalServerError(ErrorsMessages.MANAGER_CREATION_ERROR);
    }
    return (await result.json()) as IManager;
  }
}
