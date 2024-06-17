import {UserTVLData} from './sdk/types';
import {
    getAllBalances,
} from './sdk/lib';

export const getUserTVLData = async (blockNumber: number): Promise<UserTVLData[]> => {
    console.log(`Getting Tvl Data For Block ${blockNumber}`);
    return await getAllBalances(blockNumber)
};

// not tx data for now
// export const getUserTransactionData = async (startBlock: number, endBlock: number): Promise<UserTxData[]> => {
//     console.log(`Getting Tx Data From ${startBlock} to ${endBlock}`);
//     return []
// };
