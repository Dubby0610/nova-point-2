import { UserBalance } from './sdk/types';
import {
  getUserPositionsAtBlock,
} from './sdk/lib';

export const getUserTVLData = async (blockNumber: number): Promise<UserBalance[]> => {
  const res = await getUserPositionsAtBlock(blockNumber)
  return res

};

