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
    symbol?: string
}

type TokenInfo = {
    id: string;
    symbol: string;
    decimals: number;
}

export type SwapResponse = {
    swaps: Array<{
        id: string
        amount0: string
        amount1: string
        origin: string
        price0: string;
        price1: string;
        logIndex: string;
        blockNumber: string;
        token0: TokenInfo;
        token1: TokenInfo;
        timestamp: string;
        pool: {
            id: string;
        }
    }>
}

export type UserV3PositionsResponse = {
    positions: Array<{
        tickUpper: number;
        tickLower: number;
        owner: string;
        liquidity: string;
        id: string;
        pool: {
            id: string;
            token0: TokenInfo;
            token1: TokenInfo;
        }
    }>
}

export type UserV3Position = {
    tickUpper: number;
    tickLower: number;
    owner: string;
    liquidity: bigint;
    id: string;
    pool: {
        id: string;
        token0: TokenInfo;
        token1: TokenInfo;
    }
}

export type UserMultipoolPosition = {
    owner: string;
    balance: bigint;
    multipool: {
        id: string;
        token0: TokenInfo;
        token1: TokenInfo;
        pidId: bigint;
    }
}

export type UserMultipoolPositionsResponse = {
    multipoolPositions: Array<{
        owner: string;
        balance: string;
        staked: string;
        multipool: {
            id: string;
            token0: TokenInfo;
            token1: TokenInfo;
            pidId: string;
        }
    }>
}