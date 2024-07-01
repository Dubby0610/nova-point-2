import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BlockReferralPoints } from "src/entities/blockReferralPoints.entity";

@Injectable()
export class BlockReferralPointsRepository extends BaseRepository<BlockReferralPoints> {
  public constructor(unitOfWork: UnitOfWork) {
    super(BlockReferralPoints, unitOfWork);
  }

  public async getAllAddressTotalPoint(
    startTime: string,
    endTime: string
  ): Promise<
    {
      address: string;
      pairAddress: string;
      totalPoint: number;
    }[]
  > {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = await transactionManager.query(
      `SELECT address, "pairAddress", sum("point") AS "totalPoint" FROM "blockReferralPoints" WHERE "createdAt">='${startTime}' AND "createdAt"<'${endTime}' group by address,"pairAddress";`
    );
    return result.map((item) => {
      return {
        address: "0x" + item.address.toString("hex"),
        pairAddress: "0x" + item.pairAddress.toString("hex"),
        totalPoint: item.totalPoint,
      };
    });
  }
}
