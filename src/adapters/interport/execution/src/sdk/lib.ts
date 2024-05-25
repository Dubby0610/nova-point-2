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
import path from 'path';
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const SUBGRAPH_ENDPOINT = process.env.SUBGRAPH_ENDPOINT as string;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchGraphQLData = async (query: string): Promise<Response> => {
  let response;
  let data;
  let retry = true;
  let retryCount = 0;
  const maxRetries = 10;

  while (retry && retryCount < maxRetries) {
    try {
      response = await fetch(SUBGRAPH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        retryCount++;
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      data = await response.json();
      if (data.errors) {
        retryCount++;
        throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
      }

      retry = false;
    } catch (error) {
      console.error('Fetch error:', error);
      console.log('Retrying in 5 seconds...');
      await delay(5000);
      retryCount++;
    }
  }

  if (retryCount >= maxRetries) {
    console.error("Maximum retry limit reached");
  }

  return data;
};

async function querySubgraphUpToBlock(blockNumber: number): Promise<StakeData[]> {
  let allStakes: StakeData[] = [];
  let skip = 0;
  let fetchMore = true;
  const first = 1000;

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

    const data = await fetchGraphQLData(query);
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

  for (const [index, userInfo] of userInfoResults.entries()) {
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
      timestamp: Number(staking.timestamp)
    });
  }

  return results;
}
