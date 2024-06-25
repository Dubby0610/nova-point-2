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
  public async getTxProcessingStatus(adapterName: string) {
    const entityManager = this.unitOfWork.getTransactionManager();
    const result = await entityManager.findOne(this.entityTarget, {
      where: {
        adapterName
      }
    });

    return result
  }

  public async updateTxStatus(adapterName: string, updateData: Partial<TxProcessingStatus>) {
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
