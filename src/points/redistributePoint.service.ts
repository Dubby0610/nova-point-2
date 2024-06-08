import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import { transferFailedData, withdrawTime } from "../constants/index";
import { fetchGraphQLData } from "src/utils";
import { RedistributeBalance, UserHolding, UserStaked, UserWithdraw } from "src/entities";
import BigNumber from "bignumber.js";
import { RedistributeBalanceRepository, UserHoldingRepository, UserRepository, UserStakedRepository, UserWithdrawRepository } from "src/repositories";

interface Pool {
  balance: string
  decimals: string
  id: string
  name: string
  symbol: string
  totalSupplied: string
  underlying: string
}

type OmitEntityTime<T> = Omit<T, 'createdAt' | 'updatedAt'>;

interface GraphPoint {
  address: string;
  balance: string;
  weightBalance: string;
  timeWeightAmountIn: string;
  timeWeightAmountOut: string;
  project: string;
}
interface GraphTotalPoint {
  id: string;
  project: string;
  totalBalance: string;
  totalWeightBalance: string;
  totalTimeWeightAmountIn: string;
  totalTimeWeightAmountOut: string;
}

interface GraphWithdrawPoint {
  id: string;
  address: string;
  balance: string;
  weightBalance: string;
  timeWeightAmountIn: string;
  timeWeightAmountOut: string;
  project: string;
  blockTimestamp: string
}


