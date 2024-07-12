import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BlockAddressPointOfLp, PointsOfLp } from "../entities";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { In, Between } from "typeorm";

@Injectable()
export class BlockAddressPointOfLpRepository extends BaseRepository<BlockAddressPointOfLp> {
  public constructor(
    unitOfWork: UnitOfWork,
  ) {
    super(BlockAddressPointOfLp, unitOfWork);
  }

  public async getBlockAddressPointKeyByBlock(block: number, pairAddresses: string[],) {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = await transactionManager.transaction(async (entityManager) => {
      const blockAddressPoints = await entityManager.getRepository(BlockAddressPointOfLp).find({
        where: { blockNumber: block, pairAddress: In(pairAddresses), type: "tvl" },
        select: ["address", "pairAddress"],
      });
      return blockAddressPoints.map((point) => `${point.address}-${point.pairAddress}`);
    });
    return new Set(result);
  }

  public async getUniquePointKeyByBlockRange(startBlock: number, endBlock: number, type: string) {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const blockAddressPoints = await transactionManager.getRepository(BlockAddressPointOfLp).find({
      where: { blockNumber: Between(startBlock, endBlock), type: type },
      select: ["address", "pairAddress", "blockNumber"],
    });
    return new Set(blockAddressPoints.map((point) => `${point.address}-${point.pairAddress}-${point.blockNumber}`));
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

  public async getAllAddressTotalPoint(
    startBlockNumber: number,
    endBlockNumber: number
  ): Promise<
    {
      address: string;
      pairAddress: string;
      type: string;
      totalPoint: number;
    }[]
  > {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = await transactionManager.query(
      `SELECT address, "pairAddress", type, sum("holdPoint") AS "totalPoint" FROM "blockAddressPointOfLp" WHERE "blockNumber">=${startBlockNumber} AND "blockNumber"<${endBlockNumber} group by address,"pairAddress",type;`
    );
    return result.map((item) => {
      return {
        address: "0x" + item.address.toString("hex"),
        pairAddress: "0x" + item.pairAddress.toString("hex"),
        type: item.type,
        totalPoint: item.totalPoint,
      };
    });
  }
}
