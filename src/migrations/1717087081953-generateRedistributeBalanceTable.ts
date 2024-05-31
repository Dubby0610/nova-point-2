import { MigrationInterface, QueryRunner } from "typeorm";

export class GenerateRedistributeBalanceTable1717087081953 implements MigrationInterface {
    name = 'GenerateRedistributeBalanceTable1717087081953'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "redistribute_balance_history" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userAddress" bytea NOT NULL, "tokenAddress" bytea NOT NULL, "pairAddress" bytea NOT NULL, "balance" character varying(50) NOT NULL, "blockNumber" bigint NOT NULL, CONSTRAINT "UQ_1e49e498e629ea8c639d7afd580" UNIQUE ("userAddress", "tokenAddress", "pairAddress", "blockNumber"), CONSTRAINT "PK_1e49e498e629ea8c639d7afd580" PRIMARY KEY ("userAddress", "tokenAddress", "pairAddress", "blockNumber"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0d17992847151b9c38dd69d47d" ON "redistribute_balance_history" ("blockNumber") `);
        await queryRunner.query(`CREATE INDEX "IDX_d2a8709fb69ee1bc71fe37e248" ON "redistribute_balance_history" ("userAddress", "tokenAddress", "pairAddress") `);

        await queryRunner.query(`CREATE TABLE "redistribute_balance" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userAddress" bytea NOT NULL, "tokenAddress" bytea NOT NULL, "pairAddress" bytea NOT NULL, "percentage" character varying(50) NOT NULL, "balance" character varying(50) NOT NULL, "accumulateBalance" character varying(50) NOT NULL, "blockNumber" bigint NOT NULL, CONSTRAINT "PK_5d6e510e5f4aefe5b96c2e15322" PRIMARY KEY ("userAddress", "tokenAddress", "pairAddress", "blockNumber"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5d6e510e5f4aefe5b96c2e1532" ON "redistribute_balance" ("userAddress", "tokenAddress", "pairAddress", "blockNumber") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_5d6e510e5f4aefe5b96c2e1532"`);
        await queryRunner.query(`DROP TABLE "redistribute_balance"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_d2a8709fb69ee1bc71fe37e248"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0d17992847151b9c38dd69d47d"`);
        await queryRunner.query(`DROP TABLE "redistribute_balance_history"`);
    }

}
