import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { UserStaked } from "../entities";

@Injectable()
export class UserStakedRepository extends BaseRepository<UserStaked> {
  public constructor(unitOfWork: UnitOfWork) {
    super(UserStaked, unitOfWork);
  }
}
