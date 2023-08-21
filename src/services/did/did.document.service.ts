import { Service } from 'typedi';
import sodium from 'libsodium-wrappers';

@Service()
export class DidDocumentService {
  static findKeyAgreement(doc: any, algorithm: string): Uint8Array | undefined {
    const key = doc.keyAgreement.find(
      (ka: { type: string }) => ka.type === algorithm
    );
    if (!key) {
      return undefined;
    }
    if (key.publicKeyHex) {
      return sodium.from_hex(key.publicKeyHex);
    }
    if (key.publicKeyBase64) {
      return sodium.from_base64(key.publicKeyBase64);
    }
    return undefined;
  }

  static findAuthenticationKey(
    doc: any,
    algorithm: string
  ): Uint8Array | undefined {
    const key = doc.authentication.find(
      (ka: { type: string }) => ka.type === algorithm
    );
    if (!key) {
      return undefined;
    }
    if (key.publicKeyHex) {
      return sodium.from_hex(key.publicKeyHex);
    }
    if (key.publicKeyBase64) {
      return sodium.from_base64(key.publicKeyBase64);
    }
    return undefined;
  }

  static findPublicKeyFromJwkAssertionKey(
    doc: any,
    algorithm: string,
    curve: 'secp256k1'
  ): { id: string; publicKeyBuffer: Uint8Array } | undefined {
    const key = doc.assertionMethod.find(
      (ka: { type: string }) => ka.type === algorithm
    );
    if (!key) {
      return undefined;
    }
    if (key.publicKeyJwk && key.publicKeyJwk.crv == curve) {
      return {
        id: key.id,
        publicKeyBuffer: Buffer.from(key.publicKeyJwk.x, 'base64url')
      };
    }
    return undefined;
  }
}
