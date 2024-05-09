export type Address = string;

export type UserBalance = {
    userAddress: Address;
    tokenAddress: Address;
    poolAddress: Address;
    balance: bigint;
    block_number: number;
    timestamp: number;
}

export type StakeData = {
    id: string;
    user: Address;
    pid: string;
    amount: string;
    timestamp: string;
    blocknumber: string;
}

export type UserStakes = {
    userStakes: StakeData[];
}

export type Response = {
    data: UserStakes;
}

export type Call = {
    target: string;
    callData: string;
};

export type MulticallResult = {
    success: boolean;
    returnData: string;
};
