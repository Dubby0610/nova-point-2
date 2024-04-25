import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import waitFor from "../utils/waitFor";
import {
  PointsRepository,
  BlockRepository,
  TransferRepository,
  BlockTokenPriceRepository,
  BlockAddressPointRepository,
  ReferrerRepository,
  AddressFirstDepositRepository,
} from "../repositories";
import {
  ITokenMarketChartProviderResponse,
  TokenOffChainDataProvider,
} from "../token/tokenOffChainData/tokenOffChainDataProvider.abstract";
import { Token, TokenService } from "../token/token.service";
import BigNumber from "bignumber.js";
import { Block, BlockAddressPoint, Point, Transfer } from "../entities";
import { hexTransformer } from "../transformers/hex.transformer";
import { ConfigService } from "@nestjs/config";
import { AddressFirstDeposit } from "../entities/addressFirstDeposit.entity";

export const STABLE_COIN_TYPE = "Stablecoin";
export const ETHEREUM_CG_PRICE_ID = "ethereum";
export const DEPOSIT_MULTIPLIER: BigNumber = new BigNumber(10);
export const REFERRER_BONUS: BigNumber = new BigNumber(0.1);

export function getTokenPrice(token: Token, tokenPrices: Map<string, BigNumber>): BigNumber {
  let price: BigNumber;
  if (token.type === STABLE_COIN_TYPE) {
    price = new BigNumber(1);
  } else {
    price = tokenPrices.get(token.cgPriceId);
  }
  if (!price) {
    throw new Error(`Token ${token.symbol} price not found`);
  }
  return price;
}

export function getETHPrice(tokenPrices: Map<string, BigNumber>): BigNumber {
  const ethPrice = tokenPrices.get(ETHEREUM_CG_PRICE_ID);
  if (!ethPrice) {
    throw new Error(`Ethereum price not found`);
  }
  return ethPrice;
}

const PRICE_EXPIRATION_TIME = 300000; // 5 minutes

@Injectable()
// export class DepositPointService extends Worker {
export class DepositPointService {
  private readonly logger: Logger;
  private readonly tokenPriceCache: Map<string, ITokenMarketChartProviderResponse>;
  private readonly pointsPhase1StartTime: Date;
  private readonly pointsCancelDepositStartTime: Date;
  private addressFirstDepositTimeCache: Map<string, Date>;

  public constructor(
    private readonly tokenService: TokenService,
    private readonly pointsRepository: PointsRepository,
    private readonly blockRepository: BlockRepository,
    private readonly blockTokenPriceRepository: BlockTokenPriceRepository,
    private readonly blockAddressPointRepository: BlockAddressPointRepository,
    private readonly transferRepository: TransferRepository,
    private readonly referrerRepository: ReferrerRepository,
    private readonly addressFirstDepositRepository: AddressFirstDepositRepository,
    private readonly tokenOffChainDataProvider: TokenOffChainDataProvider,
    private readonly configService: ConfigService
  ) {
    // super();
    this.logger = new Logger(DepositPointService.name);
    this.tokenPriceCache = new Map<string, ITokenMarketChartProviderResponse>();
    this.pointsPhase1StartTime = new Date(this.configService.get<string>("points.pointsPhase1StartTime"));
    this.pointsCancelDepositStartTime = new Date(this.configService.get<string>("points.pointsCancelDepositStartTime"));
    this.addressFirstDepositTimeCache = new Map();
  }

  // protected async runProcess(): Promise<void> {
  //   try {
  //     await this.handleDeposit();
  //   } catch (error) {
  //     this.logger.error("Failed to calculate deposit point", error.stack);
  //   }

  //   await waitFor(() => !this.currentProcessPromise, 1000, 1000);
  //   if (!this.currentProcessPromise) {
  //     return;
  //   }

  //   return this.runProcess();
  // }

