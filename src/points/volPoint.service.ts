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
import { PointsOfLp, TransactionDataOfPoints } from "src/entities";
import { CacheRepository } from "../../../lrt-points-distribute/src/repositories/cache.repository";
import { toLowerCase } from "../../../nova-point-redistribute/src/utils/point";
import { BlockAddressPoint } from "../entities/blockAddressPoint.entity";
import { BlockAddressPointOfLp } from "../../../lrt-points-distribute/src/entities/blockAddressPointOfLp.entity";
import { TransactionDataOfPointsRepository } from "../repositories/TransactionDataOfPoints.repository";

export const LOYALTY_BOOSTER_FACTOR: BigNumber = new BigNumber(0.005);
type BlockAddressTvl = {
  tvl: BigNumber;
  holdBasePoint: BigNumber;
};

const volLastBlockNumberKey = "volLastBlockNumber";
const transactionDataBlockNumberKey = "transactionDataBlockNumber";

@Injectable()
export class VolPointService extends Worker {
  private readonly logger: Logger;
  private readonly pointsPhase1StartTime: Date;
  private readonly addressMultipliersCache: Map<string, TokenMultiplier[]>;
  private readonly withdrawStartTime: Date;
  private addressFirstDepositTimeCache: Map<string, Date>;

  public constructor(
    private readonly tokenService: TokenService,
    private readonly cacheRepository: CacheRepository,
    private readonly transactionDataOfPointsRepository: TransactionDataOfPointsRepository,
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
    this.logger = new Logger(VolPointService.name);
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
    this.logger.log(`${VolPointService.name} initialized`);
    try {
      await this.handleHoldPoint();
    } catch (error) {
      this.logger.error("Failed to calculate hold point", error.stack);
    }
  }

