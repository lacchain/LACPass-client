import { InternalServerError } from 'routing-controllers';
import {
  KEY_MANAGER_DID_COMM_ENCRYPT,
  KEY_MANAGER_DID_JWT,
  IS_CLIENT_DEPENDENT_SERVICE,
  KEY_MANAGER_BASE_URL,
  log4TSProvider
} from '../../../config';
import { Service } from 'typedi';
import { ErrorsMessages } from '../../../constants/errorMessages';
import {
  IDidJwtService,
  IDidJwt,
  IDidCommService,
  IDidCommToEncryptData
} from 'lacpass-key-manager';

@Service()
export class KeyManagerService {
  private didJwtService: IDidJwtService | null;
  private didCommEncryptService: IDidCommService | null;

  public createDidJwt: (didJwt: IDidJwt) => Promise<string>;
  public didCommEncrypt: (args: IDidCommToEncryptData) => Promise<any>;
  log = log4TSProvider.getLogger('IdentityManagerService');
  constructor() {
    if (IS_CLIENT_DEPENDENT_SERVICE !== 'true') {
      this.log.info('Configuring library usage for key manager service');
      this.createDidJwt = this.createDidJwtByLib;
      this.didCommEncrypt = this.didCommEncryptByLib;

      const S = require('lacpass-key-manager').DidJwtDbService;
      this.didJwtService = new S();

      const T = require('lacpass-key-manager').DidCommDbService;
      this.didCommEncryptService = new T();
    } else {
      this.log.info('Configuring key manager as external service connection');
      this.didJwtService = null;
      this.createDidJwt = this.createDidJwtByExternalService;
      this.didCommEncrypt = this.didCommEncryptByExternalService;
      this.didCommEncryptService = null;
    }
  }
  private async createDidJwtByLib(didJwt: IDidJwt): Promise<string> {
    return (await this.didJwtService?.createDidJwt(didJwt)) as string;
  }

  private async didCommEncryptByLib(args: IDidCommToEncryptData): Promise<any> {
    return (await this.didCommEncryptService?.encrypt(args)) as any;
  }

  private async createDidJwtByExternalService(
    didJwt: IDidJwt
  ): Promise<string> {
    const result = await fetch(
      `${KEY_MANAGER_BASE_URL}${KEY_MANAGER_DID_JWT}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(didJwt)
      }
    );
    console.log('status', result.status);
    if (result.status !== 200) {
      console.log(await result.text());
      throw new InternalServerError(ErrorsMessages.CREATE_DID_ERROR);
    }
    return (await result.json()) as string;
  }

  private async didCommEncryptByExternalService(
    args: IDidCommToEncryptData
  ): Promise<any> {
    const result = await fetch(
      `${KEY_MANAGER_BASE_URL}${KEY_MANAGER_DID_COMM_ENCRYPT}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(args)
      }
    );
    console.log('status', result.status);
    if (result.status !== 200) {
      console.log(await result.text());
      throw new InternalServerError(ErrorsMessages.DIDCOMM_ENCRYPT);
    }
    return (await result.json()) as any;
  }
}
