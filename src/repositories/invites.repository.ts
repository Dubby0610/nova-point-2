import { Injectable } from "@nestjs/common";
import { ReferralUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { Invites } from "../entities";

@Injectable()
export class InvitesRepository extends BaseRepository<Invites> {
  public constructor(unitOfWork: UnitOfWork) {
    super(Invites, unitOfWork);
  }

  public async getInvitesByUserAddresses(userAddresses: string[]): Promise<Invites[]> {
    const userAddressesBuffer = userAddresses.map((address) => Buffer.from(address.slice(2), "hex"));
    const transactionManager = this.unitOfWork.getTransactionManager();
    const data = await transactionManager.query(
      `SELECT address, "code", "userName" FROM "invites" WHERE "address"=ANY($1);`,
      [userAddressesBuffer]
    );
    return data.map((item) => {
      return {
        address: "0x" + item.address.toString("hex"),
        code: item.code,
        userName: item.userName,
      };
    });
  }
}
