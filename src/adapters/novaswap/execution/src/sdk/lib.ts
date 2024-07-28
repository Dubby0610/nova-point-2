import { ethers, JsonRpcProvider } from "ethers";
import positionManagerABI from '../abi/nonfungiblePositionManager.json'
import poolFactoryABI from '../abi/poolFactory.json'
import poolABI from '../abi/pool.json'
import gasVault from '../abi/gasVault.json'
import { PositionMath } from "../utils/positionMath";
import { fetchGraphQLData } from "./fetch";
import { UserTVLData } from "./types";

const provider = new JsonRpcProvider("https://rpc.zklink.io");
const positionManagerAddress = '0xcd81E4B6D1Ac4C2C3647eA3F91AAd22Af86A4E26';
const poolFactoryAddress = '0x9f94c91b178F5bc9fCcA3e5428b09A3d01CE5AC6';
const steerGapVaultAddress = '0x57174e55abFaa7d858F8a4C395967FFaF990190A';
const poolFactoryContract = new ethers.Contract(poolFactoryAddress, poolFactoryABI, provider);
const positionManager = new ethers.Contract(positionManagerAddress, positionManagerABI, provider);
const steerGasVault = new ethers.Contract(steerGapVaultAddress, gasVault, provider);

export const BATCH_SIZE = 50;

export const getAllLidsAtBlock = async (blockNumber: number): Promise<bigint[]> => {
  const totalSupply = await positionManager.totalSupply({ blockTag: blockNumber });
  const lids = [];

  for (let start = 0; start < Number(totalSupply); start += BATCH_SIZE) {
    const batchPromises = [];

    for (let i = start; i < Math.min(start + BATCH_SIZE, Number(totalSupply)); i++) {
      batchPromises.push(positionManager.tokenByIndex(i, { blockTag: blockNumber }));
    }

    const batchResults = await Promise.all(batchPromises);

    lids.push(...batchResults);
  }

  return lids;
}

export const getPositionDetailsAtBlock = async (tokenId: bigint, blockNumber: number) => {
  const ownerAddress = await positionManager.ownerOf(tokenId, { blockTag: blockNumber });
  const position = await positionManager.positions(tokenId, { blockTag: blockNumber });
  const token0 = position.token0;
  const token1 = position.token1;
  const fee = position.fee;
  const tickLower = position.tickLower;
  const tickUpper = position.tickUpper;
  const liquidity = position.liquidity;
  const tokensOwed0 = position.tokensOwed0;
  const tokensOwed1 = position.tokensOwed1;
  const poolAddress = await poolFactoryContract.getPool(token0, token1, fee, { blockTag: blockNumber });

  return { tokenId, ownerAddress, liquidity, token0, token1, tickLower, tickUpper, tokensOwed0, tokensOwed1, poolAddress };
}

const getPoolState = async (poolAddress: string, blockTag: number): Promise<{ sqrtPriceX96: bigint, tick: bigint }> => {
  const pool = new ethers.Contract(poolAddress, poolABI, provider);
  const poolState = await pool.slot0({ blockTag });
  return poolState
}

export const getAmountsForLiquidity = async (position: Awaited<ReturnType<typeof getPositionDetailsAtBlock>>, blockNumber: number) => {
  const { sqrtPriceX96, tick } = await getPoolState(position.poolAddress, blockNumber)
  const { tickLower, tickUpper, liquidity } = position

  let amount0 = PositionMath.getToken0Amount(Number(tick), Number(tickLower), Number(tickUpper), sqrtPriceX96, liquidity);
  let amount1 = PositionMath.getToken1Amount(Number(tick), Number(tickLower), Number(tickUpper), sqrtPriceX96, liquidity);

  return { amount0, amount1 };
}

export const getTimestampAtBlock = async (blockNumber: number) => {
  const block = await provider.getBlock(blockNumber);
  return Number(block?.timestamp);
};

export const getOneSideBoosterByToken = (token: string) => {
  const boosterMap: { [key: string]: bigint } = {
    "0x8280a4e7D5B3B658ec4580d3Bc30f5e50454F169": 25n,
    "0xDa4AaEd3A53962c83B35697Cd138cc6df43aF71f": 25n,
    "0x2F8A25ac62179B31D62D7F80884AE57464699059": 25n,
    "0x1a1A3b2ff016332e866787B311fcB63928464509": 25n,
    "0xC967dabf591B1f4B86CFc74996EAD065867aF19E": 25n // ZKL
  }
  return boosterMap[token] ?? 10n
}

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

  const allVaults = await Promise.all(data.depositors.map(
    i => steerGasVault.gasAvailableForTransaction(i.vault.pool, { blockTag: blockNumber })
      .then(() => i.vault.pool)
      .catch(error => { console.log(error) })
  ))

  const res = data.depositors.filter(item => allVaults.includes(item.vault.pool)).map(depositData => {
    const { account, shares, vault } = depositData
    const { pool, token0, token1, totalAmount0, totalAmount1, totalLPTokensIssued } = vault
    const data0 = {
      userAddress: account,
      poolAddress: pool,
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