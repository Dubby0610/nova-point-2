import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import waitFor from "../utils/waitFor";
import {
  PointsOfLpRepository,
  BlockRepository,
  BalanceOfLpRepository,
  BlockTokenPriceRepository,
  BlockAddressPointOfLpRepository,
  InviteRepository,
  ReferrerRepository,
  AddressFirstDepositRepository,
} from "../repositories";
import { TokenMultiplier, TokenService } from "../token/token.service";
import BigNumber from "bignumber.js";
import { hexTransformer } from "../transformers/hex.transformer";
import { ConfigService } from "@nestjs/config";
import { getETHPrice, getTokenPrice, REFERRER_BONUS, STABLE_COIN_TYPE } from "./depositPoint.service";
import addressMultipliers from "../addressMultipliers";

export const LOYALTY_BOOSTER_FACTOR: BigNumber = new BigNumber(0.005);
type BlockAddressTvl = {
  tvl: BigNumber;
  holdBasePoint: BigNumber;
};

@Injectable()
export class HoldLpPointService extends Worker {
  private readonly logger: Logger;
  private readonly pointsStatisticalPeriodSecs: number;
  private readonly pointsPhase1StartTime: Date;
  private readonly addressMultipliersCache: Map<string, TokenMultiplier[]>;
  private readonly withdrawStartTime: Date;
  private addressFirstDepositTimeCache: Map<string, Date>;

  public constructor(
    private readonly tokenService: TokenService,
    private readonly pointsOfLpRepository: PointsOfLpRepository,
    private readonly blockRepository: BlockRepository,
    private readonly blockTokenPriceRepository: BlockTokenPriceRepository,
    private readonly blockAddressPointOfLpRepository: BlockAddressPointOfLpRepository,
    private readonly balanceOfLpRepository: BalanceOfLpRepository,
    private readonly inviteRepository: InviteRepository,
    private readonly referrerRepository: ReferrerRepository,
    private readonly addressFirstDepositRepository: AddressFirstDepositRepository,
    private readonly configService: ConfigService
  ) {
    super();
    this.logger = new Logger(HoldLpPointService.name);
    this.pointsStatisticalPeriodSecs = this.configService.get<number>("points.pointsStatisticalPeriodSecs");
    this.pointsPhase1StartTime = new Date(this.configService.get<string>("points.pointsPhase1StartTime"));
    this.addressMultipliersCache = new Map<string, TokenMultiplier[]>();
    for (const m of addressMultipliers) {
      this.addressMultipliersCache.set(m.address.toLowerCase(), m.multipliers);
    }
    const endDate = new Date(this.pointsPhase1StartTime);
    this.withdrawStartTime = new Date(endDate.setMonth(endDate.getMonth() + 1));
    this.addressFirstDepositTimeCache = new Map();
  }

  protected async runProcess(): Promise<void> {
    try {
      await this.handleHoldPoint();
    } catch (error) {
      this.logger.error("Failed to calculate hold point", error.stack);
    }

    await waitFor(() => !this.currentProcessPromise, 30 * 1000, 30 * 1000);
    if (!this.currentProcessPromise) {
      return;
    }

    return this.runProcess();
  }

