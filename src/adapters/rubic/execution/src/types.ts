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

export interface RubicTransferStartedsRes {
    data: {
        rubicTransferStarteds: RubicTransferStartedSchema[]
    }
}

export interface RubicTransferStartedSchema {
    bridgeData_sendingAssetId: string;
    bridgeData_destinationChainId: number;
    bridgeData_receiver: string;
    bridgeData_minAmount: string;
    blockNumber: number;
    blockTimestamp: number;
    transactionHash: string;
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