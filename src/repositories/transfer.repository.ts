import { Injectable } from "@nestjs/common";
import { Transfer, TransferType } from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { LessThan } from "typeorm";

@Injectable()
export class TransferRepository extends BaseRepository<Transfer> {
  public constructor(unitOfWork: UnitOfWork) {
    super(Transfer, unitOfWork);
  }

  public async getDeposits(address: Buffer, blockNumber: number): Promise<Transfer[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.query(
      `SELECT * FROM transfers WHERE type = 'deposit' AND "from" = $1 AND "blockNumber" <= $2;`,
      [address, blockNumber]
    );
  }

  public async getBlockDeposits(blockNumber: number): Promise<Transfer[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.query(`SELECT * FROM transfers WHERE type = 'deposit' AND "blockNumber" = $1;`, [
      blockNumber,
    ]);
  }

  public async isNewDeposit(address: string, blockNumber: number): Promise<boolean> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const count = await transactionManager.count<Transfer>(Transfer, {
      where: {
        from: address,
        type: TransferType.Deposit,
        blockNumber: LessThan(blockNumber),
      },
    });
    return count == 0;
  }

  public async getAddressFirstDeposit(address: string): Promise<Transfer | undefined> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const [firstDeposit] = await transactionManager.find<Transfer>(Transfer, {
      where: {
        from: address,
        type: TransferType.Deposit,
      },
      select: ["timestamp"],
      take: 1,
      order: {
        timestamp: "ASC",
      },
    });
    return firstDeposit;
  }

  // public override async addMany(records: Partial<Transfer>[]): Promise<void> {
  //   await super.addMany(records);
  // }
}
