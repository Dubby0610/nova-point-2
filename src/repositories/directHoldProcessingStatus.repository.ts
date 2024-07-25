import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { DirectHoldProcessingStatus } from "../entities";

@Injectable()
export class DirectHoldProcessingStatusRepository extends BaseRepository<DirectHoldProcessingStatus> {
  public constructor(unitOfWork: LrtUnitOfWork) {
    super(DirectHoldProcessingStatus, unitOfWork);
  }

  public async upsertStatus(updateData: Partial<DirectHoldProcessingStatus>): Promise<DirectHoldProcessingStatus> {
    const entityManager = this.unitOfWork.getTransactionManager();
    const result = await entityManager.upsert(DirectHoldProcessingStatus, updateData, ["blockNumber"]);

    return result.raw[0];
  }

  public async getUnprocessedBlockNumber(): Promise<DirectHoldProcessingStatus[]> {
    const entityManager = this.unitOfWork.getTransactionManager();
    const result = await entityManager.find(DirectHoldProcessingStatus, {
      where: [{ pointProcessed: false }],
      order: { blockNumber: "ASC" },
    });

    return result;
  }
}