@Injectable()
export class RedistributePointService extends Worker {
  private readonly logger: Logger;
  private readonly BATCH_SIZE = 1000;
  private readonly SUBGRAPH_URL = 'https://graph.zklink.io/subgraphs/name/nova-points-redistribute-v4'

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly userHoldingRepository: UserHoldingRepository,
    private readonly userStakedRepository: UserStakedRepository,
    private readonly userWithdrawRepository: UserWithdrawRepository,
    private readonly redistributeBalanceRepository: RedistributeBalanceRepository
  ) {
    super();
    this.logger = new Logger(RedistributePointService.name);
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runProcess() {
    while (true) {
      try {
        const now = Date.now();
        const { holdingsPointData, stakesPointData, withdrawList } = await this.fetchDataFromSubgraph()
        await this.insertOrUpdateUsers([...new Set([...holdingsPointData, ...stakesPointData, ...withdrawList].map(d => d.userAddress))]);
        await this.insertOrUpdateHoldingData(holdingsPointData);
        await this.insertOrUpdateStakedData(stakesPointData);
        await this.insertOrUpdateWithdrawData(withdrawList);
        this.logger.log(`Process all redistributePointService cost ${Date.now() - now} ms`);
      } catch (error) {
        this.logger.error(`Error in RedistributePointService runLoop, ${error.stack}}`);
      }

      await this.delay(2 * 60 * 1000);
    }
  }

  private async queryPoolsMap() {
    const pageSize = 1000
    let skip = 0;

    const queryAquaPools = `
        query Pools {
        pools(first: ${pageSize}, skip: ${skip}) {
          balance
          decimals
          id
          name
          symbol
          totalSupplied
          underlying
        }
      }
      `;
    const aquaPools = await fetchGraphQLData<{ pools: Pool[] }>('https://graph.zklink.io/subgraphs/name/aqua-points-v2', queryAquaPools);

    const queryLayerBankPool = `
        query Pools {
        pools(first: ${pageSize}, skip: ${skip}) {
          balance
          decimals
          id
          name
          symbol
          totalSupplied
          underlying
        }
      }
      `;
    const layerBankPools = await fetchGraphQLData<{ pools: Pool[] }>('https://graph.zklink.io/subgraphs/name/aqua-points-v2', queryLayerBankPool);

    const result = new Map([aquaPools.pools, layerBankPools.pools].flat().map(pool => [pool.id, pool]))

    return result;
  }

  private async queryTotalPointsWeightingData(): Promise<GraphTotalPoint[]> {
    const pageSize = 1000
    let skip = 0;
    let result: GraphTotalPoint[] = [];
    let fetchNext = true;
    while (fetchNext) {
      const queryTotalPoints = `
      query TotalPoints {
        totalPoints(first: ${pageSize}, skip: ${skip}) {
          id
          project
          totalBalance
          totalWeightBalance
          totalTimeWeightAmountIn
          totalTimeWeightAmountOut
        }
      }
      `;
      const data = await fetchGraphQLData<{ totalPoints: GraphTotalPoint[] }>(this.SUBGRAPH_URL, queryTotalPoints);
      if (!data) {
        console.log("No Data Yet!");
        break;
      }
      const { totalPoints } = data;
      result = result.concat(totalPoints)

      if (totalPoints.length < pageSize) {
        fetchNext = false;
      } else {
        skip += pageSize;
      }
    }
    this.logger.log(`queryTotalPointsWeightingData succeed with ${result.length} `)
    return result;
  }

  private async queryPointWeightData(): Promise<GraphPoint[]> {
    const pageSize = 1000
    let skip = 0;
    let result: GraphPoint[] = [];
    let fetchNext = true;
    while (fetchNext) {
      const queryPoints = `
        query Points {
        points(first: ${pageSize}, skip: ${skip}) {
          address
          balance
          weightBalance
          timeWeightAmountIn
          timeWeightAmountOut
          project
        }
      }
      `;
      const data = await fetchGraphQLData<{ points: GraphPoint[] }>(this.SUBGRAPH_URL, queryPoints);
      if (!data) {
        console.log("No Data Yet!");
        break;
      }
      const { points } = data;
      result = result.concat(points)

      if (points.length < pageSize) {
        fetchNext = false;
      } else {
        skip += pageSize;
      }
    }
    this.logger.log(`queryPointWeightData succeed with ${result.length} `)
    return result;
  }

  private async queryWithdrawWeightData(): Promise<GraphWithdrawPoint[]> {
    const pageSize = 1000
    let skip = 0;
    let result = [];
    let fetchNext = true;
    while (fetchNext) {
      const queryPoints = `
        query WithdrawPoints {
        withdrawPoints(first: ${pageSize}, skip: ${skip}){
          id
          project
          balance
          weightBalance
          address
          timeWeightAmountIn
          timeWeightAmountOut
          blockTimestamp
        }
      }
      `;
      const data = await fetchGraphQLData<{ withdrawPoints: GraphWithdrawPoint[] }>(this.SUBGRAPH_URL, queryPoints);
      if (!data) {
        console.log("No Data Yet!");
        break;
      }
      const { withdrawPoints } = data;
      result = result.concat(withdrawPoints)

      if (withdrawPoints.length < pageSize) {
        fetchNext = false;
      } else {
        skip += pageSize;
      }
    }
    this.logger.log(`queryWithdrawWeightData succeed with ${result.length} `)
    return result;
  }

  async fetchDataFromHourlyData() {

    let offset = 0;
    let hasMore = true;
    const allData: RedistributeBalance[] = [];

    while (hasMore) {
      const batch = await this.redistributeBalanceRepository.find({
        skip: offset,
        take: this.BATCH_SIZE,
      })

      allData.push(...batch);
      offset += this.BATCH_SIZE;
      hasMore = batch.length === this.BATCH_SIZE;
    }
    const formattedData = allData.map(data => ({
      userAddress: data.userAddress,
      tokenAddress: data.tokenAddress,
      poolAddress: data.pairAddress,
      balance: data.balance,
      pointWeight: data.accumulateBalance,
      pointWeightPercentage: Number(data.percentage),
    }))
    this.logger.log(`fetchDataFromHourlyData succeed`)
    return formattedData;
  }

  private genUserTokenMapKey(userAddress: string, tokenAddress: string) {
    return `${userAddress}_${tokenAddress} `
  }

  private async genTokenBalancePointsWeightMap() {
    const totalPointWeightData = await this.queryTotalPointsWeightingData()
    const now = (new Date().getTime() / 1000) | 0;
    const result = new Map(totalPointWeightData.map(item => {
      const [_, tokenAddress] = item.project.split('-');
      const pointsWeight = BigInt(item.totalWeightBalance) * BigInt(now) -
        (BigInt(item.totalTimeWeightAmountIn) - BigInt(item.totalTimeWeightAmountOut))
      return [tokenAddress, pointsWeight]
    }))
    this.logger.log(`genTokenBalancePointsWeightMap succeed`)
    return result
  }

  private calcWithdrawBalanceWeight(withdrawBalanceInfo: GraphWithdrawPoint) {
    const now = (new Date().getTime() / 1000) | 0;
    let timestamp = Number(withdrawBalanceInfo.blockTimestamp);
    for (const item of withdrawTime) {
      if (timestamp >= item.start && timestamp < item.end) {
        timestamp = timestamp + item.period;
        break;
      }
    }
    timestamp = timestamp < now ? timestamp : now
    const { weightBalance, timeWeightAmountIn, timeWeightAmountOut } = withdrawBalanceInfo

    return BigInt(weightBalance) * BigInt(timestamp) -
      (BigInt(timeWeightAmountIn) - BigInt(timeWeightAmountOut))

  }

  private async genWithdrawInfoMap() {
    const withdrawWeightData = await this.queryWithdrawWeightData()
    const withdrawTime = Math.floor(
      (new Date().getTime() - 7 * 24 * 60 * 60 * 1000) / 1000,
    );
    const tokenWithdrawWeightMap = new Map<string, bigint>()
    const userTokenWithdrawWeightMap = new Map<string, bigint>()
    const withdrawList: OmitEntityTime<UserWithdraw>[] = []
    for (const item of withdrawWeightData) {
      const withdrawBalanceWeighting = this.calcWithdrawBalanceWeight(item)
      const userTokenMapKey = this.genUserTokenMapKey(item.address, item.project)

      tokenWithdrawWeightMap.set(item.project, (tokenWithdrawWeightMap.get(item.project) ?? BigInt(0)) + withdrawBalanceWeighting)
      userTokenWithdrawWeightMap.set(userTokenMapKey, (userTokenWithdrawWeightMap.get(userTokenMapKey) ?? BigInt(0)) + withdrawBalanceWeighting)
      if (Number(item.blockTimestamp) > withdrawTime) {
        withdrawList.push({
          userAddress: item.address,
          tokenAddress: item.project,
          balance: item.balance,
          timestamp: new Date(Number(item.blockTimestamp) * 1000)
        })
      }
    }
    this.logger.log(`genWithdrawInfoMap succeed`)
    return { tokenWithdrawWeightMap, userTokenWithdrawWeightMap, withdrawList }
  }

  // get transferFailedPointsWeight by tokenAddress
  public getTransferFailedPointsWeight() {
    // withdrawTime:2024-04-29 18:00:00 +8UTC
    const withdrawTime: number = 1714356000;
    // transfer failed startTime:2024-04-09 21:18:35 +8UTC
    const transferFailedStartTime: number = 1712639915;
    const now = (new Date().getTime() / 1000) | 0;
    const calcTime = Math.min(now, withdrawTime);

    const [userTokenTransferFailedPointsWeightMap, tokenTransferFailedPointsWeightMap] = transferFailedData.reduce(([userMapResult, tokenMapResult], item) => {
      const [userAddress, tokenAddress, balance, decimals] = item;
      const itemTransferWeight = BigInt(Number(balance) * (10 ** Number(decimals))) * BigInt(calcTime - transferFailedStartTime)
      const userTokenMapKey = this.genUserTokenMapKey(userAddress.toLowerCase(), tokenAddress.toLowerCase())

      userMapResult.set(userTokenMapKey, itemTransferWeight)
      tokenMapResult.set(tokenAddress, (tokenMapResult.get(tokenAddress) ?? BigInt(0)) + itemTransferWeight)

      return [userMapResult, tokenMapResult]
    }, [new Map<string, bigint>(), new Map<string, bigint>()]);

    return [userTokenTransferFailedPointsWeightMap, tokenTransferFailedPointsWeightMap]
  }

  public async fetchDataFromSubgraph() {
    this.logger.log('Start fetchDataFromSubgraph')
    const [
      hourlyDBData,
      { userTokenWithdrawWeightMap, tokenWithdrawWeightMap, withdrawList },
      [userTokenTransferFailedPointsWeightMap, tokenTransferFailedPointsWeightMap],
      tokenBalancePointsWeightMap,
      userPointWeightData,
      poolsMap
    ] = await Promise.all([
      this.fetchDataFromHourlyData(),
      this.genWithdrawInfoMap(),
      this.getTransferFailedPointsWeight(),
      this.genTokenBalancePointsWeightMap(),
      this.queryPointWeightData(),
      this.queryPoolsMap(),
    ])
    const now = (new Date().getTime() / 1000) | 0;

    const holdingsPointData: OmitEntityTime<UserHolding>[] = []
    const stakesPointData: OmitEntityTime<UserStaked>[] = []

    userPointWeightData.forEach(data => {
      const [_, tokenAddressOrPoolAddress] = data.project.split('-')
      const key = this.genUserTokenMapKey(data.address, tokenAddressOrPoolAddress)

      const tokenPointsWeight = BigInt(data.weightBalance) * BigInt(now) -
        (BigInt(data.timeWeightAmountIn) - BigInt(data.timeWeightAmountOut))
      const userTokenWithdrawWeight = userTokenWithdrawWeightMap.get(key) ?? BigInt(0)
      const userTokenTransferFailedWeight = userTokenTransferFailedPointsWeightMap.get(key) ?? BigInt(0)
      const userTokenPointWeight = tokenPointsWeight + userTokenWithdrawWeight + userTokenTransferFailedWeight

      const totalTokenPointWeight = tokenBalancePointsWeightMap.get(tokenAddressOrPoolAddress)
      const totalWithdrawWeight = tokenWithdrawWeightMap.get(tokenAddressOrPoolAddress) ?? BigInt(0)
      const totalTransferFailedWeight = tokenTransferFailedPointsWeightMap.get(tokenAddressOrPoolAddress) ?? BigInt(0)
      const totalPointWeight = totalTokenPointWeight + totalWithdrawWeight + totalTransferFailedWeight

      const pointWeightPercentage = BigNumber(userTokenPointWeight.toString(10)).div(totalPointWeight.toString(10)).toNumber()

      const poolInfo = poolsMap.get(tokenAddressOrPoolAddress)
      if (!poolInfo) {
        holdingsPointData.push({
          userAddress: data.address,
          tokenAddress: tokenAddressOrPoolAddress,
          balance: data.balance,
          pointWeight: userTokenPointWeight.toString(),
          pointWeightPercentage: pointWeightPercentage
        })
      } else {
        stakesPointData.push({
          userAddress: data.address,
          tokenAddress: poolInfo.underlying,
          poolAddress: tokenAddressOrPoolAddress,
          balance: data.balance,
          pointWeight: userTokenPointWeight.toString(),
          pointWeightPercentage: pointWeightPercentage
        })
      }
    })

    return { holdingsPointData, stakesPointData: [...stakesPointData, ...hourlyDBData], withdrawList }
  }

  async insertOrUpdateUsers(userAddresses: Array<string>) {
    const data = userAddresses.map(address => ({ userAddress: address, }))
    await this.userRepository.addManyIgnoreConflicts(data)
    this.logger.log('upsert user data upsert completed');
  }

  async insertOrUpdateHoldingData(data: Array<OmitEntityTime<UserHolding>>) {
    await this.userHoldingRepository.addManyOrUpdate(data, ["balance", "pointWeight", "pointWeightPercentage"], ["userAddress", "tokenAddress"])
    this.logger.log('upsert holding data upsert completed');
  }

  async insertOrUpdateStakedData(data: Array<OmitEntityTime<UserStaked>>) {
    await this.userStakedRepository.addManyOrUpdate(data, ["balance", "pointWeight", "pointWeightPercentage"], ["userAddress", "tokenAddress", "poolAddress"])
    this.logger.log('upsert staked data upsert completed');
  }

  async insertOrUpdateWithdrawData(data: Array<OmitEntityTime<UserWithdraw>>) {
    await this.userWithdrawRepository.addManyOrUpdate(data, ["balance"], ["userAddress", "tokenAddress", "timestamp"])
    this.logger.log('upsert withdraw data upsert completed');
  }
}
