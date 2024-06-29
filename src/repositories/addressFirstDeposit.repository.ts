import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { AddressFirstDeposit } from "../entities/addressFirstDeposit.entity";
import { In } from "typeorm";

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


  /**
   * 
   * @param addresses user address
   * @returns a Map which key is the user address
   */
  public async getFirstDepositMapForAddresses(addresses: string[]): Promise<Map<string, Date>> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const addressesBuff = addresses.map((item) => Buffer.from(item.substring(2), "hex"));
    const result = await transactionManager.getRepository(AddressFirstDeposit)
      .createQueryBuilder("afd")
      .where("afd.address = ANY(:addresses)", { addresses: addressesBuff })
      .getMany();

    return new Map(result.map((row) => {
      return [row.address.toLowerCase(), row.firstDepositTime];
    }));
  }

  public async getAllAddressFirstDeposits(): Promise<AddressFirstDeposit[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.find<AddressFirstDeposit>(AddressFirstDeposit);
  }
}
