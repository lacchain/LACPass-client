import { InternalServerError } from 'routing-controllers';
import {
  KEY_MANAGER_DID_COMM_ENCRYPT,
  KEY_MANAGER_DID_JWT,
  IS_CLIENT_DEPENDENT_SERVICE,
  KEY_MANAGER_BASE_URL,
  log4TSProvider,
  KEY_MANAGER_SECP256K1_PLAIN_MESSAGE_SIGN,
  KEY_MANAGER_SECP256K1_SIGN_LACCHAIN_TRANSACTION,
  KEY_MANAGER_P256_PLAIN_MESSAGE_SIGN
} from '../../../config';
import { Service } from 'typedi';
import { ErrorsMessages } from '../../../constants/errorMessages';
import {
  IDidJwtService,
  IDidJwt,
  IDidCommService,
  IDidCommToEncryptData,
  ISignPlainMessageByAddress,
  ISignPlainMessageByCompressedPublicKey,
  IECDSASignatureMessageResponse,
  Secp256k1GenericSignerService,
  ISignedTransaction,
  ILacchainTransaction,
  Secp256k1SignLacchainTransactionService,
  P256SignerServiceDb
} from 'lacchain-key-manager';

@Service()
export class KeyManagerService {
  private didJwtService: IDidJwtService | null;
  private didCommEncryptService: IDidCommService | null;
  private secp256k1GenericSignerService: Secp256k1GenericSignerService | null;

  public createDidJwt: (didJwt: IDidJwt) => Promise<string>;
  public didCommEncrypt: (args: IDidCommToEncryptData) => Promise<any>;
  public secp256k1SignPlainMessage: (
    message: ISignPlainMessageByAddress
  ) => Promise<IECDSASignatureMessageResponse>;
  public p256SignPlainMessage: (
    message: ISignPlainMessageByCompressedPublicKey
  ) => Promise<IECDSASignatureMessageResponse>;
  public signLacchainTransaction: (
    lacchainTransaction: ILacchainTransaction
  ) => Promise<ISignedTransaction>;
  // eslint-disable-next-line max-len
  private secp256k1SignLacchainTransactionService: Secp256k1SignLacchainTransactionService | null;
  private p256SignPlainMessageService: P256SignerServiceDb | null;
  log = log4TSProvider.getLogger('IdentityManagerService');
  constructor() {
    if (IS_CLIENT_DEPENDENT_SERVICE !== 'true') {
      this.log.info('Configuring library usage for key manager service');
      this.createDidJwt = this.createDidJwtByLib;
      this.didCommEncrypt = this.didCommEncryptByLib;
      this.secp256k1SignPlainMessage = this.secp256k1SignPlainMessageByLib;

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

      this.p256SignPlainMessage = this.p256SignPlainMessageByLib;
      const W = require('lacchain-key-manager').P256SignerServiceDb;
      this.p256SignPlainMessageService = new W();
    } else {
      this.log.info('Configuring key manager as external service connection');
      this.didJwtService = null;
      this.createDidJwt = this.createDidJwtByExternalService;
      this.didCommEncrypt = this.didCommEncryptByExternalService;
      this.didCommEncryptService = null;
      this.secp256k1SignPlainMessage =
        this.secp256k1SignPlainMessageByExternalService;
      this.secp256k1GenericSignerService = null;

      this.secp256k1SignLacchainTransactionService = null;
      this.signLacchainTransaction =
        this.signLacchainTransactionByExternalService;

      this.p256SignPlainMessageService = null;
      this.p256SignPlainMessage = this.p256SignPlainMessageByExternalService;
    }
  }
  private async createDidJwtByLib(didJwt: IDidJwt): Promise<string> {
    return (await this.didJwtService?.createDidJwt(didJwt)) as string;
  }

  private async didCommEncryptByLib(args: IDidCommToEncryptData): Promise<any> {
    return (await this.didCommEncryptService?.encrypt(args)) as any;
  }

  private async secp256k1SignPlainMessageByLib(
    message: ISignPlainMessageByAddress
  ): Promise<IECDSASignatureMessageResponse> {
    return await this.secp256k1GenericSignerService?.signPlainMessage(message);
  }

  private async p256SignPlainMessageByLib(
    message: ISignPlainMessageByCompressedPublicKey
  ): Promise<IECDSASignatureMessageResponse> {
    return await this.p256SignPlainMessageService?.signPlainMessage(message);
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

  private async secp256k1SignPlainMessageByExternalService(
    message: ISignPlainMessageByAddress
  ): Promise<IECDSASignatureMessageResponse> {
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

  private async p256SignPlainMessageByExternalService(
    message: ISignPlainMessageByCompressedPublicKey
  ): Promise<IECDSASignatureMessageResponse> {
    const result = await fetch(
      `${KEY_MANAGER_BASE_URL}${KEY_MANAGER_P256_PLAIN_MESSAGE_SIGN}`,
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
