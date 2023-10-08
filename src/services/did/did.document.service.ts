import { Service } from 'typedi';
import sodium from 'libsodium-wrappers';
import { DID_RESOLVER_URL } from '@config';
import { DidResolver } from '@services/external/did-lac/did.resolver';

@Service()
export class DidDocumentService {
  public readonly resolver: DidResolver;
  constructor() {
    this.resolver = new DidResolver(DID_RESOLVER_URL);
  }
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

  static filterSecp256k1PublicKeysFromJwkAssertionKeys(
    doc: any,
    algorithm: string,
    curve: 'secp256k1' | 'P-256'
  ): { id: string; publicKeyBuffer: Buffer }[] | undefined {
    const keys = doc.assertionMethod.filter(
      (ka: { crv: string; publicKeyJwk: any; type: string }) =>
        ka.type === algorithm &&
        ka.publicKeyJwk &&
        ka.publicKeyJwk.crv === curve
    );
    if (!keys || keys.length === 0) {
      return undefined;
    }
    const processed: { id: string; publicKeyBuffer: Buffer }[] = [];
    for (const key of keys) {
      processed.push({
        id: key.id,
        publicKeyBuffer: Buffer.from(key.publicKeyJwk.x, 'base64url')
      });
    }
    return processed;
  }
}
