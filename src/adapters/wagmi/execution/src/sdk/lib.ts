import { UserTVLData, UserTxData, SwapResponse, UserV3PositionsResponse, UserV3Position } from "./types";
import { Contract, JsonRpcProvider, parseUnits , ZeroAddress} from "ethers";
import path from "path";
import { fetchGraphQLData } from "./fetch";
import { MULTICALL_ADDRESS, RPC_URL } from "./constants";
import MulticallAbi from './abis/Multicall.json';
import { encodeSlot0, decodeSlot0 } from "./utils/encoder";
import { PositionMath } from "@real-wagmi/v3-sdk";

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const getTimestampAtBlock = async (blockNumber: number) => {
  const provider = new JsonRpcProvider(RPC_URL);
  const block = await provider.getBlock(blockNumber);
  return Number(block?.timestamp);
};

const getAllUserV3Position = async (blockNumber: number) => {
  let result: UserV3Position[] = [];
  let skip = 0;
  const pageSize = 1000;
  let fetchNext = true;

  while (fetchNext) {
    const query = `
      query MyQuery{
        positions(
          block: {number: ${blockNumber}},
          where: { liquidity_not: "0", owner_not: "${ZeroAddress}" },
          first: ${pageSize},
          skip: ${skip},
        ) {
          tickUpper
          tickLower
          owner
          liquidity
          id
          pool {
            id
            token0 {
              decimals
              id
              symbol
            }
            token1 {
              decimals
              id
              symbol
            }
          }
        }
      }`;

    const data = await fetchGraphQLData<UserV3PositionsResponse>(query);

    const { positions } = data;
    const res = positions.map((data) : UserV3Position => {
      return {
        tickUpper: data.tickUpper,
        tickLower: data.tickLower,
        owner: data.owner,
        liquidity: BigInt(data.liquidity),
        id: data.id,
        pool: {
          id: data.pool.id,
          token0: data.pool.token0,
          token1: data.pool.token1,
        },
      };
    });

    result.push(...res);

    if (positions.length < pageSize) {
      fetchNext = false;
    } else {
      console.log(`GET DATA FROM ${skip}`);
      skip += pageSize;
    }
  }

  return result;
};

async function transformUserPositions(posiitons: UserV3Position[], blockNumber: number, timestamp: number): Promise<UserTVLData[]> {
  const provider = new JsonRpcProvider(RPC_URL);
  const multicall = new Contract(MULTICALL_ADDRESS, MulticallAbi, provider);
  
  const poolAddresses = [...new Set(posiitons.map((position) => position.pool.id))];
  const [,slot0Calls] = await multicall.multicall.staticCall(poolAddresses.map((address) => ({target: address, gasLimit: 100_000n, callData: encodeSlot0()}), { blockTag: blockNumber }));
  const pools = poolAddresses.reduce((acc, address, index) => {
    const slot0Result = slot0Calls[index];
    if(slot0Result.success) {
      const [sqrtRatioX96, tickCurrent] = decodeSlot0(slot0Result.returnData);
      acc[address] = {
        tickCurrent: Number(tickCurrent),
        sqrtRatioX96: BigInt(sqrtRatioX96),
      }
    }
    return acc;
  }, {} as Record<string, { tickCurrent: number, sqrtRatioX96: bigint,  }>);
  

  return posiitons.reduce((acc, position) => {
    const pool = pools[position.pool.id];
    if(pool) {
      const amount0 = PositionMath.getToken0Amount(pool.tickCurrent, position.tickLower, position.tickUpper, pool.sqrtRatioX96, position.liquidity);
      const amount1 = PositionMath.getToken1Amount(pool.tickCurrent, position.tickLower, position.tickUpper, pool.sqrtRatioX96, position.liquidity);
      if(amount0 > 0){
        acc.push({
          userAddress: position.owner,
          poolAddress: position.pool.id,
          tokenAddress: position.pool.token0.id,
          blockNumber,
          balance: amount0,
          timestamp,
        });
      }
      if(amount1 > 0){
        acc.push({
          userAddress: position.owner,
          poolAddress: position.pool.id,
          tokenAddress: position.pool.token1.id,
          blockNumber,
          balance: amount1,
          timestamp,
        });
      }   
    }
    return acc;
  }, [] as UserTVLData[]);
}

export const getUserPositionsAtBlock = async (blockNumber: number): Promise<UserTVLData[]> => {
  const timestamp = await getTimestampAtBlock(blockNumber);
  console.log(`GET DATA FROM ${blockNumber} AT ${timestamp}`);
  const v3PositionsRow = await getAllUserV3Position(blockNumber);
  const v3Positions = await transformUserPositions(v3PositionsRow, blockNumber, timestamp);
  return v3Positions;
};

const getAllUserSwaps = async (startBlock: number, endBlock: number) => {
  console.log(`GET DATA FROM ${startBlock} TO ${endBlock}`);
  let result: UserTxData[] = [];
  let skip = 0;
  const pageSize = 1000;
  let fetchNext = true;

  while (fetchNext) {
    const query = `
      query MyQuery {
        swaps(where: { blockNumber_gte: ${startBlock}, blockNumber_lte: ${endBlock} }, first: ${pageSize}, skip: ${skip}) {
          amount0
          amount1
          id
          origin
          price0
          price1
          logIndex
          blockNumber
          token0 {
            id
            symbol
            decimals
          }
          token1 {
            id
            symbol
            decimals
          }
          timestamp
          pool {
            id
          }      
        }
      }`;

    const data = await fetchGraphQLData<SwapResponse>(query);

    const { swaps } = data;
    const res = swaps.map((data) : UserTxData => {
      const isToken0 = parseFloat(data.amount0) < 0;
      const baseToken = isToken0 ? data.token0 : data.token1;
      return {
        timestamp: parseInt(data.timestamp),
        userAddress: data.origin,
        contractAddress: data.pool.id,
        tokenAddress: baseToken.id,
        decimals: baseToken.decimals,
        price: isToken0 ? parseFloat(data.price0) : parseFloat(data.price1),
        quantity: parseUnits(isToken0 ? data.amount0 : data.amount1, baseToken.decimals) * -1n,
        txHash: data.id.split("#")[0],
        nonce: data.logIndex,
        blockNumber: parseInt(data.blockNumber),
        symbol: baseToken.symbol,
      };
    });

    result.push(...res);

    if (swaps.length < pageSize) {
      fetchNext = false;
    } else {
      console.log(`GET DATA FROM ${skip}`);
      skip += pageSize;
    }
  }

  return result;
};

export const getUserTransactionsData = async (startBlock: number, endBlock: number): Promise<UserTxData[]> => {
  const [fromBlock, toBlock] =  startBlock > endBlock ? [endBlock, startBlock] : [startBlock, endBlock];
  return getAllUserSwaps(fromBlock, toBlock);
}