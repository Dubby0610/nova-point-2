import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { TvlProcessingStatus } from "../entities";


@Injectable()
export class TvlProcessingRepository extends BaseRepository<TvlProcessingStatus> {
  public constructor(unitOfWork: UnitOfWork) {
    super(TvlProcessingStatus, unitOfWork);
  }

  public async upsertStatus(updateData: Partial<TvlProcessingStatus>) {
    const entityManager = this.unitOfWork.getTransactionManager();
    const result = await entityManager.upsert(
      this.entityTarget,
      updateData,
      ['projectName', 'blockNumber']
    );

    return result
  }
}
