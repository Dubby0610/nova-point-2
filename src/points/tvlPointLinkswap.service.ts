import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import BigNumber from "bignumber.js";
import { Worker } from "../common/worker";
import { PointsOfLpRepository, AddressFirstDepositRepository, ProjectRepository } from "../repositories";
import { PointsOfLp, AddressFirstDeposit } from "src/entities";
import { BoosterService } from "../booster/booster.service";

export const LOYALTY_BOOSTER_FACTOR: BigNumber = new BigNumber(0.005);
const poolAddresses = [
  "0x8e5aa41a021495b606F9181B508759a39Ac2c3e4", //WETH-USDT(MERGE)
  "0x4eaDd78a23E152FeC2b63F0f5A3423bDa2207E9b", //WETH-USDC(MERGE)
  "0x3Fcda03F6520d4b1647599DbFB089e0Dc930f41b", //USDT(MERGE)-USDC(MERGE)
  "0xe4Ce0F3d78F6Af688F44d746aCF4acdd36f740BE", //WETH-WBTC(MERGE)
  "0x69F33F33B4E56370951f6E3DbeeD475e6D6A19cD", // WETH-pufETH
  "0xE7bbBbB7c4C5EC243E74a320CC0Db86A167235D4", //WETH-STONE(MANTA)
  "0x86CFe0F6bdb14B0B35074492f0e91C7F25381A0f", // WETH-MANTA(MANTA)
  "0x46eA688B6F7CBb02b763771F1DB392d44c7B8eFe", //WETH-WMNT(MANTLE)
  "0xfA02c6A895C236436c7F24DC6fb3d0D45DFB8fE5", //WETH-ARB(ARB)
];
class PoolPoint {
  userAddress: string;
  poolAddress: string;
  novaPoint: number;
}

@Injectable()
export class TvlPointLinkswapService extends Worker {
  private readonly logger: Logger;
  private readonly dir: string = "linkswap";
  private readonly type: string = "tvl";

  public constructor(
    private readonly pointsOfLpRepository: PointsOfLpRepository,
    private readonly addressFirstDepositRepository: AddressFirstDepositRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly boosterService: BoosterService
  ) {
    super();
    this.logger = new Logger(TvlPointLinkswapService.name);
  }

  @Cron("0 2,10,18 * * *")
  protected async runProcess(): Promise<void> {
    this.logger.log(`${TvlPointLinkswapService.name} initialized`);
    try {
      await this.handleHoldPoint();
    } catch (error) {
      this.logger.error("Failed to calculate hold point", error.stack);
    }
  }

  async handleHoldPoint() {
    this.saveProject(poolAddresses);
    const addressPointsArr: PoolPoint[] = await this.getAddressPoints(poolAddresses);
    const addresses = addressPointsArr.map((item) => item.userAddress);
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

    // loop all address to calculate hold point
    let addressPointArr = [];
    let groupBooster = new BigNumber(1);
    const now = new Date().getTime();
    for (const item of addressPointsArr) {
      const novaPoint = item.novaPoint;
      const address = item.userAddress;
      const pairAddress = item.poolAddress;
      if (!novaPoint) continue;
      // get the last multiplier before the block timestamp
      const addressFirstDeposit = addressFirstDepositMap[address.toLowerCase()];
      const firstDepositTime = addressFirstDeposit?.firstDepositTime;
      const loyaltyBooster = this.boosterService.getLoyaltyBooster(now, firstDepositTime?.getTime());

      const stakePoint = BigNumber(novaPoint).multipliedBy(groupBooster).multipliedBy(loyaltyBooster);
      const pointsOfLp = {
        address: address,
        pairAddress: pairAddress,
        stakePoint: Number(stakePoint.toString()),
      } as PointsOfLp;
      addressPointArr.push(pointsOfLp);
      this.logger.log(
        `linkswap address:${address}, pairAddress:${pairAddress}, pointsOfLp: ${JSON.stringify(pointsOfLp)}`
      );
    }
    await this.pointsOfLpRepository.addManyOrUpdate(addressPointArr, ["stakePoint"], ["address", "pairAddress"]);
    this.logger.log(`Finish linkswap addressPointArr length: ${addressPointArr.length}`);
  }

  public async getAddressPoints(poolAddresses: string[]): Promise<PoolPoint[]> {
    const headers = new Headers();
    headers.append("User-Agent", "Apifox/1.0.0 (https://apifox.com)");
    headers.append("Accept", "*/*");
    headers.append("Host", "lrt-points.zklink.io");
    headers.append("Connection", "keep-alive");

    let data: PoolPoint[] = [];
    for (let i = 0; i < poolAddresses.length; i++) {
      const poolAddress = poolAddresses[i];
      try {
        const response = await fetch(`https://api.linkswap.finance/api/Zklink/PairPoint?pair=${poolAddress}`, {
          method: "GET",
          headers: headers,
          redirect: "follow",
        });
        const result = await response.text();
        const resultJson = JSON.parse(result);
        const dataTArr = resultJson?.data?.users ?? [];
        if (dataTArr.length == 0) {
          this.logger.log(`linkswap pool:${poolAddress} empty, res:${JSON.stringify(resultJson)}`);
          continue;
        }
        const dataTmp: PoolPoint[] = dataTArr.map((item) => {
          return {
            userAddress: item.address,
            poolAddress: poolAddress,
            novaPoint: item.novaPoint,
          };
        });

        data = [...data, ...dataTmp];
      } catch (error) {
        this.logger.log(`linkswap pool:${poolAddress} error, error:${error.stack}`);
      }
    }

    return data;
  }

  private saveProject(poolAddresses: string[]) {
    for (const poolAddress of poolAddresses) {
      this.projectRepository.upsert({ pairAddress: poolAddress, name: this.dir }, true, ["pairAddress"]);
    }
  }
}
