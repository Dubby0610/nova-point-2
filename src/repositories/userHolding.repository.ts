import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { UserHolding } from "../entities";

@Injectable()
export class UserHoldingRepository extends BaseRepository<UserHolding> {
  public constructor(unitOfWork: UnitOfWork) {
    super(UserHolding, unitOfWork);
  }

}
