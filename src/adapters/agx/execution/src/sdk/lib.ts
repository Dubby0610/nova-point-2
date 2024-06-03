import { UserPositions, Pool, Swaps } from "./types";
import path from "path";
import { fetchGraphQLData } from "./fetch";
import { JsonRpcProvider } from "ethers";
require("dotenv").config({ path: path.join(__dirname, "../../.env") });


export const getVaultTotalSupplied = async () => {
  const query = `
    query MyQuery {
      pools(first: 1000) {
        id
        totalSupplied
      }
    }
  `;

  const data = await fetchGraphQLData<{ pools: Pool[] }>(query);

  if(data.pools.length === 0) return '1'

  return data.pools[0]?.totalSupplied ?? '0';
};

export const getSwapTxList = async (startBlock: number, endBlock: number) => {
  let result = [];
  let skip = 0;
  const pageSize = 1000;
  let fetchNext = true;

  while (fetchNext) {
    const query = `query MyQuery($blockNumber_gte: BigInt = ${startBlock}, $blockNumber_lte: BigInt = ${endBlock}, $first: Int = ${pageSize}, $skip: Int = ${skip}) {
      swapTxes(
        where: {blockNumber_lte: $blockNumber_lte, blockNumber_gte: $blockNumber_gte}
        first: $first
        skip: $skip
      ) {
        account
        amount
        blockNumber
        decimal
        id
        nonce
        price
        timestamp
        transactionHash
        tokenAddress
      }
    }`;

    const data = await fetchGraphQLData<{ swapTxes: Swaps }>(query);

    const { swapTxes } = data;


    result.push(...swapTxes);

    if (swapTxes.length < pageSize) {
      fetchNext = false;
    } else {
      console.log(`GET AGX Swap FROM ${skip}`);
      skip += pageSize;
    }
  }

  return result;
};

export const getAllUserPosition = async (blockNumber: number) => {
  let result = [];
  let skip = 0;
  const pageSize = 1000;
  let fetchNext = true;

  while (fetchNext) {
    const query = `query 
        MyQuery($skip: Int = ${skip}, $first: Int = ${pageSize}, $number: Int = ${blockNumber}){
          userPositions(first: $first, skip: $skip, block: {number: $number}) {
            balance
            id
          }
        }`;

    const data = await fetchGraphQLData<{ userPositions: UserPositions }>(query);

    const { userPositions } = data;


    result.push(...userPositions);

    if (userPositions.length < pageSize) {
      fetchNext = false;
    } else {
      console.log(`GET AGX TVL FROM ${skip}`);
      skip += pageSize;
    }
  }

  return result;
};

export const getTimestampAtBlock = async (blockNumber: number) => {
  const provider = new JsonRpcProvider("https://sepolia.rpc.zklink.io");
  const block = await provider.getBlock(blockNumber);
  return Number(block?.timestamp);
};
