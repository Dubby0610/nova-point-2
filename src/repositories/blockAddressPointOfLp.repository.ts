import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BlockAddressPointOfLp, PointsOfLp } from "../entities";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

@Injectable()
export class BlockAddressPointOfLpRepository extends BaseRepository<BlockAddressPointOfLp> {
  public constructor(unitOfWork: UnitOfWork) {
    super(BlockAddressPointOfLp, unitOfWork);
  }

  public async upsertUserPoints(
    receiverBlocBlockAddressPoint: QueryDeepPartialEntity<BlockAddressPointOfLp>,
    receiverAddressPoint: QueryDeepPartialEntity<PointsOfLp>
  ): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.transaction(async (entityManager) => {
      await entityManager.upsert<BlockAddressPointOfLp>(BlockAddressPointOfLp, receiverBlocBlockAddressPoint, [
        "blockNumber",
        "address",
        "pairAddress",
        "type",
      ]);
      await entityManager.upsert<PointsOfLp>(PointsOfLp, receiverAddressPoint, ["address", "pairAddress"]);
    });
  }
}
