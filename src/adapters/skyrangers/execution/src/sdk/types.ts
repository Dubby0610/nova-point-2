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
    timestamp: number
    userAddress: string
    contractAddress: string
    tokenAddress: string
    decimals: number
    price: number
    quantity: bigint
    txHash: string
    nonce: string
    blockNumber: number
}

export type UserSupplied = Omit<UserTVLData, 'balance' | 'timestamp'> & {
    supplied: bigint
    pool: string
}

export interface Pool {
    id: string
    totalSupplied: string
    balance: string
    blockNumber: string
}

export type Response = {
    userPositions: Array<{
        id: string,
        balance: string,
        positions: Array<{
            id: string;
            pool: string;
            poolName: string;
            token: string;
            supplied: string;
        }>
    }>
    pools: Array<Pool>
}