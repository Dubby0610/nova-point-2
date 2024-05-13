import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { TransactionDataOfPoints } from "../entities";

export interface BalanceOfLpDto {
  address: Buffer;
  pairAddress: Buffer;
  tokenAddress?: Buffer;
  balance?: string;
  blockNumber?: number;
}

@Injectable()
export class TransactionDataOfPointsRepository extends BaseRepository<TransactionDataOfPoints> {
  public constructor(unitOfWork: UnitOfWork) {
    super(TransactionDataOfPoints, unitOfWork);
  }

  public async getListByBlockNumber(
    startBlockNumber: number,
    endBlockNumber: number
  ): Promise<TransactionDataOfPoints[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = await transactionManager.query(
      `SELECT * FROM public."transactionDataOfPoints" WHERE "blockNumber" >= $1 AND "blockNumber" < $2;`,
      [startBlockNumber, endBlockNumber]
    );
    return result.map((row: any) => {
      row.userAddress = "0x" + row.userAddress.toString("hex");
      row.contractAddress = "0x" + row.contractAddress.toString("hex");
      row.tokenAddress = "0x" + row.tokenAddress.toString("hex");
      return row;
    });
  }
}
