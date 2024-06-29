import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import BigNumber from "bignumber.js";
import { Worker } from "../common/worker";
import { BalanceRepository, BlockTokenPriceRepository, ProjectRepository } from "../repositories";
import { TokenService } from "../token/token.service";
import { STABLE_COIN_TYPE } from "./baseData.service";

@Injectable()
export class ProjectTvlService extends Worker {
  private readonly logger: Logger;

  public constructor(
    private readonly tokenService: TokenService,
    private readonly projectRepository: ProjectRepository,
    private readonly balanceRespository: BalanceRepository,
    private readonly blockTokenPriceRepository: BlockTokenPriceRepository
  ) {
    super();
    this.logger = new Logger(ProjectTvlService.name);
  }

  @Cron("*/30 * * * *")
  protected async runProcess(): Promise<void> {
    this.logger.log(`${ProjectTvlService.name} initialized`);
    try {
      await this.handleTvl();
    } catch (error) {
      this.logger.error("Failed to calculate hold point", error.stack);
    }
  }

  async handleTvl() {
    // get addresses of project from projectRespository
    const projects = await this.projectRepository.find({
      select: {
        pairAddress: true,
      },
    });
    const projectPairAddresses = projects.map((project) => project.pairAddress);
    // get support tokens
    const supportTokens = this.tokenService.getAllSupportTokens();
    const supportTokenAddressToPriceId = new Map<string, string>();
    for (const token of supportTokens) {
      for (const addr of token.address) {
        supportTokenAddressToPriceId.set(addr.l2Address.toLocaleLowerCase(), token.cgPriceId);
      }
    }
    const supportTokenAddresses = Array.from(supportTokenAddressToPriceId.keys());

    // get support token balance of pairAddresses from balanceRespository
    const balanceList = await this.balanceRespository.getAccountsBalances(projectPairAddresses, supportTokenAddresses);
    const tvlMap = new Map<string, BigNumber>();
    const tokenPriceMap = await this.getTokenPriceMap(supportTokens);
    for (const item of balanceList) {
      const priceIdTmp = supportTokenAddressToPriceId.get(item.tokenAddress);
      const price = tokenPriceMap.get(priceIdTmp);
      const tokenInfo = this.tokenService.getSupportToken(item.tokenAddress);
      if (!tokenInfo) {
        continue;
      }
      const tokenAmount = new BigNumber(item.balance).dividedBy(new BigNumber(10).pow(tokenInfo.decimals));
      const tvl = tokenAmount.multipliedBy(price);
      if (tvlMap.has(item.address)) {
        tvlMap.set(item.address, tvlMap.get(item.address).plus(tvl));
      } else {
        tvlMap.set(item.address, tvl);
      }
    }
    const projectTvlArr = [];
    for (const [address, tvl] of tvlMap) {
      const project = projects.find((p) => p.pairAddress === address);
      if (project) {
        projectTvlArr.push({
          pairAddress: address,
          tvl: tvl.toString(),
        });
      }
    }
    // save tvl to db
    await this.projectRepository.addManyOrUpdate(projectTvlArr, ["tvl"], ["pairAddress"]);
  }

  async getTokenPriceMap(allSupportTokens): Promise<Map<string, BigNumber>> {
    const allPriceIds: Set<string> = new Set();
    const tokenPrices: Map<string, BigNumber> = new Map();
    // do not need to get the price of stable coin(they are default 1 usd)
    allSupportTokens.map((t) => {
      if (t.type !== STABLE_COIN_TYPE) {
        allPriceIds.add(t.cgPriceId);
      } else {
        tokenPrices.set(t.cgPriceId, new BigNumber(1));
      }
    });
    const result = await this.blockTokenPriceRepository.getLastTokenPrice(Array.from(allPriceIds));
    for (const item of result) {
      tokenPrices.set(item.priceId, new BigNumber(item.usdPrice));
    }
    return tokenPrices;
  }
}
