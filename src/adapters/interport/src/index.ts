import { UserBalance } from './sdk/types';
import {
  getUserPositionsAtBlock,
} from './sdk/lib';

export const getUserBalanceByBlock = async (blockNumber: number, blockTimestamp: number): Promise<UserBalance[]> => {
  const res: UserBalance[] = await getUserPositionsAtBlock(blockNumber);

  return res.map(item => ({ ...item, block_number: blockNumber, timestamp: blockTimestamp }));
};
