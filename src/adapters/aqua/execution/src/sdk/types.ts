export interface BlockData {
    blockNumber: number;
    blockTimestamp: number;
}

export type UserBalance = {
    userAddress: string,
    tokenAddress: string
    poolAddress: string
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
}

export type Response = {
    userPositions: Array<{
        id: string,
        positions: Array<{
            supplied: string;
            blockNumber: string;
            decimal: string;
            id: string;
            pool: string;
            token: string;
            transactionHash: string;
        }>
    }>
    pools: Array<Pool>
}