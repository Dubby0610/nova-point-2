import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { Point } from "../entities";
import { In } from "typeorm";
import { BaseRepository } from "./base.repository";

@Injectable()
export class PointsRepository extends BaseRepository<Point> {
  public constructor(unitOfWork: UnitOfWork) {
    super(Point, unitOfWork);
  }

  public async getPoints(): Promise<Point[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.find<Point>(Point);
  }

  public createDefaultPoint(address: string, stakePoint: number = 0): Point {
    return {
      id: 0,
      address,
      stakePoint,
      refPoint: 0,
    };
  }
}
