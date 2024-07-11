import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import { Cron } from "@nestjs/schedule";
import { ReferralPointsRepository, ReferralRepository, SeasonTotalPointRepository } from "../repositories";
import { ConfigService } from "@nestjs/config";
import { ReferralPoints } from "src/entities/referralPoints.entity";
import { SeasonTotalPointService } from "./seasonTotalPoint.service";
import { LrtUnitOfWork } from "src/unitOfWork";

export const REFERRAL_BOOSTER: number = 0.1;

@Injectable()
export class ReferralPointService extends Worker {
  private readonly logger: Logger;

  public constructor(
    private readonly referralRepository: ReferralRepository,
    private readonly seasonTotalPointService: SeasonTotalPointService,
    private readonly seasonTotalPointRepository: SeasonTotalPointRepository,
    private readonly referralPointsRepository: ReferralPointsRepository,
    private readonly lrtUnitwork: LrtUnitOfWork,
    private readonly configService: ConfigService
  ) {
    super();
    this.logger = new Logger(ReferralPointService.name);
  }

  @Cron("30 2,10,18 * * *")
  protected async runProcess(): Promise<void> {
    try {
      this.logger.log("Start to calculate referral point");
      await this.handleReferralPoint();
      this.logger.log("End to calculate referral point");
    } catch (error) {
      this.logger.error("Failed to calculate referral point", error.stack);
    }
  }

  async handleReferralPoint() {
    // 1. get all address that need to calculate referral point
    // 2. get all referral address's holding point
    // 3. calculate referral point = ReferralBooster * sum(holding point of every referral address)
    const seasonTime = this.seasonTotalPointService.getCurrentSeasonTime();
    if (!seasonTime) {
      this.logger.log("No season time");
      return;
    }
    const season = seasonTime.season;
    const addressReferralMap = await this.referralRepository.getAllAddressReferral();
    const addressArr = Array.from(addressReferralMap.keys());
    // addressReferralMap.values() are all the referral addresses
    const referralAddresses = Array.from(addressReferralMap.values()).flat();
    // get all referral address's holding point
    const referralStakePoints = await this.seasonTotalPointRepository.getPointByAddresses(referralAddresses, season);
    const referralStakePointMap = new Map<string, { pairAddress: string; stakePoint: number }[]>();
    for (const item of referralStakePoints) {
      if (!referralStakePointMap.has(item.userAddress)) {
        referralStakePointMap.set(item.userAddress, []);
      }
      referralStakePointMap.get(item.userAddress).push({
        pairAddress: item.pairAddress,
        stakePoint: item.point,
      });
    }

    // calculate referral point = ReferralBooster * sum(holding point of every referral address)
    const blockReferralPointResultArr: ReferralPoints[] = [];
    for (const address of addressArr) {
      const referralAddresses = addressReferralMap.get(address);
      for (const referralAddress of referralAddresses) {
        const referralStakePointArr = referralStakePointMap.get(referralAddress);
        if (referralStakePointArr?.length > 0) {
          for (const referralStakePoint of referralStakePointArr) {
            const referralPoint = referralStakePoint.stakePoint * REFERRAL_BOOSTER;
            if (referralPoint <= 0) {
              continue;
            }
            blockReferralPointResultArr.push({
              address: address,
              pairAddress: referralStakePoint.pairAddress,
              point: referralPoint,
              season: season,
            });
          }
        } else {
          this.logger.log(`referral address ${referralAddress} has no stake point`);
        }
      }
    }
    // Sum the field 'point' for elements in the referralPointAr that have the same values for fields 'address' and 'pairAddress'.
    // If the field 'point' is zero, remove the element from the array.
    const blockReferralPointReduceMap = blockReferralPointResultArr.reduce((acc, curr) => {
      const key = curr.address + "-" + curr.pairAddress;
      if (!acc[key]) {
        acc[key] = { ...curr };
      } else {
        acc[key].point += curr.point;
      }
      return acc;
    }, {});
    const referralPointFinal: ReferralPoints[] = Object.values(blockReferralPointReduceMap);

    try {
      await this.lrtUnitwork.useTransaction(async () => {
        await this.referralPointsRepository.deleteBySeason(season);
        await this.referralPointsRepository.addManyOrUpdate(
          referralPointFinal,
          ["point"],
          ["address", "pairAddress", "season"]
        );
      });
    } catch (error) {
      this.logger.error("Failed to save referral point to db", error.stack);
    }
  }
}
