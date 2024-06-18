import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { RedistributeBalanceHistory } from "../entities";


@Injectable()
export class RedistributeBalanceHistoryRepository extends BaseRepository<RedistributeBalanceHistory> {
  public constructor(unitOfWork: LrtUnitOfWork) {
    super(RedistributeBalanceHistory, unitOfWork);
  }
}
