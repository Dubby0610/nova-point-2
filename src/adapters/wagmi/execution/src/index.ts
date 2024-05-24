import { UserTVLData, UserTxData } from './sdk/types';
import {
  getUserPositionsAtBlock,
  getUserTransactionsData
} from './sdk/lib';

export const getUserTVLData = async (blockNumber: number): Promise<UserTVLData[]> => {
  return getUserPositionsAtBlock(blockNumber);
};

export const getUserTransactionData = (startBlock: number, endBlock: number): Promise<UserTxData[]> => {
  return getUserTransactionsData(startBlock, endBlock);
};

