import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { SupplementPoint } from "../entities";

@Injectable()
export class SupplementPointRepository extends BaseRepository<SupplementPoint> {
  public constructor(unitOfWork: UnitOfWork) {
    super(SupplementPoint, unitOfWork);
  }

  public async getSupplementPointByAddress(
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
      `SELECT address, sum("point") AS "totalPoint" FROM "supplementPoint" WHERE "createdAt">='${startTime}' AND "createdAt"<'${endTime}' group by address;`
    );
    return result.map((item) => {
      return {
        address: "0x" + item.address.toString("hex"),
        totalPoint: item.totalPoint,
      };
    });
  }
}
