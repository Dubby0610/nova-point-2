import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { UserWithdraw } from "../entities";

@Injectable()
export class UserWithdrawRepository extends BaseRepository<UserWithdraw> {
  public constructor(unitOfWork: UnitOfWork) {
    super(UserWithdraw, unitOfWork);
  }
}
