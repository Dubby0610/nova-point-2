import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { AxiosError } from "axios";
import { setTimeout } from "timers/promises";
import { catchError, firstValueFrom } from "rxjs";
import {
  TokenOffChainDataProvider,
  ITokenOffChainData,
  ITokenCurrentPrice,
  ITokenMarketChartProviderResponse,
} from "../../tokenOffChainDataProvider.abstract";
import { Token } from "../../../token.service";

const API_NUMBER_OF_TOKENS_PER_REQUEST = 250;
const API_INITIAL_RETRY_TIMEOUT = 5000;
const API_RETRY_ATTEMPTS = 5;

interface ITokenListItemProviderResponse {
  id: string;
  platforms: Record<string, string>;
}

interface ITokenMarketDataProviderResponse {
  id: string;
  image?: string;
  current_price?: number;
  market_cap?: number;
}

class ProviderResponseError extends Error {
  constructor(message: string, public readonly status: number, public readonly rateLimitResetDate?: Date) {
    super(message);
  }
}

@Injectable()
export class CoingeckoTokenOffChainDataProvider implements TokenOffChainDataProvider {
  private readonly logger: Logger;
  private readonly isProPlan: boolean;
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(configService: ConfigService, private readonly httpService: HttpService) {
    this.logger = new Logger(CoingeckoTokenOffChainDataProvider.name);
    this.isProPlan = configService.get<boolean>("tokens.coingecko.isProPlan");
    this.apiKey = configService.get<string>("tokens.coingecko.apiKey");
    this.apiUrl = this.isProPlan ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";
  }

  public async getTokensOffChainData(supportedTokens: Token[]): Promise<ITokenOffChainData[]> {
    const tokensOffChainData: ITokenOffChainData[] = [];
    let tokenIdsPerRequest = [];
    for (let i = 0; i < supportedTokens.length; i++) {
      tokenIdsPerRequest.push(supportedTokens[i].cgPriceId);
      if (tokenIdsPerRequest.length === API_NUMBER_OF_TOKENS_PER_REQUEST || i === supportedTokens.length - 1) {
        const tokensMarkedData = await this.getTokensMarketData(tokenIdsPerRequest);
        for (const tokenMarketData of tokensMarkedData) {
          const token = supportedTokens.find((t) => t.cgPriceId === tokenMarketData.id);
          for (const t of token.address) {
            tokensOffChainData.push({
              l1Address: t.l1Address,
              l2Address: t.l2Address,
              liquidity: tokenMarketData.market_cap,
              usdPrice: tokenMarketData.current_price,
              iconURL: tokenMarketData.image,
              priceId: tokenMarketData.id,
            });
          }
        }
        tokenIdsPerRequest = [];
      }
    }
    return tokensOffChainData;
  }

  public async getTokensCurrentPrice(tokens: string[]): Promise<ITokenCurrentPrice[]> {
    const tokensCurrentPrice: ITokenCurrentPrice[] = [];
    let tokenIdsPerRequest = [];
    for (let i = 0; i < tokens.length; i++) {
      tokenIdsPerRequest.push(tokens[i]);
      if (tokenIdsPerRequest.length === API_NUMBER_OF_TOKENS_PER_REQUEST || i === tokens.length - 1) {
        const tokensMarkedData = await this.getTokensMarketData(tokenIdsPerRequest);
        tokensCurrentPrice.push(
          ...tokensMarkedData.map((tokenMarketData) => {
            return {
              priceId: tokenMarketData.id,
              usdPrice: tokenMarketData.current_price,
            };
          })
        );
        tokenIdsPerRequest = [];
      }
    }
    return tokensCurrentPrice;
  }

  // The price is order by timestamp asc
  // {
  //   "prices": [
  //     [
  //       1710317264136,
  //       4043.3907598473666
  //     ],
  //     [
  //       1710320738914,
  //       4064.7920574616787
  //     ],
  //     [
  //       1710324520774,
  //       4052.906968480699
  //     ],
  //     [
  //       1710327169000,
  //       4054.5795290048804
  //     ]
  //   ]
  // }
  public async getTokenPriceByBlock(tokenId: string, blockTs: number): Promise<number> {
    const getDate = new Date(blockTs);
    const marketChart = await this.getTokensMarketChart(tokenId, getDate);
    getDate.setMinutes(0, 0, 0);
    const nextHourDate = new Date(getDate);
    nextHourDate.setHours(getDate.getHours() + 1);
    if (marketChart.prices.length === 0) {
      throw new Error(`No prices return from coingeco for token: ${tokenId}`);
    }
    const prices = marketChart.prices.filter(
      (price) => price[0] >= getDate.getTime() && price[0] < nextHourDate.getTime()
    );
    if (prices.length > 0) {
      return prices[0][1];
    } else {
      return marketChart.prices[marketChart.prices.length - 1][1];
    }
  }

