import { UserBalance, Response, UserSupplied, Pool } from './types';
import { JsonRpcProvider } from 'ethers'



export const getUserPositionsAtBlock = async (
  blockNumber: number,
): Promise<UserBalance[]> => {
  let result: UserSupplied[] = [];

  let skip = 0;
  let fetchNext = true;
  let poolList: Pool[] = []
  while (fetchNext) {
    const query = `query MyQuery {
      userPositions(where: {validate: true, id_not: "0x000000000000000000000000000000000000dead"}, block: {number: ${blockNumber}}, skip: ${skip}) {
        id
        balance
        positions {
          id
          pool
          poolName
          supplied
          token
        }
      }
      pools(block: {number: ${blockNumber}}) {
        balance
        id
        totalSupplied
      }
    }`;

    const response = await fetch('http://3.114.68.110:8000/subgraphs/name/layerbank-point', {
      method: 'POST',
      body: JSON.stringify({ query }),
      headers: { 'Content-Type': 'application/json' },
    });

    const { data } = await response.json();
    if (!data) {
      console.log("No Data Yet!")
      break;
    }

    const { userPositions, pools } = data as Response
    poolList = pools
    const res = userPositions.map(data => {
      const userAddress = data.id

      const balance = data.positions.map((item) => {
        return {
          address: userAddress,
          pairAddress: item.pool,
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
      skip += 100
    }
  }

  const userBalanceList = result.map(position => {
    const pool = poolList.find(i => i.id === position.pool)
    if (!pool) {
      return {
        address: position.address,
        pairAddress: position.pairAddress,
        tokenAddress: position.tokenAddress,
        blockNumber: position.blockNumber,
        balance: BigInt(0)
      }
    }

    const { balance, totalSupplied } = pool
    return {
      address: position.address,
      pairAddress: position.pairAddress,
      tokenAddress: position.tokenAddress,
      blockNumber: position.blockNumber,
      balance: BigInt(totalSupplied) === BigInt(0) ? BigInt(0) : position.supplied * BigInt(balance) / BigInt(totalSupplied)
    }

  })

  return userBalanceList;
};

export const getTimestampAtBlock = async (blockNumber: number) => {
  const provider = new JsonRpcProvider('https://rpc.zklink.io')
  const block = await provider.getBlock(blockNumber)
  return Number(block?.timestamp);
};
