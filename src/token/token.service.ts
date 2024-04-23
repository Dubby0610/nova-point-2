import { Injectable, Logger } from "@nestjs/common";
import { TokenRepository } from "../repositories";
import { Token as TokenEntity } from "../entities";
import tokens from "../tokens";

export interface TokenL1Address {
  chain: string;
  l1Address: string;
  l2Address: string;
}
export interface TokenMultiplier {
  multiplier: number;
  timestamp: number;
}
export interface Token {
  address: TokenL1Address[];
  symbol: string;
  decimals: number;
  cgPriceId: string;
  type: string;
  yieldType: string[];
  multipliers: TokenMultiplier[];
}
@Injectable()
export class TokenService {
  private readonly logger: Logger;
  private readonly supportTokens: Token[];
  private readonly supportTokenL2AddressMap: Map<string, Token>;

  constructor(
    private readonly tokenRepository: TokenRepository,
  ) {
    this.logger = new Logger(TokenService.name);
    this.supportTokens = [];
    this.supportTokenL2AddressMap = new Map<string, Token>();
    tokens.forEach((token) => {
      if (!token.decimals) {
        throw new Error(`Token ${token.symbol} decimals not found`);
      }
      if (!token.cgPriceId) {
        throw new Error(`Token ${token.symbol} cgPriceId not found`);
      }
      if (!token.type) {
        throw new Error(`Token ${token.symbol} cgPriceId not found`);
      }
      if (!token.multipliers || token.multipliers.length == 0) {
        throw new Error(`Token ${token.symbol} multipliers not found`);
      }
      this.supportTokens.push(token);
      token.address.forEach((addr) => {
        this.supportTokenL2AddressMap.set(addr.l2Address.toLowerCase(), token);
      });
    });
  }

  public async getAllTokens(): Promise<TokenEntity[]> {
    return await this.tokenRepository.getAllTokens();
  }

  public getAllSupportTokens(): Token[] {
    return this.supportTokens;
  }

  public getSupportToken(tokenAddress: string): Token | undefined {
    return this.supportTokenL2AddressMap.get(tokenAddress.toLowerCase());
  }

  public getTokenMultiplier(token: Token, blockTs: number): number {
    const multipliers = token.multipliers;
    multipliers.sort((a, b) => b.timestamp - a.timestamp);
    for (const m of multipliers) {
      if (blockTs >= m.timestamp * 1000) {
        return m.multiplier;
      }
    }
    return multipliers[multipliers.length - 1].multiplier;
  }
}
