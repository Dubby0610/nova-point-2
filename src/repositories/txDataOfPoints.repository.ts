import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { TransactionDataOfPoints } from "../entities";

@Injectable()
export class TxDataOfPointsRepository extends BaseRepository<TransactionDataOfPoints> {
  public constructor(unitOfWork: UnitOfWork) {
    super(TransactionDataOfPoints, unitOfWork);
  }

  public async getValue(key: string): Promise<string> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = await transactionManager.findOne<TransactionDataOfPoints>(TransactionDataOfPoints, {
      where: { userAddress: key },
    });
    return result?.quantity ?? "";
  }

  public async setValue(key: string, value: string): Promise<boolean> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return !!(await transactionManager.upsert<TransactionDataOfPoints>(TransactionDataOfPoints, { contractAddress: key, userAddress: value }, ["key"]));
  }

  public async setBridgeStatisticalBlockNumber(blockNumber: number): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.query(`SELECT setval('"bridgeStatisticalBlockNumber"', $1, false);`, [blockNumber]);
  }

  public async getLastBridgeStatisticalBlockNumber(): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const [blockNumber] = await transactionManager.query(`SELECT last_value FROM "bridgeStatisticalBlockNumber";`);
    return Number(blockNumber.last_value);
  }
}
