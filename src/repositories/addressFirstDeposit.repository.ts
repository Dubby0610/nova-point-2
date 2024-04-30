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

  public async getAllAddressesFirstDeposits(addresses: string[]): Promise<AddressFirstDeposit[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const results = await transactionManager
      .createQueryBuilder(AddressFirstDeposit, "a")
      .where("a.address IN (:...addresses)", { addresses: addresses.map(item => Buffer.from(item.substring(2), 'hex')) })
      .getMany();
    return results.map((row: any) => {
      row.address = row.address.toString("hex");
      return row;
    });
  }

  public async getAllAddressFirstDeposits(): Promise<AddressFirstDeposit[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.find<AddressFirstDeposit>(AddressFirstDeposit);
  }
}
