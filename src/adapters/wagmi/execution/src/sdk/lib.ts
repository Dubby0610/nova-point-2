import { UserTVLData, UserTxData, SwapResponse, UserV3PositionsResponse, UserV3Position, UserMultipoolPosition, UserMultipoolPositionsResponse } from "./types";
import { Contract, JsonRpcProvider, parseUnits , ZeroAddress } from "ethers";
import path from "path";
import { fetchGraphQLData } from "./fetch";
import { MULTICALL_ADDRESS, RPC_URL } from "./constants";
import MulticallAbi from './abis/Multicall.json';
import { encodeSlot0, decodeSlot0, encodeEstimateWithdrawalAmounts, decodeEstimateWithdrawalAmounts, encodeEstimateClaim, decodeEstimateClaim } from "./utils/encoder";
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

const transformUserPositions = async (positions: UserV3Position[], blockNumber: number, timestamp: number): Promise<UserTVLData[]> => {
  const provider = new JsonRpcProvider(RPC_URL);
  const multicall = new Contract(MULTICALL_ADDRESS, MulticallAbi, provider);
  
  const poolAddresses = [...new Set(positions.map((position) => position.pool.id))];
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

  const balances = positions.reduce((acc, position) => {
    const pool = pools[position.pool.id];
    if(pool) {
      const amount0 = PositionMath.getToken0Amount(pool.tickCurrent, position.tickLower, position.tickUpper, pool.sqrtRatioX96, position.liquidity);
      const amount1 = PositionMath.getToken1Amount(pool.tickCurrent, position.tickLower, position.tickUpper, pool.sqrtRatioX96, position.liquidity);

      if(amount0 > 0){
        const key = `${position.owner}-${position.pool.id}-${position.pool.token0.id}`;
        if(!acc[key]){
          acc[key] = {
            userAddress: position.owner,
            poolAddress: position.pool.id,
            tokenAddress: position.pool.token0.id,
            blockNumber,
            balance: amount0,
            timestamp,
          };
        } else {
          acc[key].balance += amount0;
        }        
      }

      if(amount1 > 0){
        const key = `${position.owner}-${position.pool.id}-${position.pool.token1.id}`;
        if(!acc[key]){
          acc[key] = {
            userAddress: position.owner,
            poolAddress: position.pool.id,
            tokenAddress: position.pool.token1.id,
            blockNumber,
            balance: amount0,
            timestamp,
          };
        } else {
          acc[key].balance += amount0;
        }   
      }   
    }
    return acc;
  }, {} as { [key: string]: UserTVLData });

  return Object.values(balances);
}

const getAllUserMultipoolPositions = async (blockNumber: number) => {
  let result: UserMultipoolPosition[] = [];
  let skip = 0;
  const pageSize = 1000;
  let fetchNext = true;

  while (fetchNext) {
    const query = `
      query MyQuery{
        multipoolPositions(
          block: {number: ${blockNumber}},
          first: ${pageSize},
          skip: ${skip},
        ) {
          balance
          multipool {
            id
            token1 {
              id
              name
              symbol
            }
            token0 {
              name
              id
              symbol
            }
            pidId
          }
          owner
          staked
        }
      }`;

    const data = await fetchGraphQLData<UserMultipoolPositionsResponse>(query);

    const { multipoolPositions } = data;
    const res = multipoolPositions.map((data) : UserMultipoolPosition => {
      return {
        owner: data.owner,
        balance: BigInt(data.balance) + BigInt(data.staked),
        multipool: {
          id: data.multipool.id,
          token0: data.multipool.token0,
          token1: data.multipool.token1,
          pidId: BigInt(data.multipool.pidId),
        },
      };
    });

    result.push(...res);

    if (multipoolPositions.length < pageSize) {
      fetchNext = false;
    } else {
      console.log(`GET DATA FROM ${skip}`);
      skip += pageSize;
    }
  }

  return result;
}

const transformUserMultipoolPositions = async (positions: UserMultipoolPosition[], blockNumber: number, timestamp: number) : Promise<UserTVLData[]> => {
  const provider = new JsonRpcProvider(RPC_URL);
  const multicall = new Contract(MULTICALL_ADDRESS, MulticallAbi, provider);

  const withdrawalCalls = positions.map((position) => ({
    target: '0x8F901D3c80e6f72b6Ca118076697608C18ee48fe', 
    gasLimit: 300_000n, 
    callData: encodeEstimateWithdrawalAmounts(position.multipool.token0.id, position.multipool.token1.id, position.balance)
  }));

  const estimateClaimCCalls = positions.map((position) => ({
    target: '0x1D236503285770b58f12C6AFc7896fAd713F9334', 
    gasLimit: 500_000n,
    callData: encodeEstimateClaim(position.multipool.pidId, position.owner)
  }));

  const [, withdrawalResults] = await multicall.multicall.staticCall(withdrawalCalls, { blockTag: blockNumber });
  const [, estimateClaimResults] = await multicall.multicall.staticCall(estimateClaimCCalls, { blockTag: blockNumber });

  return positions.reduce((acc, position, index) => {
    const withdrawalResult = withdrawalResults[index];
    const estimateClaimResult = estimateClaimResults[index];
    if(withdrawalResult.success && estimateClaimResult.success) {
      const [amount0, amount1] = decodeEstimateWithdrawalAmounts(withdrawalResult.returnData) as unknown as [bigint, bigint];
      const [estimateClaim] = decodeEstimateClaim(estimateClaimResult.returnData) as unknown as [{ withdrawnFee0: bigint, withdrawnFee1: bigint }];
      if(amount0 > 0n || estimateClaim.withdrawnFee0 > 0n){
        acc.push({
          userAddress: position.owner,
          poolAddress: position.multipool.id,
          tokenAddress: position.multipool.token0.id,
          blockNumber,
          balance: amount0 + estimateClaim.withdrawnFee0,
          timestamp,
        });
      }

      if(amount1 > 0n || estimateClaim.withdrawnFee1 > 0n){
        acc.push({
          userAddress: position.owner,
          poolAddress: position.multipool.id,
          tokenAddress: position.multipool.token1.id,
          blockNumber,
          balance: amount1 + estimateClaim.withdrawnFee1,
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

  const multipoolPositionsRow = await getAllUserMultipoolPositions(blockNumber);
  const multipoolPositions = await transformUserMultipoolPositions(multipoolPositionsRow, blockNumber, timestamp);
  return [...v3Positions, ...multipoolPositions];
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