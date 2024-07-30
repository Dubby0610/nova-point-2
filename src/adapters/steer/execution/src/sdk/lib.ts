import { ethers, JsonRpcProvider } from "ethers";
import gasVault from '../abi/gasVault.json'
import { fetchGraphQLData } from "./fetch";
import { UserTVLData } from "./types";

const provider = new JsonRpcProvider("https://rpc.zklink.io");
const steerGapVaultAddress = '0x57174e55abFaa7d858F8a4C395967FFaF990190A';
const steerGasVault = new ethers.Contract(steerGapVaultAddress, gasVault, provider);

export const BATCH_SIZE = 50;

export const getTimestampAtBlock = async (blockNumber: number) => {
  const block = await provider.getBlock(blockNumber);
  return Number(block?.timestamp);
};

export const getSteerProtocolVault = async (blockNumber: number): Promise<UserTVLData[]> => {
  const timestamp = await getTimestampAtBlock(blockNumber)
  const query = `
    query MyQuery {
      depositors(block: {number: ${blockNumber}}, where: {shares_gt: "0"}) {
      account
      shares
      updatedTimestamp
      depositCaller
      createdTimestamp
      vault {
        id
        pool
        token0
        token1
        totalLPTokensIssued
        totalAmount0
        totalAmount1
        totalValueLockedToken0
        totalValueLockedToken1  
      }
    }
  }
  `
  const data = await fetchGraphQLData('https://api.goldsky.com/api/public/project_clohj3ta78ok12nzs5m8yag0b/subgraphs/steer-protocol-zklink-nova/1.0.1/gn', query);

  const allVaults = await Promise.all(
    Array.from(new Set(data.depositors.map(i => i.vault.id)))
      .map(vault => steerGasVault.gasAvailableForTransaction(vault, { blockTag: blockNumber })
        .then(() => vault)
        .catch(error => { console.log(vault, error) })
      ))

  const res = data.depositors.filter(item => allVaults.includes(item.vault.id)).map(depositData => {
    const { account, shares, vault } = depositData
    const { id, pool, token0, token1, totalAmount0, totalAmount1, totalLPTokensIssued } = vault
    const data0 = {
      userAddress: account,
      poolAddress: id,
      tokenAddress: token0,
      blockNumber: blockNumber,
      balance: BigInt(totalAmount0) > 0 ? BigInt(shares) * BigInt(totalAmount0) / BigInt(totalLPTokensIssued) : BigInt(0),
      timestamp: timestamp,
    }
    const data1 = {
      userAddress: account,
      poolAddress: pool,
      tokenAddress: token1,
      blockNumber: blockNumber,
      balance: BigInt(totalAmount1) > 0 ? BigInt(shares) * BigInt(totalAmount1) / BigInt(totalLPTokensIssued) : BigInt(0),
      timestamp: timestamp,
    }
    return [data0, data1]
  }).flat()
  console.log(`Steer Position Length: ${res.length}`)
  return res
}