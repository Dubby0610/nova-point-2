import {UserTVLData, UserTxData} from './sdk/types';
import {
    getAllBalances, getAllTransactions,
} from './sdk/lib';

export const getUserTVLData = async (blockNumber: number): Promise<UserTVLData[]> => {
    console.log(`Getting Tvl Data For Block ${blockNumber}`);
    return await getAllBalances(blockNumber)
};

export const getUserTransactionData = async (lastBlock: number, curBlock: number): Promise<UserTxData[]> => {
    console.log(`Getting Tx Data: lastBlock: ${lastBlock}, curBlock: ${curBlock}`);
    return await getAllTransactions(lastBlock, curBlock);
};
