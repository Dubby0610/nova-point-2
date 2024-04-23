import { Injectable } from "@nestjs/common";
import { UnitOfWork } from "../unitOfWork";
import { Point } from "../entities";

@Injectable()
export class PointsRepository {
  public constructor(private readonly unitOfWork: UnitOfWork) {}

  public async add(address: Buffer, stakePoint: number, refPoint: number, refNumber: number): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.query(
      `INSERT INTO points (address,"stakePoint","refPoint","refNumber") VALUES ($1,$2,$3,$4) 
            ON CONFLICT (address) 
            DO UPDATE
            SET "stakePoint" = $2,
            "refPoint" = $3,
            "refNumber" = $4
            `,
      [address, stakePoint, refPoint, refNumber]
    );
  }

  public async update(address: Buffer, refPoint: number): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.update<Point>(
      Point,
      {
        address: address.toString("hex"),
      },
      { refPoint }
    );
  }

  public async updateDeposits(deposits: Map<string, number>): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    for (const [address, depositPoint] of deposits) {
      const addrBuf = Buffer.from(address.substring(2), "hex");
      const ret = await transactionManager.query(
        `SELECT "stakePoint"
           FROM points
           WHERE address = $1`,
        [addrBuf]
      );
      if (!ret || ret.length == 0) {
        await transactionManager.query(
          `INSERT INTO points (address, "stakePoint", "refPoint", "refNumber")
             VALUES ($1, $2, 0, 0)`,
          [addrBuf, depositPoint]
        );
      } else {
        await transactionManager.query(`UPDATE points SET "stakePoint" = "stakePoint" + $2 WHERE address = $1`, [
          addrBuf,
          depositPoint,
        ]);
      }
    }
  }

  public async getStakePointByAddress(address: Buffer): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const accountPoint = await transactionManager.query(`SELECT "stakePoint" FROM points WHERE address = $1`, [
      address,
    ]);
    return accountPoint?.stakePoint || 0;
  }

  public async getPointByAddress(address: string): Promise<Point> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<Point>(Point, {
      where: { address },
    });
  }

  public createDefaultPoint(address: string): Point {
    return {
      id: 0,
      address,
      stakePoint: 0,
      refPoint: 0,
      refNumber: 0,
    };
  }

  public async getLastStatisticalBlockNumber(): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const [fromBlockNumber] = await transactionManager.query(`SELECT last_value FROM "pointStatisticalBlockNumber";`);
    return Number(fromBlockNumber.last_value);
  }

  public async setStatisticalBlockNumber(blockNumber: number): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.query(`SELECT setval('"pointStatisticalBlockNumber"', $1, false);`, [blockNumber]);
  }

  public async getLastHoldPointStatisticalBlockNumber(): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const [fromBlockNumber] = await transactionManager.query(
      `SELECT last_value FROM "holdPointStatisticalBlockNumber";`
    );
    return Number(fromBlockNumber.last_value);
  }

  public async setHoldPointStatisticalBlockNumber(blockNumber: number): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.query(`SELECT setval('"holdPointStatisticalBlockNumber"', $1, false);`, [blockNumber]);
  }
}
