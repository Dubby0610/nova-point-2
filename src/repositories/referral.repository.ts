import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { ReferralUnitOfWork as unitOfWork } from "../unitOfWork";
import { Referral } from "../entities";

@Injectable()
export class ReferralRepository extends BaseRepository<Referral> {
  public constructor(unitOfWork: unitOfWork) {
    super(Referral, unitOfWork);
  }

  public async getAllAddressReferral(): Promise<Map<string, string[]>> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const data = await transactionManager.query(`SELECT * FROM referrers;`);
    const result = new Map<string, string[]>();
    for (const row of data) {
      const address = "0x" + row.address.toString("hex");
      const referrer = "0x" + row.referrer.toString("hex");
      if (!result.has(address)) {
        result.set(address, []);
      }
      result.get(address).push(referrer);
    }
    return result;
  }
}
