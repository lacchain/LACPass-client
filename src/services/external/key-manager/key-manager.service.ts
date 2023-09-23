import { InternalServerError } from 'routing-controllers';
import {
  KEY_MANAGER_DID_COMM_ENCRYPT,
  KEY_MANAGER_DID_JWT,
  IS_CLIENT_DEPENDENT_SERVICE,
  KEY_MANAGER_BASE_URL,
  log4TSProvider,
  KEY_MANAGER_SECP256K1_PLAIN_MESSAGE_SIGN,
  KEY_MANAGER_SECP256K1_SIGN_LACCHAIN_TRANSACTION
} from '../../../config';
import { Service } from 'typedi';
import { ErrorsMessages } from '../../../constants/errorMessages';
import {
  IDidJwtService,
  IDidJwt,
  IDidCommService,
  IDidCommToEncryptData,
  ISignPlainMessageByAddress,
  ISecp256k1SignatureMessageResponse,
  Secp256k1GenericSignerService,
  ISignedTransaction,
  ILacchainTransaction,
  Secp256k1SignLacchainTransactionService
} from 'lacchain-key-manager';

@Service()
export class KeyManagerService {
  private didJwtService: IDidJwtService | null;
  private didCommEncryptService: IDidCommService | null;
  private secp256k1GenericSignerService: Secp256k1GenericSignerService | null;

  public createDidJwt: (didJwt: IDidJwt) => Promise<string>;
  public didCommEncrypt: (args: IDidCommToEncryptData) => Promise<any>;
  public secpSignPlainMessage: (
    message: ISignPlainMessageByAddress
  ) => Promise<ISecp256k1SignatureMessageResponse>;
  public signLacchainTransaction: (
    lacchainTransaction: ILacchainTransaction
  ) => Promise<ISignedTransaction>;
  // eslint-disable-next-line max-len
  private secp256k1SignLacchainTransactionService: Secp256k1SignLacchainTransactionService | null;
  log = log4TSProvider.getLogger('IdentityManagerService');
  constructor() {
    if (IS_CLIENT_DEPENDENT_SERVICE !== 'true') {
      this.log.info('Configuring library usage for key manager service');
      this.createDidJwt = this.createDidJwtByLib;
      this.didCommEncrypt = this.didCommEncryptByLib;
      this.secpSignPlainMessage = this.secpSignPlainMessageByLib;

      const S = require('lacchain-key-manager').DidJwtDbService;
      this.didJwtService = new S();

      const T = require('lacchain-key-manager').DidCommDbService;
      this.didCommEncryptService = new T();

      const U = require('lacchain-key-manager').Secp256k1GenericSignerServiceDb;
      this.secp256k1GenericSignerService = new U();

      this.signLacchainTransaction = this.signLacchainTransactionByLib;
      const V =
        require('lacchain-key-manager').Secp256k1SignLacchainTransactionServiceDb;
      this.secp256k1SignLacchainTransactionService = new V();
    } else {
      this.log.info('Configuring key manager as external service connection');
      this.didJwtService = null;
      this.createDidJwt = this.createDidJwtByExternalService;
      this.didCommEncrypt = this.didCommEncryptByExternalService;
      this.didCommEncryptService = null;
      this.secpSignPlainMessage = this.secpSignPlainMessageByExternalService;
      this.secp256k1GenericSignerService = null;

      this.secp256k1SignLacchainTransactionService = null;
      this.signLacchainTransaction =
        this.signLacchainTransactionByExternalService;
    }
  }
  private async createDidJwtByLib(didJwt: IDidJwt): Promise<string> {
    return (await this.didJwtService?.createDidJwt(didJwt)) as string;
  }

  private async didCommEncryptByLib(args: IDidCommToEncryptData): Promise<any> {
    return (await this.didCommEncryptService?.encrypt(args)) as any;
  }

  private async secpSignPlainMessageByLib(
    message: ISignPlainMessageByAddress
  ): Promise<ISecp256k1SignatureMessageResponse> {
    return await this.secp256k1GenericSignerService?.signPlainMessage(message);
  }

  async signLacchainTransactionByLib(
    lacchainTransaction: ILacchainTransaction
  ): Promise<ISignedTransaction> {
    return this.secp256k1SignLacchainTransactionService?.signEthereumBasedTransaction(
      lacchainTransaction
    );
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

  private async secpSignPlainMessageByExternalService(
    message: ISignPlainMessageByAddress
  ): Promise<ISecp256k1SignatureMessageResponse> {
    const result = await fetch(
      `${KEY_MANAGER_BASE_URL}${KEY_MANAGER_SECP256K1_PLAIN_MESSAGE_SIGN}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      }
    );
    console.log('status', result.status);
    if (result.status !== 200) {
      console.log(await result.text());
      throw new InternalServerError(ErrorsMessages.PLAIN_MESSAGE_SIGNING_ERROR);
    }
    return (await result.json()) as any;
  }

  async signLacchainTransactionByExternalService(
    lacchainTransaction: ILacchainTransaction
  ): Promise<ISignedTransaction> {
    const result = await fetch(
      `${KEY_MANAGER_BASE_URL}${KEY_MANAGER_SECP256K1_SIGN_LACCHAIN_TRANSACTION}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(lacchainTransaction)
      }
    );
    console.log('status', result.status);
    if (result.status !== 200) {
      console.log(await result.text());
      throw new InternalServerError(ErrorsMessages.SIGN_TRANSACTION_ERROR);
    }
    return (await result.json()) as ISignedTransaction; // todo: check type in this return
  }
}
