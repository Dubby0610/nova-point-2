import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { UnitOfWork } from "../unitOfWork";
import { AddressTvl, BlockAddressPoint, Point } from "../entities";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

@Injectable()
export class BlockAddressPointRepository extends BaseRepository<BlockAddressPoint> {
  public constructor(unitOfWork: UnitOfWork) {
    super(BlockAddressPoint, unitOfWork);
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
    referrerBlocBlockAddressPoint?: QueryDeepPartialEntity<BlockAddressPoint>,
    referrerAddressPoint?: QueryDeepPartialEntity<Point>,
    transferId?: number
  ): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.transaction(async (entityManager) => {
      await entityManager.upsert<BlockAddressPoint>(BlockAddressPoint, receiverBlocBlockAddressPoint, [
        "blockNumber",
        "address",
      ]);
      await entityManager.upsert<Point>(Point, receiverAddressPoint, ["address"]);
      if (!!referrerBlocBlockAddressPoint) {
        await entityManager.upsert<BlockAddressPoint>(BlockAddressPoint, referrerBlocBlockAddressPoint, [
          "blockNumber",
          "address",
        ]);
      }
      if (!!referrerAddressPoint) {
        await entityManager.upsert<Point>(Point, referrerAddressPoint, ["address"]);
      }
      if (!!transferId) {
        await entityManager.query(`SELECT setval('"pointParsedTransferId"', $1, false);`, [transferId]);
      }
    });
  }

  public async upsertUserAndReferrerTvl(
    blocBlockAddressPoint: QueryDeepPartialEntity<BlockAddressPoint>,
    addressTvl: QueryDeepPartialEntity<AddressTvl>,
    referrerAddressTvl?: QueryDeepPartialEntity<AddressTvl>
  ): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.transaction(async (entityManager) => {
      await entityManager.upsert<BlockAddressPoint>(BlockAddressPoint, blocBlockAddressPoint, [
        "blockNumber",
        "address",
      ]);
      await entityManager.upsert<AddressTvl>(AddressTvl, addressTvl, ["address"]);
      if (!!referrerAddressTvl) {
        await entityManager.upsert<AddressTvl>(AddressTvl, referrerAddressTvl, ["address"]);
      }
    });
  }
}
