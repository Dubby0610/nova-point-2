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

  public async getLastParsedTransferId(): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const [parsedTransferId] = await transactionManager.query(`SELECT last_value FROM "pointParsedTransferId";`);
    return Number(parsedTransferId.last_value);
  }

  public async setParsedTransferId(transferId: number): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.query(`SELECT setval('"pointParsedTransferId"', $1, false);`, [transferId]);
  }

  public async getBlockAddressPoint(
    blockNumber: number,
    address: string,
    pairAddress: string
  ): Promise<BlockAddressPointOfLp> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<BlockAddressPointOfLp>(BlockAddressPointOfLp, {
      where: { blockNumber, address, pairAddress },
    });
  }

  public createDefaultBlockAddressPoint(
    blockNumber: number,
    address: string,
    pairAddress: string
  ): BlockAddressPointOfLp {
    return {
      createdAt: new Date(),
      updatedAt: new Date(),
      blockNumber: blockNumber,
      address: address,
      pairAddress,
      holdPoint: 0,
    };
  }

  public async upsertUserAndReferrerPoint(
    receiverBlocBlockAddressPoint: QueryDeepPartialEntity<BlockAddressPointOfLp>,
    receiverAddressPoint: QueryDeepPartialEntity<PointsOfLp>,
    transferId?: number
  ): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.transaction(async (entityManager) => {
      await entityManager.upsert<BlockAddressPointOfLp>(BlockAddressPointOfLp, receiverBlocBlockAddressPoint, [
        "blockNumber",
        "address",
        "pairAddress",
      ]);
      await entityManager.upsert<PointsOfLp>(PointsOfLp, receiverAddressPoint, ["address", "pairAddress"]);
      if (!!transferId) {
        await entityManager.query(`SELECT setval('"pointParsedTransferId"', $1, false);`, [transferId]);
      }
    });
  }
}
