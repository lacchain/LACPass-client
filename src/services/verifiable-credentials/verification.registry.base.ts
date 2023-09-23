// eslint-disable-next-line max-len
import { VERIFICATION_REGISTRY_ABI } from '../../constants/lacchain/verification.registry.abi';
import { log4TSProvider } from '../../config';
import { LacchainLib } from '@services/lacchain-ethers';
import { Signature, Wallet, ethers } from 'ethers';
import { Interface } from 'ethers/lib/utils';
import {
  IEthereumTransactionResponse,
  INoSpecifiedSenderTransaction,
  ITransaction
} from 'src/interfaces/ethereum/transaction';
import { Service } from 'typedi';
import { GasModelProvider, GasModelSigner } from '@lacchain/gas-model-provider';

@Service()
export class VerificationRegistryBase {
  private readonly lacchainLib: LacchainLib;
  log = log4TSProvider.getLogger('VerificationRegistryBaseInterface');
  private verificationRegistryAddress: string;
  private abstractContractInterface: ethers.Contract;
  constructor(
    verificationRegistryAddress: string,
    rpcUrl: string,
    nodeAddress: string
  ) {
    this.lacchainLib = new LacchainLib(nodeAddress, rpcUrl);
    this.verificationRegistryAddress = verificationRegistryAddress;
    const key = Wallet.createRandom().privateKey;
    const provider = this.configureProvider(rpcUrl, key, nodeAddress);
    this.abstractContractInterface = new ethers.Contract(
      this.verificationRegistryAddress,
      VERIFICATION_REGISTRY_ABI,
      provider
    );
  }
  async getDidRegistry(identity: string): Promise<string> {
    return this.abstractContractInterface.getDidRegistry(identity);
  }
  async setDidRegistry(
    from: string,
    didRegistryAddress: string
  ): Promise<IEthereumTransactionResponse> {
    const methodName = 'addDidRegistry';
    const methodSignature = [
      `function ${methodName}(address didRegistryAddress)`
    ];
    const methodInterface = new Interface(methodSignature);
    const encodedData = methodInterface.encodeFunctionData(methodName, [
      didRegistryAddress
    ]);
    const tx: ITransaction = {
      from,
      to: this.verificationRegistryAddress,
      data: encodedData
    };
    return this.lacchainLib.signAndSend(tx);
  }
  async issueSigned(
    digest: string,
    exp: number,
    issuerAddress: string,
    sig: Signature
  ): Promise<IEthereumTransactionResponse> {
    const methodName = 'issueSigned';
    const methodSignature = [
      `function ${methodName}(bytes32 digest, uint256 exp,
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS) external`
    ];
    const methodInterface = new Interface(methodSignature);
    const encodedData = methodInterface.encodeFunctionData(methodName, [
      digest,
      exp,
      issuerAddress,
      sig.v,
      sig.r,
      sig.s
    ]);
    const tx: INoSpecifiedSenderTransaction = {
      to: this.verificationRegistryAddress,
      data: encodedData
    };
    return this.lacchainLib.signRandomlyAndSend(tx);
  }
  private configureProvider(
    rpcUrl: string,
    privateKey: string,
    nodeAddress: string,
    expiration = Math.floor(Date.now() / 1000) + 86400 * 1080
  ): GasModelSigner {
    const provider = new GasModelProvider(rpcUrl);
    return new GasModelSigner(privateKey, provider, nodeAddress, expiration);
  }
}
