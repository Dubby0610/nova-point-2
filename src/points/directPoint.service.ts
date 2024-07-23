import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import { Cron } from "@nestjs/schedule";
import {
  PointsRepository,
  BlockRepository,
  BalanceRepository,
  BlockTokenPriceRepository,
  BlockAddressPointRepository,
  AddressFirstDepositRepository,
} from "../repositories";
import { TokenMultiplier, TokenService } from "../token/token.service";
import BigNumber from "bignumber.js";
import { hexTransformer } from "../transformers/hex.transformer";
import { ConfigService } from "@nestjs/config";
import { getETHPrice, getTokenPrice, STABLE_COIN_TYPE } from "./baseData.service";
import addressMultipliers from "../config/addressMultipliers";
import waitFor from "src/utils/waitFor";

export const LOYALTY_BOOSTER_FACTOR: BigNumber = new BigNumber(0.005);
type BlockAddressTvl = {
  tvl: BigNumber;
  holdBasePoint: BigNumber;
};

@Injectable()
export class DirectPointService extends Worker {
  private readonly logger: Logger;
  private readonly pointsPhase1StartTime: Date;
  private readonly addressMultipliersCache: Map<string, TokenMultiplier[]>;
  private readonly withdrawStartTime: Date;
  private addressFirstDepositTimeCache: Map<string, Date>;

  public constructor(
    private readonly tokenService: TokenService,
    private readonly pointsRepository: PointsRepository,
    private readonly blockTokenPriceRepository: BlockTokenPriceRepository,
    private readonly blockAddressPointRepository: BlockAddressPointRepository,
    private readonly balanceRepository: BalanceRepository,
    private readonly blockRepository: BlockRepository,
    private readonly addressFirstDepositRepository: AddressFirstDepositRepository,
    private readonly configService: ConfigService
  ) {
    super();
    this.logger = new Logger(DirectPointService.name);
    this.pointsPhase1StartTime = new Date(this.configService.get<string>("points.pointsPhase1StartTime"));
    this.addressMultipliersCache = new Map<string, TokenMultiplier[]>();
    for (const m of addressMultipliers) {
      this.addressMultipliersCache.set(m.address.toLowerCase(), m.multipliers);
    }
    const endDate = new Date(this.pointsPhase1StartTime);
    this.withdrawStartTime = new Date(endDate.setMonth(endDate.getMonth() + 1));
    this.addressFirstDepositTimeCache = new Map();
  }

  @Cron("0 2,10,18 * * *")
  protected async runProcess(): Promise<void> {
    try {
      await this.handleHoldPoint();
    } catch (error) {
      this.logger.error("Failed to calculate hold point", error.stack);
    }
  }

