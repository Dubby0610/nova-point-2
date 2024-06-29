import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BlockReferralPoints } from "src/entities/blockReferralPoints.entity";

@Injectable()
export class BlockReferralPointsRepository extends BaseRepository<BlockReferralPoints> {
  public constructor(unitOfWork: UnitOfWork) {
    super(BlockReferralPoints, unitOfWork);
  }
}
