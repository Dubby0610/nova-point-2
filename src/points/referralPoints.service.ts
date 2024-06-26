import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import { Cron } from "@nestjs/schedule";
import {
  BlockReferralPointsRepository,
  PointsOfLpRepository,
  ReferralPointsRepository,
  ReferralRepository,
} from "../repositories";
import { ConfigService } from "@nestjs/config";
import { BlockReferralPoints } from "src/entities/blockReferralPoints.entity";
import { ReferralPoints } from "src/entities/referralPoints.entity";
import { LrtUnitOfWork } from "../unitOfWork";

export const REFERRAL_BOOSTER: number = 0.1;

@Injectable()
export class ReferralPointService extends Worker {
  private readonly logger: Logger;

  public constructor(
    private readonly referralRepository: ReferralRepository,
    private readonly pointsOfLpRepository: PointsOfLpRepository,
    private readonly blockReferralPointsRepository: BlockReferralPointsRepository,
    private readonly referralPointsRepository: ReferralPointsRepository,
    private readonly lrtUnitOfWork: LrtUnitOfWork,
    private readonly configService: ConfigService
  ) {
    super();
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

    const addressReferralMap = await this.referralRepository.getAllAddressReferral();
    const addressArr = Array.from(addressReferralMap.keys());
    // get address referral points from referralPointsRepository
    const referralPoints = await this.referralPointsRepository.getReferralPointsByAddresses(addressArr);
    const referralPointsMap = new Map<string, ReferralPoints>();
    // key is address-pairAddress
    for (const item of referralPoints) {
      referralPointsMap.set(item.address + "-" + item.pairAddress, item);
    }
    // addressReferralMap.values() are all the referral addresses
    const referralAddresses = Array.from(addressReferralMap.values()).flat();
    // get all referral address's holding point
    const referralStakePoints = await this.pointsOfLpRepository.getPointByAddresses(referralAddresses);
    const referralStakePointMap = new Map<string, { pairAddress: string; stakePoint: number }[]>();
    for (const item of referralStakePoints) {
      if (!referralStakePointMap.has(item.address)) {
        referralStakePointMap.set(item.address, []);
      }
      referralStakePointMap.get(item.address).push({
        pairAddress: item.pairAddress,
        stakePoint: item.stakePoint,
      });
    }

    // calculate referral point = ReferralBooster * sum(holding point of every referral address)
    const blockReferralPointResultArr: BlockReferralPoints[] = [];
    for (const address of addressArr) {
      const referralAddresses = addressReferralMap.get(address);
      for (const referralAddress of referralAddresses) {
        const referralStakePointArr = referralStakePointMap.get(referralAddress);
        if (referralStakePointArr.length > 0) {
          for (const referralStakePoint of referralStakePointArr) {
            const referralPoint = referralStakePoint.stakePoint * REFERRAL_BOOSTER;
            if (referralPoint <= 0) {
              continue;
            }
            blockReferralPointResultArr.push({
              address: address,
              pairAddress: referralStakePoint.pairAddress,
              point: referralPoint,
            });
          }
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
    const blockReferralPointFinal: BlockReferralPoints[] = Object.values(blockReferralPointReduceMap);
    const referralPointFinal: ReferralPoints[] = [];
    for (const item of blockReferralPointFinal) {
      const key = item.address + "-" + item.pairAddress;
      if (referralPointsMap.has(key)) {
        const beforePoint = referralPointsMap.get(key).point;
        referralPointFinal.push({
          address: item.address,
          pairAddress: item.pairAddress,
          point: Number(beforePoint) + Number(item.point),
        });
      } else {
        referralPointFinal.push({
          address: item.address,
          pairAddress: item.pairAddress,
          point: item.point,
        });
      }
    }

    try {
      await this.lrtUnitOfWork.useTransaction(async () => {
        await this.blockReferralPointsRepository.addMany(blockReferralPointFinal);
        await this.referralPointsRepository.addManyOrUpdate(referralPointFinal, ["point"], ["address", "pairAddress"]);
      });
    } catch (error) {
      this.logger.error("Failed to save referral point to db", error.stack);
    }
  }
}
