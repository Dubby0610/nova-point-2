import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterRedistributeBalanceTable1718385578027 implements MigrationInterface {
    name = 'AlterRedistributeBalanceTable1718385578027'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_5d6e510e5f4aefe5b96c2e1532"`);
        await queryRunner.query(`ALTER TABLE "redistribute_balance" DROP CONSTRAINT "PK_5d6e510e5f4aefe5b96c2e15322"`);
        await queryRunner.query(`ALTER TABLE "redistribute_balance" ADD CONSTRAINT "PK_327cdecd5f51f433a593e8900d1" PRIMARY KEY ("userAddress", "tokenAddress", "pairAddress")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_327cdecd5f51f433a593e8900d" ON "redistribute_balance" ("pairAddress", "tokenAddress", "userAddress") `);
        await queryRunner.query(`DELETE FROM "redistribute_balance"`);

        const redistributeBalanceHistory = await queryRunner.query(`
            SELECT
                "userAddress",
                "tokenAddress",
                "pairAddress",
                SUM(CAST("balance" AS DECIMAL)) AS "accumulateBalance",
                MAX("blockNumber") AS "blockNumber",
                (
                SELECT "balance"
                FROM "redistribute_balance_history" AS sub
                WHERE sub."userAddress" = main."userAddress"
                    AND sub."tokenAddress" = main."tokenAddress"
                    AND sub."pairAddress" = main."pairAddress"
                    AND sub."blockNumber" = MAX(main."blockNumber")
                ) AS "balance"
            FROM "redistribute_balance_history" AS main
            GROUP BY "userAddress", "tokenAddress", "pairAddress"
        `);

        for (const record of redistributeBalanceHistory) {
            const { userAddress, tokenAddress, pairAddress, accumulateBalance, blockNumber, balance } = record;

            const totalPairBalanceResult = await queryRunner.query(`
            SELECT
              SUM(CAST(balance AS DECIMAL)) AS "totalPairBalance"
            FROM redistribute_balance_history
            WHERE "tokenAddress" = $1 AND "pairAddress" = $2
          `, [tokenAddress, pairAddress]);

            const totalPairBalance = totalPairBalanceResult[0]?.totalPairBalance || 0;
            const percentage = totalPairBalance === 0 ? 0 : (Number(accumulateBalance) / Number(totalPairBalance)).toFixed(18);

            await queryRunner.query(`
                INSERT INTO "redistribute_balance" ("userAddress", "tokenAddress", "pairAddress", "accumulateBalance", "balance", "percentage", "blockNumber")
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [userAddress, tokenAddress, pairAddress, accumulateBalance, balance, percentage, blockNumber]);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_327cdecd5f51f433a593e8900d"`);
        await queryRunner.query(`ALTER TABLE "redistribute_balance" DROP CONSTRAINT "PK_327cdecd5f51f433a593e8900d1"`);
        await queryRunner.query(`ALTER TABLE "redistribute_balance" ADD CONSTRAINT "PK_5d6e510e5f4aefe5b96c2e15322" PRIMARY KEY ("userAddress", "tokenAddress", "pairAddress", "blockNumber")`);
        await queryRunner.query(`CREATE INDEX "IDX_5d6e510e5f4aefe5b96c2e1532" ON "redistribute_balance" ("userAddress", "tokenAddress", "pairAddress", "blockNumber") `);
        await queryRunner.query(`DELETE FROM redistribute_balance`);
    }
}
