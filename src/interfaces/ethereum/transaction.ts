export interface INoSpecifiedSenderTransaction {
  to: string;
  data: string;
}

export interface IEthereumTransactionResponse {
  txHash: string;
}

export interface ITransaction {
  from: string;
  to: string;
  data: string;
}
