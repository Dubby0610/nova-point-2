import { UserBalance, Response, UserSupplied, Pool } from './types';
import { JsonRpcProvider } from 'ethers'
import path from 'path'
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const SUBGRAPH_ENDPOINT = process.env.SUBGRAPH_ENDPOINT as string

const getAllPools = async () => {
  const query = `
    query MyQuery {
      pools(first: 1000) {
        id
        name
        symbol
        balance
        decimals
        totalSupplied
        underlying
      }
    }
  `;

  const response = await fetch(SUBGRAPH_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({ query }),
    headers: { 'Content-Type': 'application/json' },
  });

  const { data = { pools: [] } } = await response.json();
  const { pools } = data

  return pools as Pool[]
}

const getAllUserPosition = async (blockNumber: number) => {
  let result: UserSupplied[] = [];
  let skip = 0;
  const pageSize = 1000
  let fetchNext = true;

  while (fetchNext) {
    const query = `
      query MyQuery(
        $skip: Int = ${skip},
        $first: Int = ${pageSize},
        $number: Int = ${blockNumber}
      ) {
        userPositions(where: {invalid: false, id_not: "0x000000000000000000000000000000000000dead"}, first: $first, skip: $skip,  block: {number: $number}) {
          id
          balance
          invalid
          positions {
            id
            pool
            supplied
            token
          }
          
        }
      }`

    const response = await fetch(SUBGRAPH_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({ query }),
      headers: { 'Content-Type': 'application/json' },
    });

    const { data } = await response.json() as any;
    if (!data) {
      console.log("No Data Yet!")
      break;
    }

    const { userPositions } = data as Response
    const res = userPositions.map(data => {
      const userAddress = data.id

      const balance = data.positions.map((item) => {
        return {
          userAddress: userAddress,
          poolAddress: item.pool,
          tokenAddress: item.token,
          blockNumber: blockNumber,
          supplied: BigInt(item.supplied),
          pool: item.pool
        }
      })

      return balance
    })

    result.push(...res.flat())

    if (userPositions.length < 100) {
      fetchNext = false;
    } else {
      console.log(`GET DATA FROM ${skip}`)
      skip += pageSize
    }
  }

  return result
}



export const getUserPositionsAtBlock = async (
  blockNumber: number,
): Promise<UserBalance[]> => {
  const result = await getAllUserPosition(blockNumber)
  const poolList = await getAllPools()
  const timestamp = await getTimestampAtBlock(blockNumber)

  const userBalanceList = result.reduce((result, position) => {
    const key = `${position.userAddress}-${position.tokenAddress}`
    const pool = poolList.find(i => i.id === position.pool)
    if (!pool) {
      result.set(key, {
        userAddress: position.userAddress,
        poolAddress: position.poolAddress,
        tokenAddress: position.tokenAddress,
        blockNumber: position.blockNumber,
        balance: BigInt(0),
        timestamp: timestamp
      })
      return result
    }

    const { balance, totalSupplied } = pool
    const existedPosition = result.get(key)
    if (existedPosition) {
      result.set(key, {
        userAddress: position.userAddress,
        poolAddress: position.poolAddress,
        tokenAddress: position.tokenAddress,
        blockNumber: position.blockNumber,
        balance: BigInt(totalSupplied) === BigInt(0) ? existedPosition.balance : (position.supplied * BigInt(balance) / BigInt(totalSupplied)) + existedPosition.balance,
        timestamp: timestamp
      })
    } else {
      result.set(key, {
        userAddress: position.userAddress,
        poolAddress: position.poolAddress,
        tokenAddress: position.tokenAddress,
        blockNumber: position.blockNumber,
        balance: BigInt(totalSupplied) === BigInt(0) ? BigInt(0) : position.supplied * BigInt(balance) / BigInt(totalSupplied),
        timestamp: timestamp
      })
    }
    return result

  }, new Map())

  return Array.from(userBalanceList.values());
};

export const getTimestampAtBlock = async (blockNumber: number) => {
  const provider = new JsonRpcProvider('https://rpc.zklink.io')
  const block = await provider.getBlock(blockNumber)
  return Number(block?.timestamp);
};