  // async handleDeposit() {
  //   const latestBlockNumber = await this.blockRepository.getLastBlockNumber();
  //   this.logger.log(`Last block number: ${latestBlockNumber}`);
  //   let lastStatisticalBlockNumber: number;
  //   do {
  //     lastStatisticalBlockNumber = await this.syncToTheLatestBlock(latestBlockNumber);
  //   } while (lastStatisticalBlockNumber < latestBlockNumber);
  // }

  // async syncToTheLatestBlock(latestBlockNumber: number) {
  //   const lastRunBlockNumber = await this.pointsRepository.getLastStatisticalBlockNumber();
  //   // this.logger.log(`Last deposit point statistical block number: ${lastRunBlockNumber}`);
  //   if (lastRunBlockNumber >= latestBlockNumber) {
  //     return lastRunBlockNumber;
  //   }
  //   const currentRunBlock = await this.blockRepository.getLastBlock({
  //     where: { number: lastRunBlockNumber + 1 },
  //     select: { number: true, timestamp: true },
  //   });
  //   const currentRunBlockNumber = currentRunBlock.number;
  //   // this.logger.log(`Handle deposit point at block: ${currentRunBlockNumber}`);
  //   // update token price at the block
  //   const tokenPriceMap = await this.updateTokenPrice(currentRunBlock);
  //   // handle transfer where type is deposit
  //   const transfers = await this.transferRepository.getBlockDeposits(currentRunBlock.number);
  //   // this.logger.log(`Block ${currentRunBlock.number} deposit num: ${transfers.length}`);
  //   const newFirstDeposits: Array<AddressFirstDeposit> = [];
  //   for (const transfer of transfers) {
  //     const depositReceiver = hexTransformer.from(transfer.from);
  //     if (!this.addressFirstDepositTimeCache.get(depositReceiver)) {
  //       const addressFirstDeposit = await this.addressFirstDepositRepository.getAddressFirstDeposit(depositReceiver);
  //       let firstDepositTime = addressFirstDeposit?.firstDepositTime;
  //       if (!firstDepositTime) {
  //         firstDepositTime = new Date(transfer.timestamp);
  //         const addressFirstDeposit: AddressFirstDeposit = {
  //           address: depositReceiver,
  //           firstDepositTime,
  //         };
  //         newFirstDeposits.push(addressFirstDeposit);
  //       }
  //       this.addressFirstDepositTimeCache.set(depositReceiver, firstDepositTime);
  //     }
  //     await this.recordDepositPoint(transfer, tokenPriceMap);
  //   }
  //   await this.addressFirstDepositRepository.addMany(newFirstDeposits);
  //   await this.pointsRepository.setStatisticalBlockNumber(currentRunBlockNumber);
  //   // this.logger.log(`Finish deposit point statistic for block: ${currentRunBlockNumber}`);
  //   return currentRunBlockNumber;
  // }

  // async updateTokenPrice(block: Block): Promise<Map<string, BigNumber>> {
  //   const allSupportTokens = this.tokenService.getAllSupportTokens();
  //   const allPriceIds: Set<string> = new Set();
  //   // do not need to get the price of stable coin(they are default 1 usd)
  //   allSupportTokens.map((t) => {
  //     if (t.type !== STABLE_COIN_TYPE) {
  //       allPriceIds.add(t.cgPriceId);
  //     }
  //   });
  //   const tokenPrices: Map<string, BigNumber> = new Map();
  //   for (const priceId of allPriceIds) {
  //     const price = await this.storeTokenPriceAtBlockNumber(block, priceId);
  //     tokenPrices.set(priceId, price);
  //   }
  //   return tokenPrices;
  // }

  // async storeTokenPriceAtBlockNumber(block: Block, priceId: string): Promise<BigNumber> {
  //   const usdPrice = await this.getTokenPriceFromCacheOrDataProvider(priceId, block.timestamp);
  //   const entity = {
  //     blockNumber: block.number,
  //     priceId,
  //     usdPrice: usdPrice.toNumber(),
  //   };
  //   await this.blockTokenPriceRepository.upsert(entity, true, ["blockNumber", "priceId"]);
  //   return usdPrice;
  // }

