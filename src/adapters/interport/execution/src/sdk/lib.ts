import 'dotenv/config';
import { Call, MulticallResult, Response, StakeData, UserTVLData } from './types';
import { Contract, FallbackProvider } from 'ethers'
import { createFallbackProvider } from './utils/provider';
import {
  MULTICALL_ADDRESS,
  STABLECOIN_FARM_ADDRESS,
  USDC_VAULT_ADDRESS,
  USDT_VAULT_ADDRESS, VaultID
} from './utils/constants';
import MULTICALL_ABI from './abis/multicall.json';
import { decodeUserInfo, encodeUserInfo } from './utils/encoder';

const SUBGRAPH_ENDPOINT = process.env.SUBGRAPH_ENDPOINT as string;

async function querySubgraphUpToBlock(blockNumber: number): Promise<StakeData[]> {
  let allStakes: StakeData[] = [];
  let skip = 0;
  let fetchMore = true;
  const first = 100;

  while (fetchMore) {
    const query = `
      query {
          userStakes(first: ${first}, skip: ${skip}, where: {blocknumber_lte: ${blockNumber}}) {
              id
              user
              pid
              amount
              blocknumber
              timestamp
          }
      }`;
    const response = await fetch(SUBGRAPH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data: Response = await response.json();
    const stakes = data.data.userStakes || [];

    allStakes = allStakes.concat(stakes);
    fetchMore = stakes.length === first;
    skip += first;
  }

  return removeDuplicateUsers(allStakes);
}

function removeDuplicateUsers(stakes: StakeData[]): StakeData[] {
  const uniqueUsers = new Map<string, StakeData>();

  stakes.forEach(stake => {
    const uniqueKey = `${stake.user}-${stake.pid}`;
    if (!uniqueUsers.has(uniqueKey)) {
      uniqueUsers.set(uniqueKey, stake);
    }
  });

  return Array.from(uniqueUsers.values());
}

export async function getUserPositionsAtBlock(blockNumber: number): Promise<UserTVLData[]> {
  const provider: FallbackProvider = createFallbackProvider();
  const multicall = new Contract(MULTICALL_ADDRESS, MULTICALL_ABI, provider);
  const results: UserTVLData[] = [];

  const stakings: StakeData[] = await querySubgraphUpToBlock(blockNumber);

  const userInfoCalls: Call[] = stakings.map((stakeData): Call => {
    const callData = encodeUserInfo(stakeData.pid, stakeData.user);

    return {
      target: STABLECOIN_FARM_ADDRESS,
      callData,
    };
  });

  const blockTag = { blockTag: blockNumber };

  const userInfoResults: MulticallResult[] = await multicall.tryAggregate.staticCall(false, userInfoCalls, blockTag);

  for (const [ index, userInfo ] of userInfoResults.entries()) {
    if (!userInfo.success) continue;

    const staking = stakings[index];
    const userBalance = decodeUserInfo(userInfo.returnData)[0];
    const tokenAddress = staking.pid === VaultID.USDT ? USDT_VAULT_ADDRESS : USDC_VAULT_ADDRESS;

    results.push({
      userAddress: staking.user,
      tokenAddress,
      poolAddress: STABLECOIN_FARM_ADDRESS,
      balance: BigInt(userBalance),
      blockNumber: Number(staking.blocknumber),
    });
  }

  return results;
}
