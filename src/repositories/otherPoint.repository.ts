import { Injectable } from "@nestjs/common";
import { ReferralUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { OtherPoint } from "../entities";

@Injectable()
export class OtherPointRepository extends BaseRepository<OtherPoint> {
  public constructor(unitOfWork: UnitOfWork) {
    super(OtherPoint, unitOfWork);
  }

  public async getOtherPointByAddress(
    startTime: string,
    endTime: string
  ): Promise<
    {
      address: string;
      totalPoint: number;
    }[]
  > {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = await transactionManager.query(
      `SELECT address, sum("points") AS "totalPoint" FROM "points" WHERE "createdAt">='${startTime}' AND "createdAt"<'${endTime}' group by address;`
    );
    return result.map((item) => {
      return {
        address: "0x" + item.address.toString("hex"),
        totalPoint: item.totalPoint,
      };
    });
  }
}
