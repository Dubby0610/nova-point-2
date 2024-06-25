import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { BalanceOfLp } from "../entities";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import projectTokenBooster from "src/config/projectTokenBooster";
import { In } from "typeorm";

export interface BalanceOfLpDto {
  address: Buffer;
  pairAddress: Buffer;
  tokenAddress?: Buffer;
  balance?: string;
  blockNumber?: number;
}

export type EnhancedBalanceOfLp = BalanceOfLpDto & {
  projectName: keyof typeof projectTokenBooster;
}

export const selectBalancesOfLpByBlockScript = `
  SELECT *
  FROM "balancesOfLp"
         JOIN
       (
         SELECT address, "pairAddress", "tokenAddress", MAX("blockNumber") AS "blockNumber"
         FROM "balancesOfLp"
         WHERE address = $1 AND "pairAddress" = $2 AND "blockNumber" <= $3
         GROUP BY address, "pairAddress", "tokenAddress"
       ) AS "latest_balancesOfLp"
       ON "balancesOfLp".address = "latest_balancesOfLp".address
         AND "balancesOfLp"."tokenAddress" = "latest_balancesOfLp"."tokenAddress"
         AND "balancesOfLp"."pairAddress" = "latest_balancesOfLp"."pairAddress"
         AND "balancesOfLp"."blockNumber" = "latest_balancesOfLp"."blockNumber";
`;

@Injectable()
export class BalanceOfLpRepository extends BaseRepository<BalanceOfLp> {
  public constructor(unitOfWork: UnitOfWork) {
    super(BalanceOfLp, unitOfWork);
  }

  public async getAllAddressesByBlock(blockNumber: number): Promise<BalanceOfLpDto[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = await transactionManager.query(
      `SELECT address, "pairAddress", MAX("blockNumber") AS "blockNumber" FROM public."balancesOfLp" WHERE "blockNumber" <= $1 group by address, "pairAddress";`,
      [blockNumber]
    );
    return result.map((row: any) => {
      return { address: row.address, pairAddress: row.pairAddress, blockNumber: row.blockNumber } as BalanceOfLpDto;
    });
  }

  public async getProjectLpBalances(blockNumber: number, pairAddresses: Buffer[]) {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = await transactionManager.getRepository(BalanceOfLp).find({
      where: {
        blockNumber,
        pairAddress: In(pairAddresses)
      },
      select: ["address", "tokenAddress", "pairAddress", "blockNumber", "balance"]
    })

    return result.map(row => ({
      address: row.address,
      tokenAddress: row.tokenAddress,
      pairAddress: row.pairAddress,
      blockNumber: Number(row.blockNumber),
      balance: row.balance
    }));
  }

  public async getAllAddresses(): Promise<Buffer[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = await transactionManager.query(
      `SELECT address, "pairAddress" FROM "balancesOfLp" group by address, "pairAddress";`
    );
    return result.map((row: any) => {
      return { address: row.address, pairAddress: row.pairAddress } as BalanceOfLpDto;
    });
  }

  public async getAccountBalancesByBlock(
    address: Buffer,
    pairAddress: Buffer,
    blockNumber: number
  ): Promise<BalanceOfLp[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.query(selectBalancesOfLpByBlockScript, [address, pairAddress, blockNumber]);
  }

  public async insertBalance(balanceOfLp: QueryDeepPartialEntity<BalanceOfLp>): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.transaction(async (entityManager) => {
      await entityManager.insert<BalanceOfLp>(BalanceOfLp, balanceOfLp);
    });
  }

  public async insertBalances(balancesOfLp: QueryDeepPartialEntity<BalanceOfLp>[]): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.transaction(async (entityManager) => {
      await entityManager.insert<BalanceOfLp>(BalanceOfLp, balancesOfLp);
    });
  }
}