  private getTokensMarketData(tokenIds: string[]) {
    return this.makeApiRequestRetryable<ITokenMarketDataProviderResponse[]>({
      path: "/coins/markets",
      query: {
        vs_currency: "usd",
        ids: tokenIds.join(","),
        per_page: tokenIds.length.toString(),
        page: "1",
        locale: "en",
      },
    });
  }

  // start add by nick *get history price*
  public async getTokensMarketChart(tokenId: string, getDate: Date): Promise<ITokenMarketChartProviderResponse> {
    const currentDate = new Date();
    const diffDays = Math.ceil((currentDate.getTime() - getDate.getTime()) / 86400000);
    const days = diffDays < 2 ? 2 : diffDays;
    if (diffDays > 90) {
      throw new Error(`Diff days too large`);
    }

    return this.makeApiRequestRetryable<ITokenMarketChartProviderResponse>({
      path: `/coins/${tokenId}/market_chart`,
      query: {
        vs_currency: "usd",
        days: days.toString(),
      },
    });
  }
  //end add by nick

  private async getTokensList() {
    const list = await this.makeApiRequestRetryable<ITokenListItemProviderResponse[]>({
      path: "/coins/list",
      query: {
        include_platform: "true",
      },
    });
    if (!list) {
      return [];
    }
    return list
      .filter((item) => item.id === "ethereum" || item.platforms.zksync || item.platforms.ethereum)
      .map((item) => ({
        ...item,
        platforms: {
          // use substring(0, 42) to fix some instances when after address there is some additional text
          zksync: item.platforms.zksync?.substring(0, 42),
          ethereum: item.platforms.ethereum?.substring(0, 42),
        },
      }));
  }

  private async makeApiRequestRetryable<T>({
    path,
    query,
    retryAttempt = 0,
    retryTimeout = API_INITIAL_RETRY_TIMEOUT,
  }: {
    path: string;
    query?: Record<string, string>;
    retryAttempt?: number;
    retryTimeout?: number;
  }): Promise<T> {
    try {
      return await this.makeApiRequest<T>(path, query);
    } catch (err) {
      if (err.status === 404) {
        return null;
      }
      if (err.status === 429) {
        const rateLimitResetIn = err.rateLimitResetDate.getTime() - new Date().getTime();
        await setTimeout(rateLimitResetIn >= 0 ? rateLimitResetIn + 1000 : 0);
        return this.makeApiRequestRetryable<T>({
          path,
          query,
        });
      }
      if (retryAttempt >= API_RETRY_ATTEMPTS) {
        this.logger.error({
          message: `Failed to fetch data at ${path} from coingecko after ${retryAttempt} retries`,
          provider: CoingeckoTokenOffChainDataProvider.name,
        });
        return null;
      }
      await setTimeout(retryTimeout);
      return this.makeApiRequestRetryable<T>({
        path,
        query,
        retryAttempt: retryAttempt + 1,
        retryTimeout: retryTimeout * 2,
      });
    }
  }

  private async makeApiRequest<T>(path: string, query?: Record<string, string>): Promise<T> {
    const queryString = new URLSearchParams({
      ...query,
      ...(this.isProPlan
        ? {
            x_cg_pro_api_key: this.apiKey,
          }
        : {
            x_cg_demo_api_key: this.apiKey,
          }),
    }).toString();

    const { data } = await firstValueFrom<{ data: T }>(
      this.httpService.get(`${this.apiUrl}${path}?${queryString}`).pipe(
        catchError((error: AxiosError) => {
          if (error.response?.status === 429) {
            const rateLimitReset = error.response.headers["x-ratelimit-reset"];
            // use specified reset date or 60 seconds by default
            const rateLimitResetDate = rateLimitReset
              ? new Date(rateLimitReset)
              : new Date(new Date().getTime() + 60000);
            this.logger.debug({
              message: `Reached coingecko rate limit, reset at ${rateLimitResetDate}`,
              stack: error.stack,
              status: error.response.status,
              response: error.response.data,
              provider: CoingeckoTokenOffChainDataProvider.name,
            });
            throw new ProviderResponseError(error.message, error.response.status, rateLimitResetDate);
          }
          this.logger.error({
            message: `Failed to fetch data at ${path} from coingecko`,
            stack: error.stack,
            status: error.response?.status,
            response: error.response?.data,
            provider: CoingeckoTokenOffChainDataProvider.name,
          });
          throw new ProviderResponseError(error.message, error.response?.status);
        })
      )
    );
    return data;
  }
}