  async handleHoldPoint() {
    const currentBlockNumber = await this.balanceRepository.getLatesBlockNumber();
    if (!currentBlockNumber) {
      this.logger.log(`Wait for the next hold point statistical block`);
      return;
    }
    const currentStatisticalBlock = await this.blockRepository.getLastBlock({
      where: {
        number: currentBlockNumber,
      },
    });
    await waitFor(() => false, 60 * 1000, 60 * 1000);

    const statisticStartTime = new Date();
    const earlyBirdMultiplier = this.getEarlyBirdMultiplier(currentStatisticalBlock.timestamp);
    this.logger.log(`Early bird multiplier: ${earlyBirdMultiplier}`);
    const tokenPriceMap = await this.getTokenPriceMap(currentStatisticalBlock.number);
    const blockTs = currentStatisticalBlock.timestamp.getTime();
    const addressTvlMap = await this.getAddressTvlMap(currentStatisticalBlock.number, blockTs, tokenPriceMap);
    for (const address of addressTvlMap.keys()) {
      const fromBlockAddressPoint = await this.blockAddressPointRepository.getBlockAddressPoint(
        currentStatisticalBlock.number,
        address
      );
      if (!!fromBlockAddressPoint && fromBlockAddressPoint.holdPoint > 0) {
        this.logger.log(`Address hold point calculated: ${address}`);
        continue;
      }
      const addressTvl = addressTvlMap.get(address);
      const addressMultiplier = this.getAddressMultiplier(address, blockTs);

      let firstDepositTime = this.addressFirstDepositTimeCache.get(address);
      if (!firstDepositTime) {
        const addressFirstDeposit = await this.addressFirstDepositRepository.getAddressFirstDeposit(address);
        firstDepositTime = addressFirstDeposit?.firstDepositTime;
        if (firstDepositTime) {
          const depositTime = new Date(Math.max(firstDepositTime.getTime(), this.pointsPhase1StartTime.getTime()));
          this.addressFirstDepositTimeCache.set(address, depositTime);
        }
      }
      let groupBooster = new BigNumber(1);
      const loyaltyBooster = this.getLoyaltyBooster(blockTs, firstDepositTime?.getTime());
      // NOVA Point = sum_all tokens in activity list (Early_Bird_Multiplier * Token Multiplier * Address Multiplier * Token Amount * Token Price * (1 + Group Booster + Growth Booster) * Loyalty Booster / ETH_Price )
      const newHoldPoint = addressTvl.holdBasePoint
        .multipliedBy(earlyBirdMultiplier)
        .multipliedBy(groupBooster)
        .multipliedBy(addressMultiplier)
        .multipliedBy(loyaltyBooster);
      await this.updateHoldPoint(currentStatisticalBlock.number, address, newHoldPoint);
    }
    const statisticEndTime = new Date();
    const statisticElapsedTime = statisticEndTime.getTime() - statisticStartTime.getTime();
    this.logger.log(
      `Finish hold point statistic for block: ${currentStatisticalBlock.number}, elapsed time: ${
        statisticElapsedTime / 1000
      } seconds`
    );
  }

  async getAddressTvlMap(
    blockNumber: number,
    blockTs: number,
    tokenPriceMap: Map<string, BigNumber>
  ): Promise<Map<string, BlockAddressTvl>> {
    const addressTvlMap: Map<string, BlockAddressTvl> = new Map();
    const addressBufferList = await this.balanceRepository.getAllAddressesByBlock(blockNumber);
    this.logger.log(`The address list length: ${addressBufferList.length}`);
    for (const addressBuffer of addressBufferList) {
      const address = hexTransformer.from(addressBuffer);
      const addressTvl = await this.calculateAddressTvl(address, blockNumber, tokenPriceMap, blockTs);
      if (addressTvl.tvl.gt(new BigNumber(0))) {
        //this.logger.log(`Address ${address}: [tvl: ${addressTvl.tvl}, holdBasePoint: ${addressTvl.holdBasePoint}]`);
      }
      addressTvlMap.set(address, addressTvl);
    }
    return addressTvlMap;
  }

  public getAddressMultiplier(address: string, blockTs: number): BigNumber {
    const multipliers = this.addressMultipliersCache.get(address.toLowerCase());
    if (!multipliers || multipliers.length == 0) {
      return new BigNumber(1);
    }
    multipliers.sort((a, b) => b.timestamp - a.timestamp);
    for (const m of multipliers) {
      if (blockTs >= m.timestamp * 1000) {
        return new BigNumber(m.multiplier);
      }
    }
    return new BigNumber(multipliers[multipliers.length - 1].multiplier);
  }

