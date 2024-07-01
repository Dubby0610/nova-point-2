import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { SeasonTotalPoint } from "../entities";

@Injectable()
export class SeasonTotalPointRepository extends BaseRepository<SeasonTotalPoint> {
  public constructor(unitOfWork: UnitOfWork) {
    super(SeasonTotalPoint, unitOfWork);
  }
}
