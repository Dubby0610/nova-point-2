import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { Point } from "../entities";

@Injectable()
export class PointsRepository {
  public constructor(private readonly unitOfWork: UnitOfWork) {}

  public async getPointByAddress(address: string): Promise<Point> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<Point>(Point, {
      where: { address },
    });
  }

  public createDefaultPoint(address: string): Point {
    return {
      id: 0,
      address,
      stakePoint: 0,
      refPoint: 0,
    };
  }
}
