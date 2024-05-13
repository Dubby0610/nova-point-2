import { Injectable, Logger } from "@nestjs/common";
import { Token, TokenService } from "../token/token.service";
import BigNumber from "bignumber.js";
import { ConfigService } from "@nestjs/config";

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

@Injectable()
// export class DepositPointService extends Worker {
export class DepositPointService {
  private readonly logger: Logger;
  private readonly pointsPhase1StartTime: Date;

  public constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService
  ) {
    // super();
    this.logger = new Logger(DepositPointService.name);
    this.pointsPhase1StartTime = new Date(this.configService.get<string>("points.pointsPhase1StartTime"));
  }

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