  async calculateAddressTvl(
    address: string,
    blockNumber: number,
    tokenPrices: Map<string, BigNumber>,
    blockTs: number
  ): Promise<BlockAddressTvl> {
    const addressBuffer: Buffer = hexTransformer.to(address);
    const addressBalances = await this.balanceRepository.getAccountBalancesByBlock(addressBuffer, blockNumber);
    let tvl: BigNumber = new BigNumber(0);
    let holdBasePoint: BigNumber = new BigNumber(0);
    for (const addressBalance of addressBalances) {
      // filter not support token
      const tokenAddress: string = hexTransformer.from(addressBalance.tokenAddress);
      const tokenInfo = this.tokenService.getSupportToken(tokenAddress);
      if (!tokenInfo) {
        continue;
      }
      const tokenPrice = getTokenPrice(tokenInfo, tokenPrices);
      const ethPrice = getETHPrice(tokenPrices);
      const tokenAmount = new BigNumber(addressBalance.balance).dividedBy(new BigNumber(10).pow(tokenInfo.decimals));
      const tokenTvl = tokenAmount.multipliedBy(tokenPrice).dividedBy(ethPrice);
      // base point = Token Multiplier * Token Amount * Token Price / ETH_Price
      const tokenMultiplier = this.tokenService.getTokenMultiplier(tokenInfo, blockTs);
      const tokenHoldBasePoint = tokenTvl.multipliedBy(new BigNumber(tokenMultiplier));
      tvl = tvl.plus(tokenTvl);
      holdBasePoint = holdBasePoint.plus(tokenHoldBasePoint);
    }
    return {
      tvl,
      holdBasePoint,
    };
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
      const blockTokenPrice = await this.blockTokenPriceRepository.getBlockTokenPrice(blockNumber, priceId);
      if (!blockTokenPrice) {
        throw new Error(`Token ${priceId} price not found at blocknumber:${blockNumber}`);
      }
      tokenPrices.set(priceId, new BigNumber(blockTokenPrice.usdPrice));
    }
    return tokenPrices;
  }

  async updateHoldPoint(blockNumber: number, from: string, holdPoint: BigNumber) {
    // update point of user
    let fromBlockAddressPoint = await this.blockAddressPointRepository.getBlockAddressPoint(blockNumber, from);
    if (!fromBlockAddressPoint) {
      fromBlockAddressPoint = this.blockAddressPointRepository.createDefaultBlockAddressPoint(blockNumber, from);
    }
    let fromAddressPoint = await this.pointsRepository.getPointByAddress(from);
    if (!fromAddressPoint) {
      fromAddressPoint = this.pointsRepository.createDefaultPoint(from);
    }
    fromBlockAddressPoint.holdPoint = holdPoint.toNumber();
    fromAddressPoint.stakePoint = Number(fromAddressPoint.stakePoint) + holdPoint.toNumber();
    this.logger.log(`Address ${from} get hold point: ${holdPoint}`);
    // update point of referrer
    await this.blockAddressPointRepository.upsertUserAndReferrerPoint(fromBlockAddressPoint, fromAddressPoint);
  }

  isWithdrawStartPhase(blockTs: number): boolean {
    return blockTs >= this.withdrawStartTime.getTime();
  }

  getLoyaltyBooster(blockTs: number, firstDepositTs: number | null): BigNumber {
    if (!this.isWithdrawStartPhase(blockTs)) {
      return new BigNumber(1);
    }

    if (!firstDepositTs) {
      return new BigNumber(1);
    }

    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const diffInMilliseconds = blockTs - firstDepositTs;
    const loyaltyDays = new BigNumber(Math.floor(diffInMilliseconds / millisecondsPerDay));
    let loyaltyBooster = loyaltyDays.multipliedBy(LOYALTY_BOOSTER_FACTOR);
    loyaltyBooster = BigNumber.min(0.5, loyaltyBooster);
    return loyaltyBooster.plus(1);
  }

  getEarlyBirdMultiplier(blockTs: Date): BigNumber {
    // 1st week: 2,second week:1.5,third,forth week ~ within 1 month :1.2,1 month later: 1,
    const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
    const startDate = this.pointsPhase1StartTime;
    const diffInMilliseconds = blockTs.getTime() - startDate.getTime();
    const diffInWeeks = Math.floor(diffInMilliseconds / millisecondsPerWeek);
    if (diffInWeeks < 1) {
      return new BigNumber(2);
    } else if (diffInWeeks < 2) {
      return new BigNumber(1.5);
    } else if (!this.isWithdrawStartPhase(blockTs.getTime())) {
      return new BigNumber(1.2);
    } else {
      return new BigNumber(1);
    }
  }
}
