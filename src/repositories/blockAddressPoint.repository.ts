import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BlockAddressPoint, Point } from "../entities";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

@Injectable()
export class BlockAddressPointRepository extends BaseRepository<BlockAddressPoint> {
  public constructor(unitOfWork: UnitOfWork) {
    super(BlockAddressPoint, unitOfWork);
  }

  public async getBlockAddressPoint(blockNumber: number, address: string): Promise<BlockAddressPoint> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<BlockAddressPoint>(BlockAddressPoint, {
      where: { blockNumber, address },
    });
  }

  public createDefaultBlockAddressPoint(blockNumber: number, address: string): BlockAddressPoint {
    return {
      createdAt: new Date(),
      updatedAt: new Date(),
      blockNumber: blockNumber,
      address: address,
      depositPoint: 0,
      holdPoint: 0,
      refPoint: 0,
    };
  }

  public async upsertUserAndReferrerPoint(
    receiverBlocBlockAddressPoint: QueryDeepPartialEntity<BlockAddressPoint>,
    receiverAddressPoint: QueryDeepPartialEntity<Point>,
    transferId?: number
  ): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.transaction(async (entityManager) => {
      await entityManager.upsert<BlockAddressPoint>(BlockAddressPoint, receiverBlocBlockAddressPoint, [
        "blockNumber",
        "address",
      ]);
      await entityManager.upsert<Point>(Point, receiverAddressPoint, ["address"]);
      if (!!transferId) {
        await entityManager.query(`SELECT setval('"pointParsedTransferId"', $1, false);`, [transferId]);
      }
    });
  }
}
