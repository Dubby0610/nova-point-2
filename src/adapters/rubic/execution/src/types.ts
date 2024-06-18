export type UserTxData = {
    timestamp: number
    userAddress: string
    contractAddress: string
    tokenAddress: string
    decimals: number
    quantity: bigint
    txHash: string
    nonce: string
    blockNumber: number
}

export interface RubicSwappedGenericsRes {
    data:{
        rubicSwappedGenerics: RubicSwappedGenericSchema[]
    }
}

export interface RubicSwappedGenericSchema {
    fromAssetId: string;
    fromAmount: string;
    transactionHash: string;
    blockNumber: number;
    blockTimestamp: number;
}


export interface PageWithTrsanctionsInChain {
    "count": number,
    "next": number | null,
    "previous": number | null,
    "results": TransactionFromBackend[]
}
export interface TransactionFromBackend {
    "sourceChainBlockNumber": number;
    "contractAddress": string;
    "tokenDecimals": number;
    "nonce": number;
    "quantity": number;
    "timestamp": number;
    "tokenAddress": string;
    "sourceTxHash": string;
    "userAddress": string;
    "tokenSymbol": string;
  }