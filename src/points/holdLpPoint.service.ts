import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
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
import { Cron } from "@nestjs/schedule";
import { BalanceOfLpDto } from "../repositories/balanceOfLp.repository";
import { AddressFirstDeposit } from "src/entities/addressFirstDeposit.entity";
import { PointsOfLp } from "src/entities";

export const LOYALTY_BOOSTER_FACTOR: BigNumber = new BigNumber(0.005);
type BlockAddressTvl = {
  tvl: BigNumber;
  holdBasePoint: BigNumber;
};

@Injectable()
export class HoldLpPointService extends Worker {
  private readonly logger: Logger;
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
    this.pointsPhase1StartTime = new Date(this.configService.get<string>("points.pointsPhase1StartTime"));
    this.addressMultipliersCache = new Map<string, TokenMultiplier[]>();
    for (const m of addressMultipliers) {
      this.addressMultipliersCache.set(m.address.toLowerCase(), m.multipliers);
    }
    const endDate = new Date(this.pointsPhase1StartTime);
    this.withdrawStartTime = new Date(endDate.setMonth(endDate.getMonth() + 1));
    this.addressFirstDepositTimeCache = new Map();
  }

  @Cron("0 0,8,16 * * *")
  protected async runProcess(): Promise<void> {
    this.logger.log(`${HoldLpPointService.name} initialized`);
    try {
      await this.handleHoldPoint();
    } catch (error) {
      this.logger.error("Failed to calculate hold point", error.stack);
    }
  }

  async handleHoldPoint() {
    // get last balance of lp statistical block number
    const lastBalanceOfLp = await this.balanceOfLpRepository.getLastOrderByBlock();
    if (!lastBalanceOfLp) {
      this.logger.log(`No balance of lp found`);
      return;
    }
    const lastStatisticalBlockNumber = lastBalanceOfLp.blockNumber;
    const currentStatisticalBlock = await this.blockRepository.getLastBlock({
      where: { number: lastStatisticalBlockNumber },
      select: { number: true, timestamp: true },
    });
    if (!currentStatisticalBlock) {
      this.logger.log(`No block of lp found, block number : ${lastStatisticalBlockNumber}`);
      return;
    }
    const statisticStartTime = new Date();
    // get the early bird weight
    const earlyBirdMultiplier = this.getEarlyBirdMultiplier(currentStatisticalBlock.timestamp);
    this.logger.log(`Early bird multiplier: ${earlyBirdMultiplier}`);
    const tokenPriceMap = await this.getTokenPriceMap(currentStatisticalBlock.number);
    const blockTs = currentStatisticalBlock.timestamp.getTime();
    const addressTvlMap = await this.getAddressTvlMap(currentStatisticalBlock.number, blockTs, tokenPriceMap);
    this.logger.log(`Address tvl map size: ${addressTvlMap.size}`);
    let addresses = [];
    for (const key of addressTvlMap.keys()) {
      const [address, _] = key.split("-");
      if (!addresses.includes(address)) {
        addresses.push(address);
      }
    }
    this.logger.log(`Address list size: ${addresses.length}`);
    // get all first deposit time
    const addressFirstDepositList = await this.addressFirstDepositRepository.getAllAddressesFirstDeposits(addresses);
    this.logger.log(`Address first deposit map size: ${addressFirstDepositList.length}`);
    const addressFirstDepositMap: { [address: string]: AddressFirstDeposit } = {};
    for (let i = 0; i < addressFirstDepositList.length; i++) {
      const item = addressFirstDepositList[i];
      const tmpAddress = item.address.toLocaleLowerCase();
      if (tmpAddress) {
        addressFirstDepositMap[tmpAddress] = item;
      }
    }
    // get all point of lp by addresses
    const addressPointList = await this.pointsOfLpRepository.getPointByAddresses(addresses);
    this.logger.log(`Address point map size: ${addressPointList.length}`);
    const addressPointMap: { [address: string]: PointsOfLp } = {};
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
    for (const key of addressTvlMap.keys()) {
      const [address, pairAddress] = key.split("-");
      const addressTvl = addressTvlMap.get(key);
      // get the last multiplier before the block timestamp
      const addressMultiplier = this.getAddressMultiplier(pairAddress, blockTs);
      const addressFirstDeposit = addressFirstDepositMap[address.toLowerCase()];
      const firstDepositTime = addressFirstDeposit?.firstDepositTime;
      const loyaltyBooster = this.getLoyaltyBooster(blockTs, firstDepositTime?.getTime());
      const newHoldPoint = addressTvl.holdBasePoint
        .multipliedBy(earlyBirdMultiplier)
        // use pairAddress caculate the groupBooster addressMultiplier loyaltyBooster
        .multipliedBy(groupBooster)
        .multipliedBy(addressMultiplier)
        .multipliedBy(loyaltyBooster);
      const fromBlockAddressPoint = {
        blockNumber: currentStatisticalBlock.number,
        address: address,
        pairAddress: pairAddress,
        holdPoint: newHoldPoint.toNumber(),
      };
      blockAddressPointArr.push(fromBlockAddressPoint);
      // let fromAddressPoint = await this.pointsOfLpRepository.getPointByAddress(address, pairAddress);
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
      this.logger.log(`address:${address}, pairAddress:${pairAddress}, fromAddressPoint: ${JSON.stringify(fromAddressPoint)}`);
    }
    this.logger.log(`Start insert into db for block: ${currentStatisticalBlock.number}`);
    await this.blockAddressPointOfLpRepository.addManyIgnoreConflicts(blockAddressPointArr);
    this.logger.log(
      `Finish blockAddressPointArr for block: ${currentStatisticalBlock.number}, length: ${blockAddressPointArr.length}`
    );
    await this.pointsOfLpRepository.addManyOrUpdate(addressPointArr, ["stakePoint"], ["address", "pairAddress"]);
    this.logger.log(
      `Finish addressPointArr for block: ${currentStatisticalBlock.number}, length: ${addressPointArr.length}`
    );
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
    const addressPairAddressList = await this.balanceOfLpRepository.getAllAddressesByBlock(blockNumber);
    this.logger.log(`The address list length: ${addressPairAddressList.length}`);
    // get all blockNumber
    let blockNumbers = [];
    for (let i = 0; i < addressPairAddressList.length; i++) {
      if (blockNumbers.includes(addressPairAddressList[i].blockNumber)) {
        continue;
      }
      blockNumbers.push(addressPairAddressList[i].blockNumber);
    }
    this.logger.log(`The block number list length: ${blockNumbers.length}`);
    if (blockNumbers.length === 0) {
      return addressTvlMap;
    }
    const balanceList = await this.balanceOfLpRepository.getAllByBlocks(blockNumbers);
    this.logger.log(`The all address list length: ${balanceList.length}`);
    let balanceMap = new Map<string, BalanceOfLpDto[]>();
    for (let index = 0; index < balanceList.length; index++) {
      const balance = balanceList[index];
      const address = hexTransformer.from(balance.address);
      const pairAddress = hexTransformer.from(balance.pairAddress);
      const key = `${address}-${pairAddress}-${balance.blockNumber}`;
      if (balanceMap.has(key)) {
        balanceMap.get(key).push(balance);
      } else {
        balanceMap.set(key, [balance]);
      }
    }
    for (const item of addressPairAddressList) {
      const address = hexTransformer.from(item.address);
      const pairAddress = hexTransformer.from(item.pairAddress);
      const key = `${address}-${pairAddress}-${item.blockNumber}`;
      const addressTvl = await this.calculateAddressTvl(balanceMap.get(key), tokenPriceMap, blockTs);
      if (addressTvl.holdBasePoint.isZero()) {
        // this.logger.log(`Address hold point is zero: ${key}`);
        continue;
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
    addressBalances: BalanceOfLpDto[],
    tokenPrices: Map<string, BigNumber>,
    blockTs: number
  ): Promise<BlockAddressTvl> {
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
        throw new Error(`BlockNumber : ${blockNumber}, Token ${priceId} price not found`);
      }
      tokenPrices.set(priceId, new BigNumber(blockTokenPrice.usdPrice));
    }
    return tokenPrices;
  }

  async updateHoldPoint(blockNumber: number, pairAddress: string, from: string, holdPoint: BigNumber) {
    const fromBlockAddressPoint = {
      blockNumber: blockNumber,
      address: from,
      pairAddress: pairAddress,
      holdPoint: holdPoint.toNumber(),
    };
    let fromAddressPoint = await this.pointsOfLpRepository.getPointByAddress(from, pairAddress);
    if (!fromAddressPoint) {
      fromAddressPoint = {
        id: 0,
        address: from,
        pairAddress: pairAddress,
        stakePoint: 0,
      };
    }
    fromAddressPoint.stakePoint = Number(fromAddressPoint.stakePoint) + holdPoint.toNumber();
    this.logger.log(`PairAddrss ${pairAddress}, Address ${from} get hold point: ${holdPoint}`);
    await this.blockAddressPointOfLpRepository.upsertUserAndReferrerPoint(fromBlockAddressPoint, fromAddressPoint);
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
