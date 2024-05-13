import { UserTVLData, UserTxData } from './sdk/types';
import {
  getUserPositionsAtBlock,
} from './sdk/lib';

export const getUserTVLData = async (blockNumber: number): Promise<UserTVLData[]> => {
  const res = await getUserPositionsAtBlock(blockNumber)
  return res
};

export const getUserTransactionData = async (startBlock: number, endBlock: number): Promise<UserTxData[]> => {
  console.log(`Get Tx Data From ${startBlock} to ${endBlock}`);
  return [{
    timestamp: 1715410000,
    userAddress: '0x7Ac6d25FD5E437cB7c57Aee77aC2d0A6Cb85936C',
    contractAddress: "0xE8a8f1D76625B03b787F6ED17bD746e0515F3aEf",
    tokenAddress: '0x8280a4e7D5B3B658ec4580d3Bc30f5e50454F169',
    decimals: 18,
    price: 3200.6,
    quantity: 120000000000000000n,
    txHash: '0x8dde0e5cec00361984dbab3780af0372fe39930da1337709ebada69f63996170',
    nonce: '1'
  }]
};

// getUserTVLData(654577)

