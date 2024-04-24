export interface BlockData {
    blockNumber: number;
    blockTimestamp: number;
}

export type UserBalance = {
    address: string,
    pairAddress: string
    tokenAddress: string
    blockNumber: number
    balance: BigInt
}

export type UserPositions = {
    userPositions: Array<{
        id: string,
        positions: Array<{
            balance: string;
            blockNumber: string;
            decimal: string;
            id: string;
            pool: string;
            token: string;
            transactionHash: string;
        }>
    }>
}