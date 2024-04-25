export interface BlockData {
    blockNumber: number;
    blockTimestamp: number;
}

export type UserBalance = {
    address: string,
    pairAddress: string
    tokenAddress: string
    blockNumber: number
    balance: bigint
}

export type UserSupplied = Omit<UserBalance, 'balance'> & {
    supplied: bigint
    pool: string
}

export interface AquaCToken {
    id: string
    totalSupplied: string
    balance: string
    blockNumber: string
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
    aquaCTokens: Array<AquaCToken>
}