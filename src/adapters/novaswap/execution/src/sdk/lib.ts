import { ethers, JsonRpcProvider } from "ethers";
import positionManagerABI from '../abi/nonfungiblePositionManager.json'
import poolFactoryABI from '../abi/poolFactory.json'
import poolABI from '../abi/pool.json'
import { PositionMath } from "../utils/positionMath";

const provider = new JsonRpcProvider("https://rpc.zklink.io");
const positionManagerAddress = '0xcd81E4B6D1Ac4C2C3647eA3F91AAd22Af86A4E26';
const poolFactoryAddress = '0x9f94c91b178F5bc9fCcA3e5428b09A3d01CE5AC6';
const poolFactoryContract = new ethers.Contract(poolFactoryAddress, poolFactoryABI, provider);
const positionManager = new ethers.Contract(positionManagerAddress, positionManagerABI, provider);

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

