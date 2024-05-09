import { UserBalance } from './sdk/types';
import {
  getUserPositionsAtBlock,
} from './sdk/lib';

export const getUserBalanceByBlock = async (blockNumber: number, blockTimestamp: number): Promise<UserBalance[]> => {
  const res: UserBalance[] = await getUserPositionsAtBlock(blockNumber);

  return res.map(item => ({ ...item, block_number: blockNumber, timestamp: blockTimestamp }));
};

// 1406801 // 1715237738
getUserBalanceByBlock(909110, 1714058710).then((result) => {
  console.log('result:', result);
});
