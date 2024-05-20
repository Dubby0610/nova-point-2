import { fetchGraphQLData } from "./fetch";
import { UserBalance, UserSupplied, AquaCToken } from "./types";
import { JsonRpcProvider } from "ethers";

export const getUserPositionsAtBlock = async (blockNumber: number): Promise<UserBalance[]> => {
  const pageSize = 1000

  let result: UserSupplied[] = [];
  let skip = 0;
  let fetchNext = true;
  let pools: AquaCToken[] = [];

  while (fetchNext) {
    const query = `query MyQuery {
      userPositions(block: {number: ${blockNumber}}, skip: ${skip}, first: ${pageSize}) {
        id
        positions {
          decimal
          blockNumber
          id
          pool
          supplied
          token
          transactionHash
        }
      }
      aquaCTokens(block: {number: ${blockNumber}}) {
        balance
        blockNumber
        id
        totalSupplied
      }
    }`;

    const data = await fetchGraphQLData(query);
    if (!data) {
      console.log("No Data Yet!");
      break;
    }

    const { userPositions, aquaCTokens } = data;
    pools = aquaCTokens;
    const res = userPositions.map((data) => {
      const userAddress = data.id;

      const balance = data.positions.map((item) => {
        return {
          userAddress: userAddress,
          poolAddress: item.pool,
          tokenAddress: item.token,
          blockNumber: blockNumber,
          supplied: BigInt(item.supplied),
          pool: item.pool,
        };
      });

      return balance;
    });

    result.push(...res.flat());

    if (userPositions.length < pageSize) {
      fetchNext = false;
    } else {
      console.log(`GET DATA FROM ${skip}`);
      skip += pageSize;
    }
  }

  const timestamp = await getTimestampAtBlock(blockNumber);

  const userBalanceList = result.map((position) => {
    const pool = pools.find((i) => i.id === position.pool);
    if (!pool) {
      return {
        userAddress: position.userAddress,
        tokenAddress: position.tokenAddress,
        poolAddress: position.poolAddress,
        blockNumber: position.blockNumber,
        balance: BigInt(0),
        timestamp,
      };
    }

    const { balance, totalSupplied } = pool;
    return {
      userAddress: position.userAddress,
      tokenAddress: position.tokenAddress,
      poolAddress: position.poolAddress,
      blockNumber: position.blockNumber,
      balance:
        BigInt(totalSupplied) === BigInt(0) ? BigInt(0) : (position.supplied * BigInt(balance)) / BigInt(totalSupplied),
      timestamp,
    };
  });

  return userBalanceList;
};

export const getTimestampAtBlock = async (blockNumber: number) => {
  const provider = new JsonRpcProvider("https://rpc.zklink.io");
  const block = await provider.getBlock(blockNumber);
  return Number(block?.timestamp);
};
