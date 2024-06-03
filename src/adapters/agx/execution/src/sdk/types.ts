export interface BlockData {
    blockNumber: number;
    blockTimestamp: number;
}

export type UserTVLData = {
    userAddress: string,
    poolAddress: string
    tokenAddress: string
    blockNumber: number
    balance: bigint
    timestamp: number
}

export type UserTxData = {
    timestamp: string
    userAddress: string
    contractAddress: string
    tokenAddress: string
    decimals: string
    price: string
    quantity: string
    txHash: string
    nonce: string
    blockNumber: string
}

export interface Pool {
    id: string
    totalSupplied: string
}

export type UserPositions = Array<{
    id: string,
    balance: string,
}>

export type Swaps = Array<{
    account: string,
    amount: string,
    blockNumber: string,
    decimal: string,
    id: string,
    nonce: string,
    price: string,
    timestamp: string,
    transactionHash: string,
    tokenAddress: string,
}>