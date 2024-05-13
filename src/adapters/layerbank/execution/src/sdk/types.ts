export interface BlockData {
    blockNumber: number;
    blockTimestamp: number;
}

export type UserBalance = {
    userAddress: string,
    poolAddress: string
    tokenAddress: string
    blockNumber: number
    balance: bigint
}

export type UserSupplied = Omit<UserBalance, 'balance'> & {
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