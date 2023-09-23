import {
  arrayify,
  defaultAbiCoder,
  keccak256,
  solidityPack,
  splitSignature,
  toUtf8Bytes
} from 'ethers/lib/utils';
import {
  CHAIN_ID,
  log4TSProvider,
  resolveVerificationRegistryContractAddress
} from '../../config';
import { Service } from 'typedi';
import { ISignPlainMessageByAddress } from 'lacchain-key-manager';
import { DidServiceLac1 } from '../external/did-lac/did-service';
import { KeyManagerService } from '../external/key-manager/key-manager.service';
import { BadRequestError } from 'routing-controllers';
import { ErrorsMessages } from '../../constants/errorMessages';
import { VerificationRegistryBase } from './verification.registry.base';
import { getNodeAddress, getRpcUrl } from 'lacchain-trust/dist/src/config';
import { IEthereumTransactionResponse } from 'src/interfaces/ethereum/transaction';

@Service()
export class VerificationRegistry {
  log = log4TSProvider.getLogger('VerificationRegistryService');
  private EIP712ContractName = 'VerificationRegistry';
  private chainId = CHAIN_ID;
  private verificationRegistryAddress: string;
  private TYPE_HASH = keccak256(
    toUtf8Bytes(
      // eslint-disable-next-line max-len
      'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
    )
  );
  private inMemoryDidRegistriesInVerificationRegistry: Map<string, string> =
    new Map<string, string>();
  private _hashedName;
  private _hashedVersion = keccak256(toUtf8Bytes('1'));
  private domainSeparator: string;
  private ISSUE_TYPEHASH: string;
  private didServiceLac1: DidServiceLac1;
  private keyManager: KeyManagerService;
  private verificationRegistryBase: VerificationRegistryBase;

  constructor() {
    this.verificationRegistryAddress =
      resolveVerificationRegistryContractAddress();
    this._hashedName = keccak256(toUtf8Bytes(this.EIP712ContractName));
    const eds = defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        this.TYPE_HASH,
        this._hashedName,
        this._hashedVersion,
        this.chainId,
        this.verificationRegistryAddress
      ]
    );
    this.domainSeparator = keccak256(eds);
    this.ISSUE_TYPEHASH = keccak256(
      toUtf8Bytes('Issue(bytes32 digest, uint256 exp, address identity)')
    ); // OK -> 0xaaf414ba23a8cfcf004a7f75188441e59666f98d85447b5665cf04052d8e2bc3
    this.didServiceLac1 = new DidServiceLac1();
    this.keyManager = new KeyManagerService();
    const rpcUrl = getRpcUrl();
    const nodeAddress = getNodeAddress();
    this.verificationRegistryBase = new VerificationRegistryBase(
      this.verificationRegistryAddress,
      rpcUrl,
      nodeAddress
    );
    this.chainId = CHAIN_ID;
  }

  async verifyAndIssueSigned(
    issuerDid: string,
    digest: string,
    exp: number
  ): Promise<IEthereumTransactionResponse> {
    // decode did and get main address and controller address
    // TODO: check didRegistry is in the same chain as configured in the service
    const { address, didRegistryAddress, chainId } =
      await this.didServiceLac1.decodeDid(issuerDid);
    // since transaction is being sent via signed, the controller must
    // be verified in the did registry
    // so decoded didRegistry MUST be in the same chain as configured on start up
    if (chainId !== this.chainId) {
      throw new BadRequestError(ErrorsMessages.CHAIN_ID_FROM_DID_NOT_SUPPORTED);
    }
    // make sure didRegistry is set otherwise set it up
    // TODO: add in memory map
    if (
      this.inMemoryDidRegistriesInVerificationRegistry.get(issuerDid) !==
      didRegistryAddress
    ) {
      const retrievedVerificationRegistry =
        await this.verificationRegistryBase.getDidRegistry(address);
      if (retrievedVerificationRegistry == didRegistryAddress) {
        this.log.info(
          'DidRegistry in memory set (issuerDid) => (didRegistry): ',
          issuerDid,
          ' =>',
          didRegistryAddress
        );
        this.inMemoryDidRegistriesInVerificationRegistry.set(
          issuerDid,
          didRegistryAddress
        );
      } else {
        const txResponse = await this.verificationRegistryBase.setDidRegistry(
          address,
          didRegistryAddress
        );
        this.log.info(
          'did registry set for did: ',
          issuerDid,
          'in verification registry:',
          didRegistryAddress,
          'txHash',
          txResponse.txHash
        );
      }
    }
    return this.issueSigned(issuerDid, digest, exp);
  }

  /**
   *
   * @param {string} issuerDid
   * @param {string} digest
   * @param {string} exp - unix timestamp number indicating the time in the
   * future where the attestation will be considered invalid. If zero, the
   * attestation won't expire
   */
  async issueSigned(
    issuerDid: string,
    digest: string,
    exp: number
  ): Promise<IEthereumTransactionResponse> {
    // decode did and get main address and controller address
    // TODO: check didRegistry is in the same chain as configured in the service
    const { address } = await this.didServiceLac1.decodeDid(issuerDid);
    // make sure didRegistry is set otherwise set it up

    const controllerAddressResponse = await this.didServiceLac1.getController(
      issuerDid
    );

    const { typeDataHash } = this.getTypedDataHashForIssue(
      address,
      digest,
      exp
    );

    const messageRequest: ISignPlainMessageByAddress = {
      address: controllerAddressResponse.controller,
      messageHash: typeDataHash
    };
    try {
      const { signature } = await this.keyManager.secpSignPlainMessage(
        messageRequest
      );
      const sig = splitSignature(signature);
      return this.verificationRegistryBase.issueSigned(
        digest,
        exp,
        address,
        sig
      );
    } catch (e: any) {
      if (e) {
        this.log.info(
          // eslint-disable-next-line max-len
          'There was an error while trying to sign the message for issuance in verification registry',
          e
        );
      }
      throw new BadRequestError(ErrorsMessages.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   *
   * @param {string} issuerAddress
   * @param {string} digest - hex string of 32 bytes
   * @param {number} exp - unix timestamp number indicating the time in the
   * future where the attestation will be considered invalid. If zero, the
   * attestation won't expire
   * @return { { typeDataHash: string, digest: string, exp: number } }
   */
  getTypedDataHashForIssue(
    issuerAddress: string,
    digest: string,
    exp: number
  ): { typeDataHash: string; digest: string; exp: number } {
    // 1. Build struct data hash
    const encodedMessage = defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'uint256', 'address'],
      [this.ISSUE_TYPEHASH, digest, exp, issuerAddress]
    );
    const structHash = keccak256(arrayify(encodedMessage));

    // 2.2 Build type data hash
    // Inputs: structHash and domainSeparator
    const typeData = solidityPack(
      // pack with no padding
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [0x19, 0x01, this.domainSeparator, structHash]
    );
    const typeDataHash = keccak256(typeData);
    return { typeDataHash, exp, digest };
  }
}
