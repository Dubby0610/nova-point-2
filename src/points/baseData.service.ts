import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import waitFor from "../utils/waitFor";
import {
  BlockRepository,
  TransferRepository,
  BlockTokenPriceRepository,
  AddressFirstDepositRepository,
  CacheRepository,
} from "../repositories";
import {
  ITokenMarketChartProviderResponse,
  TokenOffChainDataProvider,
} from "../token/tokenOffChainData/tokenOffChainDataProvider.abstract";
import { Token, TokenService } from "../token/token.service";
import BigNumber from "bignumber.js";
import { Block } from "../entities";
import { hexTransformer } from "../transformers/hex.transformer";
import { ConfigService } from "@nestjs/config";
import { AddressFirstDeposit } from "../entities/addressFirstDeposit.entity";

const PRICE_EXPIRATION_TIME = 300000; // 5 minutes
const BASE_DATA_LAST_RUN_BLOCKNUMBER_KEY = "baseDataLastRunBlockNumber";

export const STABLE_COIN_TYPE = "Stablecoin";
export const ETHEREUM_CG_PRICE_ID = "ethereum";

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

@Injectable()
export class BaseDataService extends Worker {
  private readonly logger: Logger;
  private readonly tokenPriceCache: Map<string, ITokenMarketChartProviderResponse>;

  public constructor(
    private readonly tokenService: TokenService,
    private readonly blockRepository: BlockRepository,
    private readonly blockTokenPriceRepository: BlockTokenPriceRepository,
    private readonly transferRepository: TransferRepository,
    private readonly addressFirstDepositRepository: AddressFirstDepositRepository,
    private readonly tokenOffChainDataProvider: TokenOffChainDataProvider,
    private readonly cacheRepository: CacheRepository,
    private readonly configService: ConfigService
  ) {
    super();
    this.logger = new Logger(BaseDataService.name);
    this.tokenPriceCache = new Map<string, ITokenMarketChartProviderResponse>();
  }

  protected async runProcess(): Promise<void> {
    try {
      await this.handleDeposit();
    } catch (error) {
      this.logger.error("Failed to calculate base data", error.stack);
    }

    await waitFor(() => !this.currentProcessPromise, 1000, 1000);
    if (!this.currentProcessPromise) {
      return;
    }

    return this.runProcess();
  }

  async handleDeposit() {
    const latestBlockNumber = await this.blockRepository.getLastBlockNumber();
    this.logger.log(`Last block number: ${latestBlockNumber}`);
    let lastStatisticalBlockNumber: number;
    const lastStatisticalBlockNumberStr = await this.cacheRepository.getValue(BASE_DATA_LAST_RUN_BLOCKNUMBER_KEY);
    if (lastStatisticalBlockNumberStr) {
      lastStatisticalBlockNumber = Number(lastStatisticalBlockNumberStr);
    } else {
      lastStatisticalBlockNumber = latestBlockNumber;
    }
    while (lastStatisticalBlockNumber <= latestBlockNumber) {
      await this.syncToTheLatestBlock(lastStatisticalBlockNumber);
      lastStatisticalBlockNumber++;
    }
    await this.cacheRepository.setValue(BASE_DATA_LAST_RUN_BLOCKNUMBER_KEY, lastStatisticalBlockNumber.toString());
  }

  async syncToTheLatestBlock(lastRunBlockNumber: number) {
    const currentRunBlock = await this.blockRepository.getLastBlock({
      where: { number: lastRunBlockNumber },
      select: { number: true, timestamp: true },
    });
    const currentRunBlockNumber = currentRunBlock.number;
    this.logger.log(`Handle base data at block: ${currentRunBlockNumber}`);
    // update token price at the block
    this.updateTokenPrice(currentRunBlock);
    // handle transfer where type is deposit
    const transfers = await this.transferRepository.getBlockDeposits(currentRunBlock.number);
    this.logger.log(`Block ${currentRunBlock.number} deposit num: ${transfers.length}`);
    const newFirstDeposits: Array<AddressFirstDeposit> = [];
    for (const transfer of transfers) {
      const depositReceiver = hexTransformer.from(transfer.from);
      const addressFirstDeposit = await this.addressFirstDepositRepository.getAddressFirstDeposit(depositReceiver);
      let firstDepositTime = addressFirstDeposit?.firstDepositTime;
      if (!firstDepositTime) {
        firstDepositTime = new Date(transfer.timestamp);
        const addressFirstDeposit: AddressFirstDeposit = {
          address: depositReceiver,
          firstDepositTime,
        };
        newFirstDeposits.push(addressFirstDeposit);
      }
    }
    await this.addressFirstDepositRepository.addManyIgnoreConflicts(newFirstDeposits);
    this.logger.log(`Finish base data statistic for block: ${currentRunBlockNumber}`);
    return currentRunBlockNumber;
  }

  async updateTokenPrice(block: Block): Promise<Map<string, BigNumber>> {
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
      const price = await this.storeTokenPriceAtBlockNumber(block, priceId);
      tokenPrices.set(priceId, price);
    }
    return tokenPrices;
  }

  async storeTokenPriceAtBlockNumber(block: Block, priceId: string): Promise<BigNumber> {
    const usdPrice = await this.getTokenPriceFromCacheOrDataProvider(priceId, block.timestamp);
    const entity = {
      blockNumber: block.number,
      priceId,
      usdPrice: usdPrice.toNumber(),
    };
    await this.blockTokenPriceRepository.upsert(entity, true, ["blockNumber", "priceId"]);
    return usdPrice;
  }

  async getTokenPriceFromCacheOrDataProvider(priceId: string, blockTs: Date): Promise<BigNumber> {
    const cache = this.tokenPriceCache.get(priceId);
    if (!!cache) {
      const tsInHour = new Date(blockTs).setMinutes(0, 0, 0);
      const nextTsInHour = tsInHour + 3600000;
      const prices = cache.prices.filter((price) => price[0] >= tsInHour && price[0] < nextTsInHour);
      if (prices.length > 0) {
        return new BigNumber(prices[0][1]);
      }
      const lastChart = cache.prices[cache.prices.length - 1];
      if (lastChart[0] + PRICE_EXPIRATION_TIME > blockTs.getTime()) {
        return new BigNumber(lastChart[1]);
      }
    }
    const marketChart = await this.tokenOffChainDataProvider.getTokensMarketChart(priceId, blockTs);
    if (marketChart.prices.length === 0) {
      throw new Error(`No prices return from coingeco for token: ${priceId}`);
    }
    const lastChart = marketChart.prices[marketChart.prices.length - 1];
    this.logger.log(
      `Current price of token '${priceId}': [timestamp: ${new Date(lastChart[0])}, price: ${lastChart[1]}]`
    );
    if (lastChart[0] + 3600000 <= blockTs.getTime()) {
      throw new Error(`Too old price, block ts: ${blockTs}`);
    }
    this.tokenPriceCache.set(priceId, marketChart);
    return new BigNumber(lastChart[1]);
  }
}
