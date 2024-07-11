import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { ReferralPoints } from "src/entities/referralPoints.entity";

@Injectable()
export class ReferralPointsRepository extends BaseRepository<ReferralPoints> {
  public constructor(unitOfWork: UnitOfWork) {
    super(ReferralPoints, unitOfWork);
  }

  public async getReferralPointsByAddresses(addresses: string[], season: number = 2): Promise<ReferralPoints[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const addressBuffer = addresses.map((address) => Buffer.from(address.slice(2), "hex"));
    const data = await transactionManager.query(
      `SELECT * FROM "referralPoints" WHERE address = ANY($1) AND season=${season}`,
      [addressBuffer]
    );
    return data.map((row) => {
      return {
        address: "0x" + row.address.toString("hex").toLowerCase(),
        pairAddress: "0x" + row.pairAddress.toString("hex").toLowerCase(),
        point: row.point,
      };
    });
  }

  public async getAllAddressTotalPoint(season: number = 2): Promise<ReferralPoints[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const data = await transactionManager.query(
      `SELECT address, "pairAddress", sum(point) as "totalPoints" FROM "referralPoints" WHERE season=${season} GROUP BY address, "pairAddress";`
    );
    return data.map((row) => {
      return {
        address: "0x" + row.address.toString("hex").toLowerCase(),
        pairAddress: "0x" + row.pairAddress.toString("hex").toLowerCase(),
        point: row.totalPoints,
      };
    });
  }

  public async deleteBySeason(season: number): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.query(`DELETE FROM public."referralPoints" WHERE season=${season};`);
  }
}
