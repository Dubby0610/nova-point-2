export type UserTVLData = {
    timestamp: number
    blockNumber: number
    userAddress: string
    tokenAddress: string
    poolAddress: string
    balance: bigint
    symbol: string
}

export type UserTxData = {
    timestamp: number
    userAddress: string
    contractAddress: string
    tokenAddress: string
    decimals: number
    price: number
    quantity: bigint
    txHash: string
    nonce: string
    symbol: string
    blockNumber: number
}