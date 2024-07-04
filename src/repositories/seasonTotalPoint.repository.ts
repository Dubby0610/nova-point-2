import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { SeasonTotalPoint } from "../entities";

@Injectable()
export class SeasonTotalPointRepository extends BaseRepository<SeasonTotalPoint> {
  public constructor(unitOfWork: UnitOfWork) {
    super(SeasonTotalPoint, unitOfWork);
  }

  public async getPointByAddresses(addresses: string[], season: number): Promise<SeasonTotalPoint[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const addressesBuff = addresses.map((item) => Buffer.from(item.substring(2), "hex"));
    const result = await transactionManager.query(
      `SELECT * FROM public."seasonTotalPoint" WHERE "userAddress" = ANY($1) AND season=${season} AND type != 'referral' AND type != 'other';`,
      [addressesBuff]
    );
    return result.map((row: any) => {
      row.userAddress = "0x" + row.userAddress.toString("hex");
      row.pairAddress = "0x" + row.pairAddress.toString("hex");
      row.point = isFinite(Number(row.point)) ? Number(row.point) : 0;
      return row;
    });
  }
}
