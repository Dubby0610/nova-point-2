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
  const details = await getPositionDetailsAtBlock(lid, blockNumber);
  const sqrtPriceX96 = await getPoolState(details.poolAddress, blockNumber)
  const sqrtPriceLowerX96 = BigInt(Math.floor(Math.sqrt(1.0001 ** Number(details.tickLower)) * (2 ** 96)));
  const sqrtPriceUpperX96 = BigInt(Math.floor(Math.sqrt(1.0001 ** Number(details.tickUpper)) * (2 ** 96)));

  const { amount0, amount1 } = getAmountsForLiquidity(
    BigInt(details.liquidity),
    BigInt(sqrtPriceX96),
    sqrtPriceLowerX96,
    sqrtPriceUpperX96
  );

  const data0 = {
    userAddress: details.ownerAddress,
    tokenAddress: details.token0,
    poolAddress: details.poolAddress,
    balance: amount1 !== 0n ? amount0 : amount0 * getOneSideBoosterByToken(details.token0) / 100n,
    blockNumber: blockNumber,
    timestamp: timestamp
  }

  const data1 = {
    userAddress: details.ownerAddress,
    tokenAddress: details.token1,
    poolAddress: details.poolAddress,
    balance: amount0 !== 0n ? amount1 : amount1 * getOneSideBoosterByToken(details.token0) / 100n,
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


