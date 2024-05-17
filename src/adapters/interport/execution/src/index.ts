import { UserTVLData } from './sdk/types';
import {
  getUserPositionsAtBlock,
} from './sdk/lib';

export const getUserTVLData = async (blockNumber: number): Promise<UserTVLData[]> => {
  const res: UserTVLData[] = await getUserPositionsAtBlock(blockNumber);

  return res.map(item => ({ ...item, blockNumber: blockNumber }));
};
