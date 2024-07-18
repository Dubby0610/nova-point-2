import { UserTVLData } from './sdk/types';
import {
  getAllLidsAtBlock,
  getAmountsForLiquidity,
  getOneSideBoosterByToken,
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
  const tvlMap = new Map()
  console.log(`novaswap process ${lids.length} items`)
  for (const lid of lids) {
    let success = false;
    while (!success) {
      try {
        const [data0, data1] = await processLid(lid, blockNumber, timestamp)
        if (data0.balance !== 0n) {
          const uniqueKey = `${data0.userAddress}_${data0.tokenAddress}_${data0.poolAddress}`
          if (!tvlMap.get(uniqueKey)) {
            tvlMap.set(uniqueKey, data0)
          } else {
            const data = tvlMap.get(uniqueKey)
            data.balance = data.balance + data0.balance
          }
        }

        if (data1.balance !== 0n) {
          const uniqueKey = `${data1.userAddress}_${data1.tokenAddress}_${data1.poolAddress}`
          if (!tvlMap.get(uniqueKey)) {
            tvlMap.set(uniqueKey, data1)
          } else {
            const data = tvlMap.get(uniqueKey)
            data.balance = data.balance + data1.balance
          }
        }

        success = true;
      } catch (error) {
        console.error(`Error fetching details for Token ID: ${lid}:`, error);
      }
    }
  }

  return Array.from(tvlMap.values())
};

export const getUserTVLData = async (blockNumber: number): Promise<UserTVLData[]> => {
  const res = await getUserPositionsAtBlock(blockNumber)
  return res
};

// getUserTVLData(4199092)


