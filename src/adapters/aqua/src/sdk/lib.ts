import { UserBalance, UserPositions } from './types';
import { formatUnits, JsonRpcProvider } from 'ethers'



export const getUserPositionsAtBlock = async (
  blockNumber: number,
): Promise<UserBalance[]> => {
  let result: UserBalance[] = [];

  let skip = 0;
  let fetchNext = true;
  while (fetchNext) {
    const query = `query MyQuery {
      userPositions(block: {number: ${blockNumber}}, skip: ${skip}) {
        id
        positions {
            balance
            blockNumber
            decimal
            pool
            token
            transactionHash
            id
          }
        }
      }`;

    const response = await fetch('https://graph.zklink.io/subgraphs/name/aqua-points', {
      method: 'POST',
      body: JSON.stringify({ query }),
      headers: { 'Content-Type': 'application/json' },
    });

    const { data } = await response.json();
    const { userPositions } = data as UserPositions

    const res = userPositions.map(data => {
      const userAddress = data.id

      const balance = data.positions.map((item) => {
        return {
          address: userAddress,
          pairAddress: item.pool,
          tokenAddress: item.token,
          blockNumber: Number(item.blockNumber),
          balance: BigInt(item.balance)
        }
      })

      return balance
    })

    result.push(...res.flat())

    if (userPositions.length < 100) {
      fetchNext = false;
    } else {
      skip += 100
    }
  }

  return result;
};

export const getTimestampAtBlock = async (blockNumber: number) => {
  const provider = new JsonRpcProvider('https://rpc.zklink.io')
  const block = await provider.getBlock(blockNumber)
  return Number(block?.timestamp);
};
