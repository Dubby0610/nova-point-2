import { UserTVLData } from './sdk/types';
import {
  getAllLidsAtBlock,
  getAmountsForLiquidity,
  getOneSideBoosterByToken,
  getPositionDetailsAtBlock,
  getSteerProtocolVault,
  getTimestampAtBlock,
} from './sdk/lib';
import _ from 'lodash'

const BATCH_SIZE = 50;

const processLid = async (lid: bigint, blockNumber: number, timestamp: number): Promise<[UserTVLData, UserTVLData]> => {
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
  let positionList: UserTVLData[] = []
  console.log(`novaswap process ${lids.length} items`)
  for (let i = 0; i < lids.length; i += BATCH_SIZE) {
    const batch = lids.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (lid) => {
      let success = false;
      while (!success) {
        try {
          const [data0, data1] = await processLid(lid, blockNumber, timestamp);
          positionList = positionList.concat(data0, data1);
          success = true;
        } catch (error) {
          console.error(`Error fetching details for Token ID: ${lid}:`, error);
        }
      }
    });

    await Promise.all(batchPromises);
  }
  return positionList;
};

export const processSteerVault = async (data: UserTVLData[], blockNumber: number) => {
  const steerVaultPosition = await getSteerProtocolVault(blockNumber)
  return _.chain(data.concat(steerVaultPosition))
    .groupBy(item => `${item.userAddress.toLowerCase()}-${item.tokenAddress.toLowerCase()}-${item.poolAddress.toLowerCase()}`)
    .map((items) => ({
      userAddress: items[0].userAddress,
      poolAddress: items[0].poolAddress,
      tokenAddress: items[0].tokenAddress,
      blockNumber: items[0].blockNumber,
      balance: items.reduce((sum, item) => sum + item.balance, BigInt(0)),
      timestamp: items[0].timestamp
    }))
    .value();
}

export const getUserTVLData = async (blockNumber: number): Promise<UserTVLData[]> => {
  const rawNovaSwapPosition = await getUserPositionsAtBlock(blockNumber)
  const res = await processSteerVault(rawNovaSwapPosition, blockNumber)
  return res
};

// getUserTVLData(4519897)

