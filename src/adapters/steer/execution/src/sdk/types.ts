

export type UserTVLData = {
    userAddress: string,
    poolAddress: string
    tokenAddress: string
    blockNumber: number
    balance: bigint
    timestamp: number
}


export type Response = {
    depositors: Array<{
        id: string,
        account: string,
        shares: string,
        updatedTimestamp: string,
        depositCaller: string,
        createdTimestamp: string,
        vault: {
            id: string,
            pool: string,
            token0: string,
            token1: string,
            totalLPTokensIssued: string,
            totalAmount0: string,
            totalAmount1: string,
            totalValueLockedToken0: string,
            totalValueLockedToken1: string
        }
    }>
}