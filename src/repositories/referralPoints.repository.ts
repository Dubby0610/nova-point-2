import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { ReferralPoints } from "src/entities/referralPoints.entity";

@Injectable()
export class ReferralPointsRepository extends BaseRepository<ReferralPoints> {
  public constructor(unitOfWork: UnitOfWork) {
    super(ReferralPoints, unitOfWork);
  }

  public async getReferralPointsByAddresses(addresses: string[]): Promise<ReferralPoints[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const addressBuffer = addresses.map((address) => Buffer.from(address.slice(2), "hex"));
    const data = await transactionManager.query(`SELECT * FROM "referralPoints" WHERE address = ANY($1)`, [
      addressBuffer,
    ]);
    return data.map((row) => {
      return {
        address: "0x" + row.address.toString("hex").toLowerCase(),
        pairAddress: "0x" + row.pairAddress.toString("hex").toLowerCase(),
        point: row.point,
      };
    });
  }
}
