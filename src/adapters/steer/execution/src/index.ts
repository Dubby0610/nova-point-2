import { UserTVLData } from './sdk/types';
import {
  getSteerProtocolVault,
} from './sdk/lib';
import _ from 'lodash'

export const processSteerVault = async (blockNumber: number) => {
  const steerVaultPosition = await getSteerProtocolVault(blockNumber)
  return _.chain(steerVaultPosition)
    .groupBy(item => `${item.userAddress.toLowerCase()}-${item.tokenAddress.toLowerCase()}-${item.poolAddress.toLowerCase()}`)
    .map((items) => ({
      userAddress: items[0].userAddress,
      poolAddress: items[0].poolAddress,
      tokenAddress: items[0].tokenAddress,
      blockNumber: items[0].blockNumber,
      balance: items.reduce((sum, item) => sum + item.balance, BigInt(0)),
      timestamp: items[0].timestamp
    }))
    .value().filter(i => i.balance > 0n);
}

export const getUserTVLData = async (blockNumber: number): Promise<UserTVLData[]> => {
  const res = await processSteerVault(blockNumber)
  return res
};

// getUserTVLData(4519897)