  async handleHoldPoint() {
    // hold point statistical block number start from 1
    // query the last hold point statistical block number
    const lastStatisticalBlockNumber = await this.pointsOfLpRepository.getLastHoldPointStatisticalBlockNumber();
    const lastStatisticalBlock = await this.blockRepository.getLastBlock({
      where: { number: lastStatisticalBlockNumber },
      select: { number: true, timestamp: true },
    });
    if (!lastStatisticalBlock) {
      throw new Error(`Last hold point of lp statistical block not found: ${lastStatisticalBlockNumber}`);
    }
    // get the last block time.
    const lastStatisticalTs = lastStatisticalBlock.timestamp;
    // pointsStatisticalPeriodSecs default 3600
    const currentStatisticalTs = new Date(lastStatisticalTs.getTime() + this.pointsStatisticalPeriodSecs * 1000);
    // get the next hold point statistical block
    const currentStatisticalBlock = await this.blockRepository.getNextHoldPointStatisticalBlock(currentStatisticalTs);
    if (!currentStatisticalBlock) {
      this.logger.log(`Wait for the next hold point statistical block`);
      return;
    }
    // const lastDepositStatisticalBlockNumber = await this.pointsOfLpRepository.getLastStatisticalBlockNumber();
    // if (lastDepositStatisticalBlockNumber < currentStatisticalBlock.number) {
    //   this.logger.log(`Wait deposit statistic finish`);
    //   return;
    // }

    // current timestamp - last timestamp
    const sinceLastTime = currentStatisticalBlock.timestamp.getTime() - lastStatisticalTs.getTime();
    this.logger.log(
      `Statistic hold point at block: ${currentStatisticalBlock.number}, since last: ${sinceLastTime / 1000} seconds`
    );
    const statisticStartTime = new Date();
    // get the early bird weight
    const earlyBirdMultiplier = this.getEarlyBirdMultiplier(currentStatisticalBlock.timestamp);
    this.logger.log(`Early bird multiplier: ${earlyBirdMultiplier}`);
    const tokenPriceMap = await this.getTokenPriceMap(currentStatisticalBlock.number);
    const blockTs = currentStatisticalBlock.timestamp.getTime();
    const addressTvlMap = await this.getAddressTvlMap(currentStatisticalBlock.number, blockTs, tokenPriceMap);
    const groupTvlMap = await this.getGroupTvlMap(currentStatisticalBlock.number, addressTvlMap);
    // loop all address to calculate hold point
    for (const key of addressTvlMap.keys()) {
      const [address, pairAddress] = key.split("-");
      const addressTvl = addressTvlMap.get(key);
      const fromBlockAddressPoint = await this.blockAddressPointOfLpRepository.getBlockAddressPoint(
        currentStatisticalBlock.number,
        address,
        pairAddress
      );
      if (!!fromBlockAddressPoint && fromBlockAddressPoint.holdPoint > 0) {
        this.logger.log(`Address hold point calculated: ${address}`);
        continue;
      }
      let groupBooster = new BigNumber(1);
      // get the last multiplier before the block timestamp
      const addressMultiplier = this.getAddressMultiplier(pairAddress, blockTs);
      const invite = await this.inviteRepository.getInvite(pairAddress);
      if (!!invite) {
        const groupTvl = groupTvlMap.get(invite.groupId);
        if (!!groupTvl) {
          groupBooster = groupBooster.plus(this.getGroupBooster(groupTvl));
        }
      }
      let firstDepositTime = this.addressFirstDepositTimeCache.get(pairAddress);
      if (!firstDepositTime) {
        const addressFirstDeposit = await this.addressFirstDepositRepository.getAddressFirstDeposit(pairAddress);
        firstDepositTime = addressFirstDeposit?.firstDepositTime;
        if (firstDepositTime) {
          const depositTime = new Date(Math.max(firstDepositTime.getTime(), this.pointsPhase1StartTime.getTime()));
          this.addressFirstDepositTimeCache.set(pairAddress, depositTime);
        }
      }
      const loyaltyBooster = this.getLoyaltyBooster(blockTs, firstDepositTime?.getTime());
      // NOVA Point = sum_all tokens in activity list (Early_Bird_Multiplier * Token Multiplier * Address Multiplier * Token Amount * Token Price * (1 + Group Booster + Growth Booster) * Loyalty Booster / ETH_Price )

      this.logger.log(
        `pairAddrss ${pairAddress} earlyBirdMultiplier: ${earlyBirdMultiplier}, addressMultiplier: ${addressMultiplier}, loyaltyBooster: ${loyaltyBooster}, groupBooster: ${groupBooster}`
      );
      const newHoldPoint = addressTvl.holdBasePoint
        .multipliedBy(earlyBirdMultiplier)
        // use pairAddress caculate the groupBooster addressMultiplier loyaltyBooster
        .multipliedBy(groupBooster)
        .multipliedBy(addressMultiplier)
        .multipliedBy(loyaltyBooster);
      await this.updateHoldPoint(currentStatisticalBlock.number, pairAddress, address, newHoldPoint);
    }
    await this.pointsOfLpRepository.setHoldPointStatisticalBlockNumber(currentStatisticalBlock.number);
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
    const addressTvlMap: Map<string, BlockAddressTvl> = new Map(); // key is `${address}-${pairAddress}`
    // get address and pairAddress
    const addressBufferList = await this.balanceOfLpRepository.getAllAddressesByBlock(blockNumber);
    this.logger.log(`The address list length: ${addressBufferList.length}`);
    for (const addressBuffer of addressBufferList) {
      const address = hexTransformer.from(addressBuffer.address);
      const pairAddress = hexTransformer.from(addressBuffer.pairAddress);
      const addressTvl = await this.calculateAddressTvl(address, pairAddress, blockNumber, tokenPriceMap, blockTs);
      if (addressTvl.tvl.gt(new BigNumber(0))) {
        this.logger.log(
          `PairAddress ${pairAddress}, Address ${address}: [tvl: ${addressTvl.tvl}, holdBasePoint: ${addressTvl.holdBasePoint}]`
        );
      }
      const tmpKeys = `${address}-${pairAddress}`;
      addressTvlMap.set(tmpKeys, addressTvl);
    }
    return addressTvlMap;
  }

