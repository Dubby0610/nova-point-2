import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { UnitOfWork } from "../unitOfWork";
import { AddressFirstDeposit } from "../entities/addressFirstDeposit.entity";

@Injectable()
export class AddressFirstDepositRepository extends BaseRepository<AddressFirstDeposit> {
  public constructor(unitOfWork: UnitOfWork) {
    super(AddressFirstDeposit, unitOfWork);
  }

  public async getAddressFirstDeposit(address: string): Promise<AddressFirstDeposit> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<AddressFirstDeposit>(AddressFirstDeposit, {
      where: { address },
    });
  }

  public async getAllAddressFirstDeposits(): Promise<AddressFirstDeposit[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.find<AddressFirstDeposit>(AddressFirstDeposit);
  }

  public createDefaultAddressTokenTvl(address: string): AddressFirstDeposit {
    return {
      address: address,
      firstDepositTime: new Date(),
    };
  }

  public async addMany(records: Partial<AddressFirstDeposit>[]): Promise<void> {
    if (!records?.length) {
      return;
    }

    const transactionManager = this.unitOfWork.getTransactionManager();

    let recordsToAdd = [];
    for (let i = 0; i < records.length; i++) {
      recordsToAdd.push(records[i]);
      if (recordsToAdd.length === 1000 || i === records.length - 1) {
        await transactionManager.upsert<AddressFirstDeposit>(this.entityTarget, recordsToAdd, ["address"]);
        recordsToAdd = [];
      }
    }
  }
}
