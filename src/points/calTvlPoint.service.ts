import { Injectable, Logger } from "@nestjs/common";
import BigNumber from "bignumber.js";
import {
  PointsOfLpRepository,
  BlockRepository,
  BalanceOfLpRepository,
  BlockTokenPriceRepository,
  BlockAddressPointOfLpRepository,
  AddressFirstDepositRepository,
  TvlProcessingRepository,
  ProjectRepository,
} from "../repositories";
import { TokenService } from "../token/token.service";
import { getETHPrice, getTokenPrice, STABLE_COIN_TYPE } from "./baseData.service";
import { PointsOfLp, BalanceOfLp, TvlProcessingStatus } from "src/entities";
import { BoosterService } from "../booster/booster.service";
import { LrtUnitOfWork } from "src/unitOfWork";
import { Worker } from "src/common/worker";
import waitFor from "src/utils/waitFor";

export const LOYALTY_BOOSTER_FACTOR: BigNumber = new BigNumber(0.005);

@Injectable()
export class CalTvlPointService extends Worker {
  private readonly logger: Logger;

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly tokenService: TokenService,
    private readonly pointsOfLpRepository: PointsOfLpRepository,
    private readonly blockRepository: BlockRepository,
    private readonly blockTokenPriceRepository: BlockTokenPriceRepository,
    private readonly blockAddressPointOfLpRepository: BlockAddressPointOfLpRepository,
    private readonly balanceOfLpRepository: BalanceOfLpRepository,
    private readonly addressFirstDepositRepository: AddressFirstDepositRepository,
    private readonly boosterService: BoosterService,
    private readonly tvlProcessingRepository: TvlProcessingRepository,
    private readonly unitOfWork: LrtUnitOfWork
  ) {
    super()
    this.logger = new Logger(CalTvlPointService.name);
  }

  public async runProcess(): Promise<void> {
    try {
      this.logger.log(`${CalTvlPointService.name} initialized`);
      const pendingProcessed = await this.tvlProcessingRepository.find({ where: { pointProcessed: false, adapterProcessed: true } })
      await Promise.all(pendingProcessed.map(processingStatus => this.handleHoldPoint(processingStatus)))

      await waitFor(() => !this.currentProcessPromise, 10000, 10000);
      if (!this.currentProcessPromise) {
        return;
      }
      return this.runProcess();
    } catch (error) {
      this.logger.error("Failed to calculate tvl hold point", error.stack);
    }
  }

  async handleHoldPoint(status: TvlProcessingStatus) {
    const { blockNumber, projectName } = status
    const currentStatisticalBlock = await this.blockRepository.getLastBlock({
      where: { number: blockNumber },
      select: { number: true, timestamp: true },
    });
    // const currentStatisticalBlock = { number: blockNumber, timestamp: new Date() }
    if (!currentStatisticalBlock) {
      this.logger.log(`No block of lp found, block number : ${blockNumber}`);
      return;
    }
    this.logger.log(`Start calculate ${projectName} tvl points at blockNumber:${currentStatisticalBlock.number}`);
    // get the early bird weight
    const earlyBirdMultiplier = this.boosterService.getEarlyBirdMultiplier(currentStatisticalBlock.timestamp);
    this.logger.log(`Early bird multiplier: ${earlyBirdMultiplier}`);
    const tokenPriceMap = await this.getTokenPriceMap(currentStatisticalBlock.number);
    const [addressSet, userLpTvlMap] = await this.getAddressTvlMap(currentStatisticalBlock.number, projectName, tokenPriceMap);
    let addresses = [...addressSet];

    // get all first deposit time
    const addressFirstDepositMap = await this.addressFirstDepositRepository.getFirstDepositMapForAddresses(addresses);
    // get all point of lp by addresses
    const addressPointList = await this.pointsOfLpRepository.getPointByAddresses(addresses);
    this.logger.log(`${projectName} point list length: ${addressPointList.length}`);
    let addressPointMap: { [address: string]: PointsOfLp } = {};
    for (let i = 0; i < addressPointList.length; i++) {
      const item = addressPointList[i];
      const tmpAddress = item.address.toLocaleLowerCase();
      const tmpPairAddress = item.pairAddress.toLocaleLowerCase();
      if (tmpAddress && tmpPairAddress) {
        const key = `${tmpAddress}-${tmpPairAddress}`;
        addressPointMap[key] = item;
      }
    }
    // loop all address to calculate hold point
    let blockAddressPointArr = [];
    let addressPointArr = [];
    let groupBooster = new BigNumber(1);
    for (const key of userLpTvlMap.keys()) {
      const [address, pairAddress] = key.split("-");
      const addressTvl = userLpTvlMap.get(key);
      if (!addressTvl) continue;
      // get the last multiplier before the block timestamp
      const addressFirstDepositTime = addressFirstDepositMap.get(address.toLowerCase());

      const blockTime = currentStatisticalBlock.timestamp.getTime();
      const loyaltyBooster = this.boosterService.getLoyaltyBooster(blockTime, addressFirstDepositTime?.getTime());

      const newHoldPoint = addressTvl
        .multipliedBy(earlyBirdMultiplier)
        // use pairAddress calculate the groupBooster addressMultiplier loyaltyBooster
        .multipliedBy(groupBooster)
        .multipliedBy(loyaltyBooster);

      blockAddressPointArr.push({
        blockNumber: currentStatisticalBlock.number,
        address: address,
        pairAddress: pairAddress,
        holdPoint: newHoldPoint.toNumber(),
        createdAt: currentStatisticalBlock.timestamp,
        updatedAt: currentStatisticalBlock.timestamp,
      });

      let fromAddressPoint = addressPointMap[key];
      if (!fromAddressPoint) {
        fromAddressPoint = {
          id: 0,
          address: address,
          pairAddress: pairAddress,
          stakePoint: 0,
        };
      }
      fromAddressPoint.stakePoint = Number(fromAddressPoint.stakePoint) + newHoldPoint.toNumber();
      addressPointArr.push(fromAddressPoint);
    }
    return new Promise<void>((resolve) => {
      this.unitOfWork.useTransaction(async () => {
        this.logger.log(`Start insert ${projectName} point into db for block: ${currentStatisticalBlock.number}`);
        await this.blockAddressPointOfLpRepository.addManyIgnoreConflicts(blockAddressPointArr);
        this.logger.log(
          `Finish ${projectName} blockAddressPointArr for block: ${currentStatisticalBlock.number}, length: ${blockAddressPointArr.length}`
        );
        await this.pointsOfLpRepository.addManyOrUpdate(addressPointArr, ["stakePoint"], ["address", "pairAddress"]);
        this.logger.log(
          `Finish ${projectName} addressPointArr for block: ${currentStatisticalBlock.number}, length: ${addressPointArr.length}`
        );
        await this.pointsOfLpRepository.setHoldPointStatisticalBlockNumber(currentStatisticalBlock.number);
        await this.tvlProcessingRepository.upsertStatus({ ...status, pointProcessed: true })
        this.logger.log(`Finish ${projectName} point statistic for block: ${currentStatisticalBlock.number}`);
        resolve()
      })
    })

  }

  async getAddressTvlMap(
    blockNumber: number,
    projectName: string,
    tokenPriceMap: Map<string, BigNumber>
  ): Promise<[Set<string>, Map<string, BigNumber>]> {
    // If the score for this block height already exists,
    // it should not be calculated again
    const pairAddresses = await this.projectRepository.getPairAddresses(projectName)
    const alreadyCalculatedPointsKey = await this.blockAddressPointOfLpRepository.getBlockAddressPointKeyByBlock(blockNumber, pairAddresses)
    const balanceList = await this.balanceOfLpRepository.getProjectLpBalances(blockNumber, pairAddresses);

    const userLpTvlMap: Map<string, BigNumber> = new Map();
    const addressSet: Set<string> = new Set()
    this.logger.log(`The all balanceOfLp length in ${projectName}: ${balanceList.length}`);
    let balanceMap = new Map<string, typeof balanceList>();
    for (let index = 0; index < balanceList.length; index++) {
      const balance = balanceList[index];
      const { address, pairAddress } = balance

      const key = `${address}-${pairAddress}-${balance.blockNumber}`;
      if (balanceMap.has(key)) {
        balanceMap.get(key).push(balance);
      } else {
        if (!alreadyCalculatedPointsKey.has(key)) {
          balanceMap.set(key, [balance]);
        }
      }
    }
    for (const [key, value] of balanceMap) {
      const addressTvl = await this.calculateAddressTvl(projectName, value, tokenPriceMap);
      if (addressTvl.isZero()) {
        continue;
      }
      const [address] = key.split("-");
      if (!addressSet.has(address)) {
        addressSet.add(address);
      }
      userLpTvlMap.set(key, addressTvl);
    }
    this.logger.log(`${projectName} userAddress_pairAddress map size: ${userLpTvlMap.size}`);
    this.logger.log(`${projectName} userAddress set size: ${addressSet.size}`);

    return [addressSet, userLpTvlMap];
  }

  async calculateAddressTvl(
    projectName: string,
    addressBalances: Partial<BalanceOfLp>[],
    tokenPrices: Map<string, BigNumber>
  ): Promise<BigNumber> {
    let holdBasePoint: BigNumber = new BigNumber(0);
    for (const balanceInfo of addressBalances) {
      // filter not support token
      const tokenAddress = balanceInfo.tokenAddress;
      const tokenInfo = this.tokenService.getSupportToken(tokenAddress);
      if (!tokenInfo) {
        continue;
      }

      const tokenPrice = getTokenPrice(tokenInfo, tokenPrices);
      const ethPrice = getETHPrice(tokenPrices);
      const tokenAmount = new BigNumber(balanceInfo.balance).dividedBy(new BigNumber(10).pow(tokenInfo.decimals));
      const tokenTvl = tokenAmount.multipliedBy(tokenPrice).dividedBy(ethPrice);
      // base point = Token Multiplier * Token Amount * Token Price / ETH_Price
      const tokenMultiplier = this.tokenService.getPoolTokenBooster(projectName, tokenAddress);
      const tokenHoldBasePoint = tokenTvl.multipliedBy(tokenMultiplier);
      holdBasePoint = holdBasePoint.plus(tokenHoldBasePoint);
    }
    return holdBasePoint;
  }

  async getTokenPriceMap(blockNumber: number): Promise<Map<string, BigNumber>> {
    const allSupportTokens = this.tokenService.getAllSupportTokens();
    const allPriceIds: Set<string> = new Set();
    // do not need to get the price of stable coin(they are default 1 usd)
    allSupportTokens.map((t) => {
      if (t.type !== STABLE_COIN_TYPE) {
        allPriceIds.add(t.cgPriceId);
      }
    });
    const tokenPrices: Map<string, BigNumber> = new Map();
    for (const priceId of allPriceIds) {
      const blockTokenPrice = await this.blockTokenPriceRepository.getBlockTokenPrice(blockNumber, priceId) ?? { usdPrice: 1 };
      if (!blockTokenPrice) {
        throw new Error(`BlockNumber : ${blockNumber}, Token ${priceId} price not found`);
      }
      tokenPrices.set(priceId, new BigNumber(blockTokenPrice.usdPrice));
    }
    return tokenPrices;
  }
}