  // find the latest multiplier before the block timestamp
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
    pairAddress: string,
    blockNumber: number,
    tokenPrices: Map<string, BigNumber>,
    blockTs: number
  ): Promise<BlockAddressTvl> {
    const addressBuffer: Buffer = hexTransformer.to(address);
    const pairAddressBuffer: Buffer = hexTransformer.to(pairAddress);
    const addressBalances = await this.balanceOfLpRepository.getAccountBalancesByBlock(
      addressBuffer,
      pairAddressBuffer,
      blockNumber
    );
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

  async getGroupTvlMap(
    blockNumber: number,
    addressTvlMap: Map<string, BlockAddressTvl>
  ): Promise<Map<string, BigNumber>> {
    const groupTvlMap = new Map<string, BigNumber>();
    const allGroupIds = await this.inviteRepository.getAllGroups();
    this.logger.log(`All group length: ${allGroupIds.length}`);
    // loop addressTvlMap and split key, and then group by address
    const pairAddressTvlMap: Map<string, BlockAddressTvl> = new Map();
    for (const key of addressTvlMap.keys()) {
      const [_, pairAddress] = key.split("-");
      const addressTvl = addressTvlMap.get(key);
      if (pairAddressTvlMap.has(pairAddress)) {
        const pairAddressTvl = pairAddressTvlMap.get(pairAddress);
        pairAddressTvl.tvl = pairAddressTvl.tvl.plus(addressTvl.tvl);
      } else {
        pairAddressTvlMap.set(pairAddress, addressTvl);
      }
    }
    for (const groupId of allGroupIds) {
      let groupTvl = new BigNumber(0);
      const members = await this.inviteRepository.getGroupMembersByBlock(groupId, blockNumber);
      for (const member of members) {
        const memberTvl = pairAddressTvlMap.get(member);
        if (!!memberTvl) {
          groupTvl = groupTvl.plus(memberTvl.tvl);
        }
      }
      if (groupTvl.gt(new BigNumber(0))) {
        this.logger.log(`Group ${groupId} tvl: ${groupTvl}`);
      }
      groupTvlMap.set(groupId, new BigNumber(groupTvl));
    }
    return groupTvlMap;
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
        throw new Error(`Token ${priceId} price not found`);
      }
      tokenPrices.set(priceId, new BigNumber(blockTokenPrice.usdPrice));
    }
    return tokenPrices;
  }

  async updateHoldPoint(blockNumber: number, pairAddress: string, from: string, holdPoint: BigNumber) {
    // update point of user
    let fromBlockAddressPoint = await this.blockAddressPointOfLpRepository.getBlockAddressPoint(
      blockNumber,
      from,
      pairAddress
    );
    if (!fromBlockAddressPoint) {
      fromBlockAddressPoint = this.blockAddressPointOfLpRepository.createDefaultBlockAddressPoint(
        blockNumber,
        from,
        pairAddress
      );
    }
    let fromAddressPoint = await this.pointsOfLpRepository.getPointByAddress(from, pairAddress);
    if (!fromAddressPoint) {
      fromAddressPoint = this.pointsOfLpRepository.createDefaultPoint(from, pairAddress);
    }
    fromBlockAddressPoint.holdPoint = holdPoint.toNumber();
    fromAddressPoint.stakePoint = Number(fromAddressPoint.stakePoint) + holdPoint.toNumber();
    this.logger.log(`PairAddrss ${pairAddress}, Address ${from} get hold point: ${holdPoint}`);
    // update point of referrer
    /*
    let referrerBlockAddressPoint: BlockAddressPoint;
    let referrerAddressPoint: Point;
    const referral = await this.referrerRepository.getReferral(from);
    const referrer = referral?.referrer;
    if (!!referrer) {
      referrerBlockAddressPoint = await this.blockAddressPointOfLpRepository.getBlockAddressPoint(
        blockNumber,
        referrer
      );
      if (!referrerBlockAddressPoint) {
        referrerBlockAddressPoint = this.blockAddressPointOfLpRepository.createDefaultBlockAddressPoint(
          blockNumber,
          referrer
        );
      }
      referrerAddressPoint = await this.pointsOfLpRepository.getPointByAddress(referrer);
      if (!referrerAddressPoint) {
        referrerAddressPoint = this.pointsOfLpRepository.createDefaultPoint(referrer);
      }
      const referrerBonus = holdPoint.multipliedBy(REFERRER_BONUS);
      referrerBlockAddressPoint.refPoint = Number(referrerBlockAddressPoint.refPoint) + referrerBonus.toNumber();
      referrerAddressPoint.refPoint = Number(referrerAddressPoint.refPoint) + referrerBonus.toNumber();
      this.logger.log(`Referrer ${referrer} get ref point from hold: ${referrerBonus}`);
    }
    */
    await this.blockAddressPointOfLpRepository.upsertUserAndReferrerPoint(
      fromBlockAddressPoint,
      fromAddressPoint
      // referrerBlockAddressPoint,
      // referrerAddressPoint
    );
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
    const loyaltyBooster = loyaltyDays.multipliedBy(LOYALTY_BOOSTER_FACTOR);
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

  getGroupBooster(groupTvl: BigNumber): BigNumber {
    if (groupTvl.gte(5000)) {
      return new BigNumber(0.5);
    } else if (groupTvl.gte(1000)) {
      return new BigNumber(0.4);
    } else if (groupTvl.gte(500)) {
      return new BigNumber(0.3);
    } else if (groupTvl.gte(100)) {
      return new BigNumber(0.2);
    } else if (groupTvl.gte(20)) {
      return new BigNumber(0.1);
    } else {
      return new BigNumber(0);
    }
  }
}
