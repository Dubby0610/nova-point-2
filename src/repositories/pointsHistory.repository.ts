import { Injectable } from "@nestjs/common";
import { UnitOfWork } from "../unitOfWork";
import { PointsHistory } from "../entities";

@Injectable()
export class PointsHistoryRepository {
  public constructor(private readonly unitOfWork: UnitOfWork) {}

  public async add(
    address: string,
    blockNumber: number,
    stakePoint: number,
    refPoint: number,
    refNumber: number
  ): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.insert<PointsHistory>(PointsHistory, {
      address,
      blockNumber,
      stakePoint,
      refPoint,
      refNumber,
    });
  }

  public async getLastHandlePointBlock(): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const [ret] = await transactionManager.query(`SELECT MAX("blockNumber") FROM "pointsHistory"`);
    if (!ret) {
      return 0;
    } else {
      return ret.max;
    }
  }
}
