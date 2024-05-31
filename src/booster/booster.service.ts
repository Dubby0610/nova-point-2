import { Injectable, Logger } from "@nestjs/common";
import BigNumber from "bignumber.js";
import { ConfigService } from "@nestjs/config";

export const LOYALTY_BOOSTER_FACTOR: BigNumber = new BigNumber(0.005);

@Injectable()
export class BoosterService {
  private readonly logger: Logger;
  private readonly withdrawStartTime: Date;
  private readonly pointsPhase1StartTime: Date;

  public constructor(private readonly configService: ConfigService) {
    this.logger = new Logger(BoosterService.name);
    this.pointsPhase1StartTime = new Date(this.configService.get<string>("points.pointsPhase1StartTime"));
    const endDate = new Date(this.pointsPhase1StartTime);
    this.withdrawStartTime = new Date(endDate.setMonth(endDate.getMonth() + 1));
  }

  /**
   *
   * @param projectName
   * @param timestamp  seconds
   * @returns
   */
  public getProjectBooster(projectName: string, type: string): BigNumber {
    const projectTxBooster = this.configService.get('projectTxBooster')
    const booster = projectTxBooster[type][projectName] ?? 1
    return booster
  }

  public getLoyaltyBooster(timestamp: number, firstDepositTs: number | null): BigNumber {
    if (!this.isWithdrawStartPhase(timestamp)) {
      return new BigNumber(1);
    }

    if (!firstDepositTs) {
      return new BigNumber(1);
    }

    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const diffInMilliseconds = timestamp - firstDepositTs;
    const loyaltyDays = new BigNumber(Math.floor(diffInMilliseconds / millisecondsPerDay));
    const loyaltyBooster = BigNumber.min(0.5, loyaltyDays.multipliedBy(LOYALTY_BOOSTER_FACTOR))
    return loyaltyBooster.plus(1);
  }

  private isWithdrawStartPhase(blockTs: number): boolean {
    return blockTs >= this.withdrawStartTime.getTime();
  }

  public getEarlyBirdMultiplier(blockTs: Date): BigNumber {
    // 1st week: 2
    // 2nd week: 1.5
    // 3rd ~ within 1 month: 1.2
    // 1 month later: 1
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
}
