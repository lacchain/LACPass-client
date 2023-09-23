import { Service } from 'typedi';
import { KeyManagerService } from '../external/key-manager/key-manager.service';
import { IDidJwt } from 'lacchain-key-manager';
import { DidDocumentService } from '../../services/did/did.document.service';
import { IDidCommToEncryptData } from 'lacchain-key-manager';
import { BadRequestError, InternalServerError } from 'routing-controllers';
import { ErrorsMessages } from '../../constants/errorMessages';
import {
  SECURE_RELAY_MESSAGE_DELIVERER_BASE_URL,
  SECURE_RELAY_MESSAGE_DELIVERER_SEND,
  SECURE_RELAY_SERVICE_DID,
  log4TSProvider
} from '../../config';
import fetch from 'node-fetch';
import { IDelivery } from 'src/interfaces/verifiable-credential/delivery';

const JWT_ENCODING_ALGORITHM = 'ES256K';
const DID_DOC_KEY_AGREEMENT_KEYWORD = 'X25519KeyAgreementKey2019';

@Service()
export class SecureRelayService {
  log = log4TSProvider.getLogger('SecureRelayService');
  private keyManager: KeyManagerService;
  private readonly didDocumentService: DidDocumentService;
  private keyExchangePublicKeys: Map<string, string> = new Map<
    string,
    string
  >();
  constructor() {
    this.keyManager = new KeyManagerService();
    this.didDocumentService = new DidDocumentService();
  }
  async sendData(
    subDid: string,
    authAddress: string,
    keyExchangePublicKey: string,
    recipientDid: string,
    message: string,
    exp = Math.floor(Date.now() / 1000 + 3600 * 24) // one day
  ): Promise<IDelivery> {
    const didJwtParams: IDidJwt = {
      subDid,
      aud: SECURE_RELAY_SERVICE_DID,
      exp,
      alg: JWT_ENCODING_ALGORITHM,
      signerAddress: authAddress
    };
    const didJwt = await this.keyManager.createDidJwt(didJwtParams);
    const recipientDidDoc = await this.didDocumentService.resolver.resolve(
      recipientDid
    );
    const recipientPublicKeyBuffer = DidDocumentService.findKeyAgreement(
      recipientDidDoc,
      DID_DOC_KEY_AGREEMENT_KEYWORD
    );
    if (!recipientPublicKeyBuffer) {
      throw new BadRequestError(
        ErrorsMessages.KEY_AGREEMENT_NOT_FOUND + ' for final recipient'
      );
    }
    const recipientPublicKey = Buffer.from(recipientPublicKeyBuffer).toString(
      'hex'
    );
    // encrypt:
    const args: IDidCommToEncryptData = {
      message,
      senderPublicKey: keyExchangePublicKey,
      recipientPublicKey,
      nonRepudiable: false
    };
    const encryptedMessage = await this.keyManager.didCommEncrypt(args);
    const envelope = {
      type: 'https://didcomm.org/routing/2.0/forward',
      to: [SECURE_RELAY_SERVICE_DID],
      // eslint-disable-next-line camelcase
      expires_time: Math.floor(Date.now() / 1000) + 3600 * 24 * 60,
      body: {
        // eslint-disable-next-line quote-props
        next: recipientDid,
        'payloads~attach': [encryptedMessage]
      }
    };

    const secureRelayKeyExchangePublicKey =
      await this.getKeyExchangePublicKeyFromDid(SECURE_RELAY_SERVICE_DID);

    const args1: IDidCommToEncryptData = {
      message: JSON.stringify(envelope),
      senderPublicKey: keyExchangePublicKey,
      recipientPublicKey: secureRelayKeyExchangePublicKey,
      nonRepudiable: false
    };
    const encryptedToSecureRelayMessageDeliverer =
      await this.keyManager.didCommEncrypt(args1);

    return this.sendDataThroughSecureRelayMessageDeliverer(
      didJwt,
      encryptedToSecureRelayMessageDeliverer
    );
  }

  async getKeyExchangePublicKeyFromDid(did: string): Promise<string> {
    const keyExchangePublicKey = this.keyExchangePublicKeys.get(did);
    if (keyExchangePublicKey) {
      return keyExchangePublicKey;
    }
    const didDoc = await this.didDocumentService.resolver.resolve(did);
    const foundkeyExchangePublicKey = DidDocumentService.findKeyAgreement(
      didDoc,
      DID_DOC_KEY_AGREEMENT_KEYWORD
    );
    if (foundkeyExchangePublicKey) {
      const hexPubKey = Buffer.from(foundkeyExchangePublicKey).toString('hex');
      this.keyExchangePublicKeys.set(did, hexPubKey);
      return hexPubKey;
    }
    throw new BadRequestError(
      ErrorsMessages.KEY_AGREEMENT_NOT_FOUND +
        ' for secure relay message deliverer'
    );
  }

  /**
   * @description Sends encripted message to a secure relay message
   * @param {string} token
   * @param {any} message
   * @return {{deliveryId: string}} an "id" returned by the secure relay message
   * acknowledging the received message
   */
  private async sendDataThroughSecureRelayMessageDeliverer(
    token: string,
    message: any
  ): Promise<IDelivery> {
    const result = await fetch(
      `${SECURE_RELAY_MESSAGE_DELIVERER_BASE_URL}${SECURE_RELAY_MESSAGE_DELIVERER_SEND}`,
      {
        method: 'POST',
        headers: {
          // eslint-disable-next-line quote-props
          token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      }
    );
    this.log.info('status', result.status);
    if (result.status !== 200) {
      this.log.info(await result.text());
      throw new InternalServerError(
        ErrorsMessages.SECURE_RELAY_MESSAGE_DELIVERY_ERROR
      );
    }
    const deliveryId = (await result.json()) as string;
    return { deliveryId };
  }
}
