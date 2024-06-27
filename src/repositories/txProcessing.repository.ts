import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { TxProcessingStatus } from "../entities";

export type TxType = "txNumber" | "txVol"

@Injectable()
export class TxProcessingRepository extends BaseRepository<TxProcessingStatus> {
  public constructor(unitOfWork: UnitOfWork) {
    super(TxProcessingStatus, unitOfWork);
  }
  public async getTxProcessingStatus(projectName: string) {
    const entityManager = this.unitOfWork.getTransactionManager();
    const result = await entityManager.findOne(this.entityTarget, {
      where: {
        projectName
      }
    });

    return result
  }

  public async upsertStatus(updateData: Partial<TxProcessingStatus>) {
    const entityManager = this.unitOfWork.getTransactionManager();
    const result = await entityManager.upsert(
      this.entityTarget,
      updateData,
      ['projectName']
    );

    return result
  }
}
