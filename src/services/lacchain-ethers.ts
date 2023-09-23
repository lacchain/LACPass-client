import { log4TSProvider } from '../config';
import { GasModelProvider, GasModelSigner } from '@lacchain/gas-model-provider';
import { BigNumber, ethers } from 'ethers';
import { BadRequestError } from 'routing-controllers';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import { ErrorsMessages } from '../constants/errorMessages';
import {
  IEthereumTransactionResponse,
  INoSpecifiedSenderTransaction,
  ITransaction
} from 'src/interfaces/ethereum/transaction';
import { KeyManagerService } from './external/key-manager/key-manager.service';

export class LacchainLib {
  log = log4TSProvider.getLogger('lacchainUtils');
  private nodeAddress: string;
  private readonly provider: ethers.providers.Provider;
  private rpcUrl: string;
  private keyManagerService: KeyManagerService;
  constructor(nodeAddress: string, rpcUrl: string) {
    this.nodeAddress = nodeAddress;
    this.rpcUrl = rpcUrl;
    this.provider = new GasModelProvider(this.rpcUrl);
    this.keyManagerService = new KeyManagerService();
  }
  async signAndSend(tx: ITransaction): Promise<IEthereumTransactionResponse> {
    const voidSigner = new ethers.VoidSigner(tx.from, this.provider);
    // Gas Limit is set to avoid failures
    const fullyPopulatedTransactionRequest =
      await voidSigner.populateTransaction({ ...tx, gasLimit: 4700000 });
    const f = fullyPopulatedTransactionRequest.gasPrice;
    const s = BigNumber.from(f);
    fullyPopulatedTransactionRequest.gasPrice = s.toHexString();
    const signedTx = await this.keyManagerService.signLacchainTransaction({
      fullyPopulatedTransactionRequest,
      signerAddress: tx.from,
      nodeAddress: this.nodeAddress,
      expiration: Math.floor(Date.now() / 1000) + 86400 * 4 // 4 days
    });
    const txResponse = await this.provider.sendTransaction(
      signedTx.signedTransaction
    );
    this.log.info('waiting for transaction response...');
    try {
      await txResponse.wait();
    } catch (err: any) {
      throw new BadRequestError(
        ErrorsMessages.LACCHAIN_CONTRACT_TRANSACTION_ERROR
      );
    }
    this.log.info('Transaction successfully sent, txHash', txResponse.hash);
    return { txHash: txResponse.hash };
  }
  async signRandomlyAndSend(
    tx: INoSpecifiedSenderTransaction
  ): Promise<IEthereumTransactionResponse> {
    const wallet = ethers.Wallet.createRandom();
    const voidSigner = new ethers.VoidSigner(wallet.address, this.provider);
    // Gas Limit is set to avoid failures
    const tx1 = {
      from: wallet.address,
      to: tx.to,
      data: tx.data,
      gasLimit: 4700000
    };
    const fullyPopulatedTransactionRequest =
      await voidSigner.populateTransaction(tx1);
    const f = fullyPopulatedTransactionRequest.gasPrice;
    const s = BigNumber.from(f);
    fullyPopulatedTransactionRequest.gasPrice = s.toHexString();

    const expiration = Math.floor(Date.now() / 1000) + 86400 * 4; // 4 days
    const gasModelWallet = new GasModelSigner(
      wallet.privateKey,
      this.provider,
      this.nodeAddress,
      expiration
    );
    const signedTransaction = await gasModelWallet.signTransaction(
      fullyPopulatedTransactionRequest as TransactionRequest
    );
    const txResponse = await this.provider.sendTransaction(signedTransaction);
    this.log.info('waiting for blockchain response...');
    try {
      await txResponse.wait();
    } catch (err: any) {
      throw new BadRequestError(
        ErrorsMessages.LACCHAIN_CONTRACT_TRANSACTION_ERROR
      );
    }
    this.log.info('Transaction sent, txHash', txResponse.hash);
    return { txHash: txResponse.hash };
  }
}
