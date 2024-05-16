import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { UnitOfWork } from "../unitOfWork";
import { BlockAddressPoint } from "../entities";

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

  public async getBlockAddressPoint(blockNumber: number, address: string): Promise<BlockAddressPoint> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<BlockAddressPoint>(BlockAddressPoint, {
      where: { blockNumber, address },
    });
  }
}
