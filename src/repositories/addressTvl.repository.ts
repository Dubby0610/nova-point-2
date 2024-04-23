import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { UnitOfWork } from "../unitOfWork";
import { AddressTvl } from "../entities";

@Injectable()
export class AddressTvlRepository extends BaseRepository<AddressTvl> {
  public constructor(unitOfWork: UnitOfWork) {
    super(AddressTvl, unitOfWork);
  }

  public async getAddressTvl(address: string): Promise<AddressTvl> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<AddressTvl>(AddressTvl, {
      where: { address },
    });
  }

  public createDefaultAddressTvl(address: string): AddressTvl {
    return {
      createdAt: new Date(),
      updatedAt: new Date(),
      address: address,
      tvl: 0,
      referralTvl: 0,
    };
  }
}
