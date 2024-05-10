import { UserBalance } from './sdk/types';
import {
  getUserPositionsAtBlock,
} from './sdk/lib';

export const getUserTVLData = async (blockNumber: number): Promise<UserBalance[]> => {
  const res = await getUserPositionsAtBlock(blockNumber)
  return res
};

export const getUserTransactionData = async (startBlock: number, endBlock: number): Promise<UserBalance[]> => {
  console.log(`Get Tx Data From ${startBlock} to ${endBlock}`);
  return []
};

// getUserTVLData(654577)

