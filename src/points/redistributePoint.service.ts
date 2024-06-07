import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import { Cron, CronExpression } from "@nestjs/schedule";
import { transferFailedData, withdrawTime } from "../constants/index";
import { fetchGraphQLData } from "src/utils";
import { LrtUnitOfWork } from "src/unitOfWork";
import { User } from "src/entities/user.entity";
import BigNumber from "bignumber.js";

interface Pool {
  balance: string
  decimals: string
  id: string
  name: string
  symbol: string
  totalSupplied: string
  underlying: string
}

interface WithdrawInfo {
  id: string,
  balance: string,
  timestamp: Date;
  tokenAddress: string,
  userPointId: string,
  userAddress: string
}

interface UserPointData {
  userAddress: string,
  tokenAddress: string,
  balance: string,
  exchangeRate: number,
  pointWeight: string,
  pointWeightPercentage: number,
  withdrawHistory: Array<WithdrawInfo>
}

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
    private readonly unitOfWork: LrtUnitOfWork
  ) {
    super();
    this.logger = new Logger(RedistributePointService.name);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async runProcess() {
    const data = await this.fetchDataFromSubgraph();
    await this.insertOrUpdateUsers(data);
    await this.batchUpsertData(data);
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
    this.logger.log(`queryTotalPointsWeightingData succeed with ${result.length}`)
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
    this.logger.log(`queryPointWeightData succeed with ${result.length}`)
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
          withdrawPoints(first:${pageSize}, skip:${skip}){
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
    this.logger.log(`queryWithdrawWeightData succeed with ${result.length}`)
    return result;
  }

  private genUserTokenMapKey(userAddress: string, tokenAddress: string) {
    return `${userAddress}_${tokenAddress}`
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
    return result
  }

  private async genUserBalancePointsWeightMap() {
    const pointWeightData = await this.queryPointWeightData()
    const now = (new Date().getTime() / 1000) | 0;
    const result = new Map(
      pointWeightData
        .map(item => {
          const [_, tokenAddress] = item.project.split('-');
          const pointsWeight = BigInt(item.weightBalance) * BigInt(now) -
            (BigInt(item.timeWeightAmountIn) - BigInt(item.timeWeightAmountOut))
          const userTokenMapKey = this.genUserTokenMapKey(item.address, tokenAddress)
          return [userTokenMapKey, {
            userAddress: item.address,
            tokenAddress: tokenAddress,
            balance: item.balance,
            balancePointWeight: pointsWeight
          }]
        })
    )
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
    const [tokenWithdrawWeightMap, userTokenWithWeightMap] = withdrawWeightData.reduce(([userTokenMapResult, tokenMapResult], item) => {
      const withdrawBalanceWeighting = this.calcWithdrawBalanceWeight(item)
      const userTokenMapKey = this.genUserTokenMapKey(item.address, item.project)

      tokenMapResult.set(item.project, (tokenMapResult.get(item.project) ?? BigInt(0)) + withdrawBalanceWeighting)
      const userTokenWeightInfo = userTokenMapResult.get(userTokenMapKey)
      if (!userTokenWeightInfo) {
        userTokenMapResult.set(userTokenMapKey, {
          weightPoint: withdrawBalanceWeighting,
          withdrawList: Number(item.blockTimestamp) > withdrawTime ?
            [{
              id: item.id,
              tokenAddress: item.project,
              balance: item.balance,
              userAddress: item.address,
              timestamp: new Date(Number(item.blockTimestamp) * 1000),
              userPointId: this.genUserTokenMapKey(item.address, item.project)
            }] : []
        })
      } else {
        userTokenMapResult.set(userTokenMapKey, {
          weightPoint: userTokenWeightInfo.weightPoint + withdrawBalanceWeighting,
          withdrawList: userTokenWeightInfo.withdrawList.concat(Number(item.blockTimestamp) > withdrawTime ? {
            id: item.id,
            tokenAddress: item.project,
            balance: item.balance,
            userAddress: item.address,
            timestamp: new Date(Number(item.blockTimestamp) * 1000),
            userPointId: this.genUserTokenMapKey(item.address, item.project)
          } : [])
        })
      }


      return [userTokenMapResult, tokenMapResult]
    }, [new Map<string, { weightPoint: bigint, withdrawList: WithdrawInfo[] }>(), new Map<string, bigint>()])

    return [tokenWithdrawWeightMap, userTokenWithWeightMap] as const;
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
      [userTokenWithdrawWeightMap, tokenWithdrawWeightMap],
      [userTokenTransferFailedPointsWeightMap, tokenTransferFailedPointsWeightMap],
      tokenBalancePointsWeightMap,
      pointWeightMap,
      lpPoolsMap
    ] = await Promise.all([
      this.genWithdrawInfoMap(),
      this.getTransferFailedPointsWeight(),
      this.genTokenBalancePointsWeightMap(),
      this.genUserBalancePointsWeightMap(),
      this.queryPoolsMap()
    ])

    const pointWeightResult = Array.from(pointWeightMap, ([key, obj]) => {
      const userTokenWithdrawWeightInfo = userTokenWithdrawWeightMap.get(key) ?? { weightPoint: BigInt(0), withdrawList: [] }
      const userTokenTransferFailedWeight = userTokenTransferFailedPointsWeightMap.get(key) ?? BigInt(0)
      const userTokenPointWeight = obj.balancePointWeight + userTokenWithdrawWeightInfo.weightPoint + userTokenTransferFailedWeight

      const totalTokenPointWeight = tokenBalancePointsWeightMap.get(obj.tokenAddress)
      const totalWithdrawWeight = tokenWithdrawWeightMap.get(obj.tokenAddress) ?? BigInt(0)
      const totalTransferFailedWeight = tokenTransferFailedPointsWeightMap.get(obj.tokenAddress) ?? BigInt(0)
      const totalPointWeight = totalTokenPointWeight + totalWithdrawWeight + totalTransferFailedWeight

      const pointWeightPercentage = BigNumber(userTokenPointWeight.toString(10)).div(totalPointWeight.toString(10)).toNumber()
      const withdrawHistory = userTokenWithdrawWeightInfo.withdrawList
      const lpPoolInfo = lpPoolsMap.get(obj.tokenAddress)
      const exchangeRate = lpPoolInfo ? BigNumber(lpPoolInfo.balance).div(lpPoolInfo.totalSupplied).toNumber() : 1

      return { ...obj, exchangeRate, withdrawHistory, pointWeight: userTokenPointWeight.toString(), pointWeightPercentage }
    })


    return pointWeightResult
  }

  async insertOrUpdateUsers(pointData: Array<UserPointData>) {
    const entityManager = this.unitOfWork.getTransactionManager();
    const userAddresses = [...new Set(pointData.map(d => d.userAddress))];
    const userMap = new Map<string, User>();

    for (let i = 0; i < userAddresses.length; i += this.BATCH_SIZE) {
      const batch = userAddresses.slice(i, i + this.BATCH_SIZE);
      const users = await entityManager
        .createQueryBuilder(User, 'user')
        .where('user.userAddress IN (:...batch)', { batch })
        .getMany();

      users.forEach(user => userMap.set(user.userAddress, user));

      const newUserEntities: User[] = [];
      for (const userAddress of batch) {
        if (!userMap.has(userAddress)) {
          const newUser = new User();
          newUser.userAddress = userAddress;
          newUserEntities.push(newUser);
          userMap.set(userAddress, newUser);
        }
      }

      if (newUserEntities.length > 0) {
        await entityManager.save(User, newUserEntities);
      }
      this.logger.log(`insertOrUpdateUsers batch ${i}, total length ${userAddresses.length}`)
    }
    this.logger.log(`insertOrUpdateUsers succeed`)
    return userMap;
  }

  async batchUpsertData(pointData: Array<UserPointData>) {
    const entityManager = this.unitOfWork.getTransactionManager();

    for (let i = 0; i < pointData.length; i += this.BATCH_SIZE) {
      const batch = pointData.slice(i, i + this.BATCH_SIZE);
      const userRedistributePoints = batch.map(data => ({
        id: this.genUserTokenMapKey(data.userAddress, data.tokenAddress),
        tokenAddress: Buffer.from(data.tokenAddress.slice(2), 'hex'),
        balance: data.balance.toString(),
        exchangeRate: data.exchangeRate,
        pointWeight: data.pointWeight.toString(),
        pointWeightPercentage: data.pointWeightPercentage,
        userAddress: Buffer.from(data.userAddress.slice(2), 'hex')
      }));

      const values = userRedistributePoints.map(p => `(
      '${p.id}',
      decode('${p.tokenAddress.toString('hex')}', 'hex'),
      '${p.balance}',
      ${p.exchangeRate},
      '${p.pointWeight}',
      ${p.pointWeightPercentage},
      decode('${p.userAddress.toString('hex')}', 'hex')
    )`).join(',');

      const upsertQuery = `
      INSERT INTO "userRedistributePoint" 
      ("id", "tokenAddress", "balance", "exchangeRate", "pointWeight", "pointWeightPercentage", "userAddress") 
      VALUES ${values}
      ON CONFLICT ("userAddress", "tokenAddress")
      DO UPDATE SET 
        "balance" = EXCLUDED.balance,
        "exchangeRate" = EXCLUDED."exchangeRate",
        "pointWeight" = EXCLUDED."pointWeight",
        "pointWeightPercentage" = EXCLUDED."pointWeightPercentage"
      RETURNING id, "userAddress", "tokenAddress"
    `;

      await entityManager.query(upsertQuery);

      const withdrawHistories = batch.map(data => data.withdrawHistory.map(withdraw => ({
        id: Buffer.from(withdraw.id.slice(2), 'hex'),
        balance: withdraw.balance,
        timestamp: withdraw.timestamp.toISOString(),
        userPointId: withdraw.userPointId,
        tokenAddress: Buffer.from(withdraw.tokenAddress.slice(2), 'hex'),
        userAddress: Buffer.from(withdraw.userAddress.slice(2), 'hex')
      }))).flat()

      if (withdrawHistories.length > 0) {
        const withdrawValues = withdrawHistories.map(w => `(
        decode('${w.id.toString('hex')}', 'hex'),
        '${w.balance}',
        '${w.timestamp}',
        decode('${w.tokenAddress.toString('hex')}', 'hex'),
        '${w.userPointId}',
        decode('${w.userAddress.toString('hex')}', 'hex')
      )`).join(',');

        const withdrawQuery = `
        INSERT INTO "withdrawHistory" ("id", "balance", "timestamp", "tokenAddress", "userPointId", "userAddressId")
        VALUES ${withdrawValues}
        ON CONFLICT ("id")
        DO UPDATE SET 
          "balance" = EXCLUDED."balance",
          "tokenAddress" = EXCLUDED."tokenAddress",
          "userPointId" = EXCLUDED."userPointId",
          "userAddressId" = EXCLUDED."userAddressId"
      `;

        await entityManager.query(withdrawQuery);
      }
      this.logger.log(`Process ${i} batch successfully, total point data length ${pointData.length}`)
    }

    this.logger.log('Data batch upsert completed');
  }
}
