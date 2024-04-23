import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { ReferralUnitOfWork } from "../unitOfWork";
import { Referral } from "../entities";

@Injectable()
export class ReferrerRepository extends BaseRepository<Referral> {
  public constructor(unitOfWork: ReferralUnitOfWork) {
    super(Referral, unitOfWork);
  }

  public async getReferral(address: string): Promise<Referral> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<Referral>(Referral, {
      where: { address },
    });
  }

  public async getReferees(address: string): Promise<Referral[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.find<Referral>(Referral, {
      where: { referrer: address },
    });
  }
}