  // async getTokenPriceFromCacheOrDataProvider(priceId: string, blockTs: Date): Promise<BigNumber> {
  //   const cache = this.tokenPriceCache.get(priceId);
  //   if (!!cache) {
  //     const tsInHour = new Date(blockTs).setMinutes(0, 0, 0);
  //     const nextTsInHour = tsInHour + 3600000;
  //     const prices = cache.prices.filter((price) => price[0] >= tsInHour && price[0] < nextTsInHour);
  //     if (prices.length > 0) {
  //       return new BigNumber(prices[0][1]);
  //     }
  //     const lastChart = cache.prices[cache.prices.length - 1];
  //     if (lastChart[0] + PRICE_EXPIRATION_TIME > blockTs.getTime()) {
  //       return new BigNumber(lastChart[1]);
  //     }
  //   }
  //   const marketChart = await this.tokenOffChainDataProvider.getTokensMarketChart(priceId, blockTs);
  //   if (marketChart.prices.length === 0) {
  //     throw new Error(`No prices return from coingeco for token: ${priceId}`);
  //   }
  //   const lastChart = marketChart.prices[marketChart.prices.length - 1];
  //   // this.logger.log(
  //   //   `Current price of token '${priceId}': [timestamp: ${new Date(lastChart[0])}, price: ${lastChart[1]}]`
  //   // );
  //   if (lastChart[0] + 3600000 <= blockTs.getTime()) {
  //     throw new Error(`Too old price, block ts: ${blockTs}`);
  //   }
  //   this.tokenPriceCache.set(priceId, marketChart);
  //   return new BigNumber(lastChart[1]);
  // }

  // async recordDepositPoint(transfer: Transfer, tokenPrices: Map<string, BigNumber>) {
  //   const depositTs = Number(transfer.timestamp);
  //   if (depositTs >= this.pointsCancelDepositStartTime.getTime()) {
  //     return;
  //   }
  //   const blockNumber: number = transfer.blockNumber;
  //   const depositReceiver: string = hexTransformer.from(transfer.from);
  //   const tokenAddress: string = hexTransformer.from(transfer.tokenAddress);
  //   const tokenAmount: BigNumber = new BigNumber(transfer.amount);
  //   const transferId: number = transfer.number;
  //   // this.logger.log(
  //   //   `New deposit: [receiver = ${depositReceiver}, tokenAddress = ${tokenAddress}, tokenAmount = ${tokenAmount}, transferId = ${transferId}]`
  //   // );
  //   const lastParsedTransferId = await this.blockAddressPointRepository.getLastParsedTransferId();
  //   if (transfer.number <= lastParsedTransferId) {
  //     this.logger.log(`Last parsed transfer id: ${lastParsedTransferId}, ignore transfer :${transferId}`);
  //     return;
  //   }
  //   const tokenInfo = this.tokenService.getSupportToken(tokenAddress);
  //   if (!tokenInfo) {
  //     await this.blockAddressPointRepository.setParsedTransferId(transferId);
  //     return;
  //   }
  //   const newDepositPoint = await this.calculateDepositPoint(tokenAmount, tokenInfo, tokenPrices, depositTs);
  //   // update deposit point for user and refer point for referrer
  //   await this.updateDepositPoint(blockNumber, depositReceiver, newDepositPoint, transferId);
  // }

