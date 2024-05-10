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
    const addressesBuff = addresses.map((item) => Buffer.from(item.substring(2), "hex"));
    const result = await transactionManager.query(
      `SELECT * FROM public."addressFirstDeposits" WHERE address = ANY($1);`,
      [addressesBuff]
    );
    return result.map((row: any) => {
      row.address = "0x" + row.address.toString("hex");
      return row;
    });
  }

  public async getAllAddressFirstDeposits(): Promise<AddressFirstDeposit[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.find<AddressFirstDeposit>(AddressFirstDeposit);
  }
}
