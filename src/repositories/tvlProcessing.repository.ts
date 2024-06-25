import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { TvlProcessingStatus } from "../entities";


@Injectable()
export class TvlProcessingRepository extends BaseRepository<TvlProcessingStatus> {
  public constructor(unitOfWork: UnitOfWork) {
    super(TvlProcessingStatus, unitOfWork);
  }

  public async updateTxStatus(adapterName: string, updateData: Partial<TvlProcessingStatus>) {
    const entityManager = this.unitOfWork.getTransactionManager();
    const result = await entityManager.update(
      this.entityTarget,
      {
        adapterName: adapterName,
      },
      updateData
    );

    return result
  }
}
