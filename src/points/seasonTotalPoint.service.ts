import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import { Cron } from "@nestjs/schedule";
import {
  BlockReferralPointsRepository,
  BlockAddressPointOfLpRepository,
  BlockAddressPointRepository,
  InvitesRepository,
  SeasonTotalPointRepository,
} from "../repositories";
import { ConfigService } from "@nestjs/config";
import seasonConfig from "../config/season";
import { ZERO_HASH_64 } from "src/constants";
import { SeasonTotalPoint } from "src/entities";

interface seasonTotalPoint {
  userAddress: string;
  pairAddress: string;
  point: number;
  type: string;
}

@Injectable()
export class SeasonTotalPointService extends Worker {
  private readonly logger: Logger;

  public constructor(
    private readonly blockReferralPointsRepository: BlockReferralPointsRepository,
    private readonly blockAddressPointOfLpRepository: BlockAddressPointOfLpRepository,
    private readonly blockAddressPointRepository: BlockAddressPointRepository,
    private readonly invitesRepository: InvitesRepository,
    private readonly seasonTotalPointRepository: SeasonTotalPointRepository,
    private readonly configService: ConfigService
  ) {
    super();
    this.logger = new Logger(SeasonTotalPointService.name);
  }

  @Cron("0 3,11,19 * * *")
  protected async runProcess(): Promise<void> {
    try {
      this.logger.log("Start to calculate season point");
      await this.handlePoint();
      this.logger.log("End to calculate season point");
    } catch (error) {
      this.logger.error("Failed to calculate season point", error.stack);
    }
  }

  async handlePoint() {
    const seasonTime = this.getCurrentSeasonTime();
    if (!seasonTime) {
      this.logger.log("No season time");
      return;
    }
    const { startTime, endTime } = seasonTime;
    const directHoldPointList = await this.getDirectHoldPoint(startTime, endTime);
    const lpPointList = await this.getLpPoint(startTime, endTime);
    const referralPointList = []; //await this.getReferralPoint(startTime, endTime);
    const allPointList = directHoldPointList.concat(lpPointList).concat(referralPointList);
    const userAddresses = [...new Set(allPointList.map((item) => item.userAddress))];
    const usernameMap = await this.getUsername(userAddresses);
    const data: SeasonTotalPoint[] = [];
    for (const item of allPointList) {
      const tmp = new SeasonTotalPoint();
      tmp.userAddress = item.userAddress;
      tmp.pairAddress = item.pairAddress;
      tmp.point = item.point;
      tmp.type = item.type;
      tmp.season = seasonTime.season;
      tmp.userName = usernameMap.get(item.userAddress) ?? "user-" + item.userAddress.slice(10);
      data.push(tmp);
    }
    await this.seasonTotalPointRepository.addManyOrUpdate(
      data,
      ["point", "userName"],
      ["userAddress", "pairAddress", "type", "season"]
    );
  }

  // get current season time
  private getCurrentSeasonTime(): {
    startTime: string;
    endTime: string;
    season: number;
  } {
    const now = new Date();
    for (const season of seasonConfig) {
      if (now >= new Date(season.startTime) && now < new Date(season.endTime)) {
        return season;
      }
    }
    return null;
  }

  // get all address's hold point
  private async getDirectHoldPoint(startTime: string, endTime: string): Promise<seasonTotalPoint[]> {
    const holdPointMap = new Map<string, number>();
    const result = await this.blockAddressPointRepository.getAllAddressTotalPoint(startTime, endTime);
    return result.map((item) => {
      return {
        userAddress: item.address,
        pairAddress: ZERO_HASH_64,
        point: item.totalPoint,
        type: "directHold",
      };
    });
  }

  // get all address's tvl point, tx num point, tx vol point, bridgeTxNum point
  private async getLpPoint(startTime: string, endTime: string): Promise<seasonTotalPoint[]> {
    const lpPointList = [];
    const result = await this.blockAddressPointOfLpRepository.getAllAddressTotalPoint(startTime, endTime);
    for (const item of result) {
      lpPointList.push({
        userAddress: item.address,
        pairAddress: item.pairAddress,
        point: item.totalPoint,
        type: item.type,
      });
    }
    return lpPointList;
  }

  // get all address's referral point
  private async getReferralPoint(startTime: string, endTime: string): Promise<seasonTotalPoint[]> {
    const referralPointList = [];
    const result = await this.blockReferralPointsRepository.getAllAddressTotalPoint(startTime, endTime);
    for (const item of result) {
      referralPointList.push({
        userAddress: item.address,
        pairAddress: item.pairAddress,
        point: item.totalPoint,
        type: "referral",
      });
    }
    return referralPointList;
  }

  private async getUsername(userAddresses: string[]): Promise<Map<string, string>> {
    const usernameMap = new Map<string, string>();
    const result = await this.invitesRepository.getInvitesByUserAddresses(userAddresses);
    for (const item of result) {
      usernameMap.set(item.address, item.userName ? item.userName : "user-" + item.code);
    }
    return usernameMap;
  }
}
