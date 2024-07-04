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
    receiverAddressPoint: QueryDeepPartialEntity<Point>
  ): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.transaction(async (entityManager) => {
      await entityManager.upsert<BlockAddressPoint>(BlockAddressPoint, receiverBlocBlockAddressPoint, [
        "blockNumber",
        "address",
      ]);
      await entityManager.upsert<Point>(Point, receiverAddressPoint, ["address"]);
    });
  }

  public async getAllAddressTotalPoint(
    startBlockNumber: number,
    endBlockNumber: number
  ): Promise<
    {
      address: string;
      pairAddress: string;
      totalPoint: number;
    }[]
  > {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = await transactionManager.query(
      `SELECT address, sum("depositPoint"+"holdPoint") AS "totalPoint" FROM "blockAddressPoint" WHERE "blockNumber">=${startBlockNumber} AND "blockNumber"<${endBlockNumber} group by address;`
    );
    return result.map((item) => {
      return {
        address: "0x" + item.address.toString("hex"),
        totalPoint: item.totalPoint,
      };
    });
  }
}