  // async updateDepositPoint(blockNumber: number, depositReceiver: string, depositPoint: BigNumber, transferId: number) {
  //   // update point of user
  //   let receiverBlockAddressPoint = await this.blockAddressPointRepository.getBlockAddressPoint(
  //     blockNumber,
  //     depositReceiver
  //   );
  //   if (!receiverBlockAddressPoint) {
  //     receiverBlockAddressPoint = this.blockAddressPointRepository.createDefaultBlockAddressPoint(
  //       blockNumber,
  //       depositReceiver
  //     );
  //   }
  //   let receiverAddressPoint = await this.pointsRepository.getPointByAddress(depositReceiver);
  //   if (!receiverAddressPoint) {
  //     receiverAddressPoint = this.pointsRepository.createDefaultPoint(depositReceiver);
  //   }
  //   receiverBlockAddressPoint.depositPoint = Number(receiverBlockAddressPoint.depositPoint) + depositPoint.toNumber();
  //   receiverAddressPoint.stakePoint = Number(receiverAddressPoint.stakePoint) + depositPoint.toNumber();
  //   // this.logger.log(`Address ${depositReceiver} get deposit point: ${depositPoint}`);
  //   // update point of referrer
  //   let referrerBlockAddressPoint: BlockAddressPoint;
  //   let referrerAddressPoint: Point;
  //   const referral = await this.referrerRepository.getReferral(depositReceiver);
  //   const referrer = referral?.referrer;
  //   if (!!referrer) {
  //     referrerBlockAddressPoint = await this.blockAddressPointRepository.getBlockAddressPoint(blockNumber, referrer);
  //     if (!referrerBlockAddressPoint) {
  //       referrerBlockAddressPoint = this.blockAddressPointRepository.createDefaultBlockAddressPoint(
  //         blockNumber,
  //         referrer
  //       );
  //     }
  //     referrerAddressPoint = await this.pointsRepository.getPointByAddress(referrer);
  //     if (!referrerAddressPoint) {
  //       referrerAddressPoint = this.pointsRepository.createDefaultPoint(referrer);
  //     }
  //     const referrerBonus = depositPoint.multipliedBy(REFERRER_BONUS);
  //     referrerBlockAddressPoint.refPoint = Number(referrerBlockAddressPoint.refPoint) + referrerBonus.toNumber();
  //     referrerAddressPoint.refPoint = Number(referrerAddressPoint.refPoint) + referrerBonus.toNumber();
  //     // this.logger.log(`Referrer ${referrer} get ref point from deposit: ${referrerBonus}`);
  //   }
  //   await this.blockAddressPointRepository.upsertUserAndReferrerPoint(
  //     receiverBlockAddressPoint,
  //     receiverAddressPoint,
  //     referrerBlockAddressPoint,
  //     referrerAddressPoint,
  //     transferId
  //   );
  // }

  getDepositMultiplier(depositTs: number): BigNumber {
    const startDate = this.pointsPhase1StartTime;
    let endDate = new Date(startDate);
    endDate = new Date(endDate.setMonth(endDate.getMonth() + 1));
    if (depositTs >= endDate.getTime()) {
      return new BigNumber(1);
    } else {
      return DEPOSIT_MULTIPLIER;
    }
  }

  async calculateDepositPoint(
    tokenAmount: BigNumber,
    token: Token,
    tokenPrices: Map<string, BigNumber>,
    depositTs: number
  ): Promise<BigNumber> {
    // NOVA Points = 10 * Token multiplier * Deposit Amount * Token Price / ETH price
    const price = getTokenPrice(token, tokenPrices);
    const ethPrice = getETHPrice(tokenPrices);
    const depositAmount = tokenAmount.dividedBy(new BigNumber(10).pow(token.decimals));
    const depositETHAmount = depositAmount.multipliedBy(price).dividedBy(ethPrice);
    const tokenMultiplier = new BigNumber(this.tokenService.getTokenMultiplier(token, depositTs));
    const depositMultipiler = this.getDepositMultiplier(depositTs);
    const point = depositMultipiler.multipliedBy(tokenMultiplier).multipliedBy(depositETHAmount);
    // this.logger.log(
    //   `Deposit ethAmount = ${depositETHAmount}, point = ${point}, [deposit multiplier = ${depositMultipiler}, token multiplier = ${tokenMultiplier}, deposit amount = ${depositAmount}, token price = ${price}, eth price = ${ethPrice}]`
    // );
    return point;
  }
}
