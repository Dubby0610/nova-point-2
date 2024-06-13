import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePartitionedBalancesOfLp1718160892918 implements MigrationInterface {
    name = "CreatePartitionedBalancesOfLp1718160892918";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.startTransaction();
        try {
            // Step 1: create partition table
            await queryRunner.query(`
                CREATE TABLE "balancesOfLp_new" (
                    "address" BYTEA,
                    "tokenAddress" BYTEA,
                    "pairAddress" BYTEA,
                    "blockNumber" BIGINT,
                    "balance" VARCHAR(50),
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                    PRIMARY KEY ("address", "tokenAddress", "pairAddress", "blockNumber")
                ) PARTITION BY RANGE ("blockNumber");
            `);

            // Step 2: create partition
            for (let i = 0; i < 18; i++) {
                const startBlock = i * 1000000;
                const endBlock = (i + 1) * 1000000;
                const partitionTableName = `balancesOfLp_part${i + 1}`;

                await queryRunner.query(`
                    CREATE TABLE "${partitionTableName}" PARTITION OF "balancesOfLp_new"
                    FOR VALUES FROM (${startBlock}) TO (${endBlock});
                `);
                await queryRunner.query(`CREATE INDEX "IDX_${partitionTableName}_blockNumber_pairAddress_tokenAddress" ON "${partitionTableName}" ("pairAddress", "blockNumber", "tokenAddress")`);
                await queryRunner.query(`CREATE INDEX "IDX_${partitionTableName}_blockNumber_pairAddress_tokenAddress_address" ON "${partitionTableName}" ("pairAddress", "tokenAddress", "address", "blockNumber")`);
            }


            // Step 3: backup db
            await queryRunner.query(`
                INSERT INTO "balancesOfLp_new" ("address", "tokenAddress", "pairAddress", "blockNumber", "balance", "createdAt", "updatedAt")
                SELECT "address", "tokenAddress", "pairAddress", "blockNumber", "balance", "createdAt", "updatedAt" FROM "balancesOfLp";
            `);

            // Step 4: drop old table and rename partition table
            await queryRunner.query(`
                DROP TABLE "balancesOfLp";
            `);
            await queryRunner.query(`
                ALTER TABLE "balancesOfLp_new" RENAME TO "balancesOfLp";
            `);

            // create index
            await queryRunner.query(`
                CREATE INDEX "IDX_balancesOfLp_blockNumber_pairAddress_tokenAddress" ON "balancesOfLp" ("blockNumber", "pairAddress", "tokenAddress");
            `);
            await queryRunner.query(`CREATE INDEX "IDX_balancesOfLp_blockNumber_pairAddress_tokenAddress_address" ON "balancesOfLp" ("blockNumber", "pairAddress", "tokenAddress", "address")`);
            await queryRunner.commitTransaction();

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.startTransaction();
        try {
            // Step 1: backup data to balancesOfLp_temp
            await queryRunner.query(`
                CREATE TABLE "balancesOfLp_temp" AS TABLE "balancesOfLp";
            `);

            // Step 2: drop balancesOfLp
            await queryRunner.query(`DROP TABLE "balancesOfLp";`);

            // Step 3: create old balancesOfLp
            await queryRunner.query(`
                CREATE TABLE "balancesOfLp" (
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "address" BYTEA NOT NULL,
                    "tokenAddress" BYTEA NOT NULL,
                    "pairAddress" BYTEA NOT NULL,
                    "blockNumber" BIGINT NOT NULL,
                    "balance" VARCHAR(50) NOT NULL,
                    PRIMARY KEY ("address", "tokenAddress", "pairAddress", "blockNumber")
                );
            `);

            // Step 4: migrate data to old balancesOfLp
            await queryRunner.query(`
                INSERT INTO "balancesOfLp" ("address", "tokenAddress", "pairAddress", "blockNumber", "balance", "createdAt", "updatedAt")
                SELECT "address", "tokenAddress", "pairAddress", "blockNumber", "balance", "createdAt", "updatedAt" FROM "balancesOfLp_temp";
            `);

            // Step 5: drop balancesOfLp_temp
            await queryRunner.query(`DROP TABLE "balancesOfLp_temp";`);

            // Step 6: re-create index
            await queryRunner.query(`
                CREATE INDEX "IDX_balancesOfLp_pairAddress_blockNumber_tokenAddress" ON "balancesOfLp" ("blockNumber", "pairAddress", "tokenAddress");
            `);
            await queryRunner.query(`CREATE INDEX "IDX_balancesOfLp_pairAddress_tokenAddress_address_blockNumber" ON "balancesOfLp" ("blockNumber", "pairAddress", "tokenAddress", "address")`);
            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        }
    }
}