  /**
   * 1.get last time to table cache on pgsql, if not use current time.
   * 2.get records from last time.
   * 3. save new last time to table cache on pgsql
   */
  async handleHoldPoint() {
    const lastBlockNumberStr = await this.cacheRepository.getValue(volLastBlockNumberKey);
    const lastBlockNumber = lastBlockNumberStr ? Number(lastBlockNumberStr) : 0;
    const endBlockNumberStr = await this.cacheRepository.getValue(transactionDataBlockNumberKey);
    const endBlockNumber = endBlockNumberStr ? Number(endBlockNumberStr) : 0;
    const volDetails: TransactionDataOfPoints[] = await this.transactionDataOfPointsRepository.getListByBlockNumber(
      lastBlockNumber,
      endBlockNumber
    );
    if (volDetails.length === 0) {
      this.logger.error(`volume details is empty, from lastBlockNumber: ${lastBlockNumber}`);
      return;
    }
    // get all addresses
    let addresses: string[] = [];
    for (let i = 0; i < volDetails.length; i++) {
      const address = volDetails[i].userAddress;
      if (!addresses.includes(address)) {
        addresses.push(address);
      }
    }
    // get all first deposit time
    const addressFirstDepositList: AddressFirstDeposit[] =
      await this.addressFirstDepositRepository.getAllAddressesFirstDeposits(addresses);
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
    let addressPointMap: Map<string, PointsOfLp> = new Map();
    let blockAddressPointMap: Map<string, BlockAddressPointOfLp> = new Map();
    const addressPointList: PointsOfLp[] = await this.pointsOfLpRepository.getPointByAddresses(addresses);
    this.logger.log(`Address point map size: ${addressPointList.length}`);
    for (let i = 0; i < addressPointList.length; i++) {
      const item = addressPointList[i];
      const tmpAddress = item.address.toLocaleLowerCase();
      const tmpPairAddress = item.pairAddress.toLocaleLowerCase();
      if (tmpAddress && tmpPairAddress) {
        const key = `${tmpAddress}-${tmpPairAddress}`;
        addressPointMap.set(key, item);
      }
    }

    for (let i = 0; i < volDetails.length; i++) {
      const item = volDetails[i];
      const itemBlockNumber = item.blockNumber;
      const itemTimestamp = item.timestamp.getTime() / 1000;
      const itemUserAddress = item.userAddress.toLowerCase();
      const itemPoolAddress = item.contractAddress.toLowerCase();
      const itemVolume = new BigNumber(item.quantity)
        .dividedBy(BigNumber(10 ** item.decimals))
        .multipliedBy(BigNumber(item.price));
      const basePoint = itemVolume;
      // pool booster
      const addressBooster = this.getAddressMultiplier(itemPoolAddress, itemTimestamp);
      // token booster
      const tokenInfo = this.tokenService.getSupportToken(item.tokenAddress);
      if (!tokenInfo) {
        this.logger.error(`token is not supported, ${JSON.stringify(tokenInfo)}`);
        continue;
      }
      const tokenBooster = this.tokenService.getTokenMultiplier(tokenInfo, itemTimestamp);
      // loyalty booster
      let loyaltyBooster = new BigNumber(1);
      const addressFirstDeposit = addressFirstDepositMap[itemUserAddress];
      if (addressFirstDeposit && addressFirstDeposit.firstDepositTime) {
        const firstDepositTime = addressFirstDeposit.firstDepositTime;
        loyaltyBooster = this.getLoyaltyBooster(itemTimestamp, firstDepositTime.getTime());
      } else {
        this.logger.log(
          `get address first deposit empty, address is : ${itemUserAddress}, fistDeposit is : ${JSON.stringify(addressFirstDeposit)}`
        );
      }
      // group booster
      let groupBooster = new BigNumber(1);
      const newHoldPoint = basePoint
        .multipliedBy(addressBooster)
        .multipliedBy(tokenBooster)
        .multipliedBy(loyaltyBooster)
        .multipliedBy(groupBooster);

      const fromBlockAddressPointKey = `${itemUserAddress}-${itemPoolAddress}-${itemBlockNumber}`;
      if (!blockAddressPointMap.has(fromBlockAddressPointKey)) {
        this.logger.log(`get block address point empty, key is : ${fromBlockAddressPointKey}`);
        blockAddressPointMap.set(fromBlockAddressPointKey, {
          blockNumber: itemBlockNumber,
          address: itemUserAddress,
          pairAddress: itemPoolAddress,
          holdPoint: newHoldPoint.toNumber(),
        });
      } else {
        const fromBlockAddressPoint = blockAddressPointMap.get(fromBlockAddressPointKey);
        fromBlockAddressPoint.holdPoint += newHoldPoint.toNumber();
      }

      const fromAddressPointKey = `${itemUserAddress}-${itemPoolAddress}`;
      if (!addressPointMap.has(fromAddressPointKey)) {
        this.logger.log(`get address point empty, key is : ${fromAddressPointKey}`);
        addressPointMap.set(fromAddressPointKey, {
          id: 0,
          address: itemUserAddress,
          pairAddress: itemPoolAddress,
          stakePoint: newHoldPoint.toNumber(),
        });
      } else {
        const fromAddressPoint = addressPointMap.get(fromAddressPointKey);
        fromAddressPoint.stakePoint += newHoldPoint.toNumber();
      }
    }

    const blockAddressPointArr = Array.from(blockAddressPointMap.values());
    const addressPointArr = Array.from(addressPointMap.values());
    await this.blockAddressPointOfLpRepository.addManyIgnoreConflicts(blockAddressPointArr);
    this.logger.log(`Finish volpoint blockAddressPointArr, length: ${blockAddressPointArr.length}`);
    await this.pointsOfLpRepository.addManyOrUpdate(addressPointArr, ["stakePoint"], ["address", "pairAddress"]);
    this.logger.log(`Finish volpoint addressPointArr, length: ${addressPointArr.length}`);
    await this.cacheRepository.setValue(volLastBlockNumberKey, endBlockNumberStr);
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
