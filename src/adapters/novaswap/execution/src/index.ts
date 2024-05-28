import { UserTVLData } from './sdk/types';
import {
  getAllLidsAtBlock,
  getAmountsForLiquidity,
  getOneSideBoosterByToken,
  getPoolState,
  getPositionDetailsAtBlock,
  getTimestampAtBlock,
} from './sdk/lib';


const processLid = async (lid: bigint, blockNumber: number, timestamp: number) => {
  const position = await getPositionDetailsAtBlock(lid, blockNumber);
  const { amount0, amount1 } = await getAmountsForLiquidity(position, blockNumber);

  const data0 = {
    userAddress: position.ownerAddress,
    tokenAddress: position.token0,
    poolAddress: position.poolAddress,
    balance: amount1 !== 0n ? amount0 : amount0 * getOneSideBoosterByToken(position.token0) / 100n,
    blockNumber: blockNumber,
    timestamp: timestamp
  }

  const data1 = {
    userAddress: position.ownerAddress,
    tokenAddress: position.token1,
    poolAddress: position.poolAddress,
    balance: amount0 !== 0n ? amount1 : amount1 * getOneSideBoosterByToken(position.token0) / 100n,
    blockNumber: blockNumber,
    timestamp: timestamp
  }

  return [data0, data1]
}

const getUserPositionsAtBlock = async (blockNumber: number): Promise<any> => {
  const timestamp = await getTimestampAtBlock(blockNumber)
  const lids = await getAllLidsAtBlock(blockNumber)
  const data = []


  for (const lid of lids) {
    let success = false;
    while (!success) {
      try {
        const [data0, data1] = await processLid(lid, blockNumber, timestamp)
        if (data0.balance !== 0n) {
          data.push(data0)
        }

        if (data1.balance !== 0n) {
          data.push(data1)
        }

        success = true;
      } catch (error) {
        console.error(`Error fetching details for Token ID: ${lid}:`, error);
      }
    }
  }

  return data
};

export const getUserTVLData = async (blockNumber: number): Promise<UserTVLData[]> => {
  const res = await getUserPositionsAtBlock(blockNumber)
  return res
};

// getUserTVLData(1978853)


