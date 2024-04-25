import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTableOfLp1713611500946 implements MigrationInterface {
  name = "CreateTableOfLp1713611500946";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "pointsOfLp" ("id" BIGSERIAL NOT NULL, "address" bytea NOT NULL, "pairAddress" bytea NOT NULL, "stakePoint" numeric NOT NULL, CONSTRAINT "unique_address_pairAddress" UNIQUE ("address", "pairAddress"), CONSTRAINT "PK_5893dd931640dcef5cc364e2727" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_9c036c6a9668fada31188c26d7" ON "pointsOfLp" ("address") `);
    await queryRunner.query(`CREATE INDEX "IDX_4dc931ca5b48d1dee01933f6f0" ON "pointsOfLp" ("pairAddress") `);
    await queryRunner.query(
      `CREATE TABLE "blockAddressPointOfLp" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockNumber" bigint NOT NULL, "address" bytea NOT NULL, "pairAddress" bytea NOT NULL, "holdPoint" numeric NOT NULL, CONSTRAINT "PK_866fbd4ba27bf3b2fb3b3977ce6" PRIMARY KEY ("blockNumber", "address", "pairAddress"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_35717f61c13aacde581a05ec43" ON "blockAddressPointOfLp" ("pairAddress") `
    );
    await queryRunner.query(
      `CREATE TABLE "balancesOfLp" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "address" bytea NOT NULL, "tokenAddress" bytea NOT NULL, "pairAddress" bytea NOT NULL, "blockNumber" bigint NOT NULL, "balance" character varying(50) NOT NULL, CONSTRAINT "PK_371b610277783c3f5b8939a0c19" PRIMARY KEY ("address", "tokenAddress", "pairAddress", "blockNumber"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_46546aeed5740ded71e2cf3f1f" ON "balancesOfLp" ("blockNumber", "balance") `
    );
    await queryRunner.query(
      `CREATE TABLE "project" ("name" character varying(50), "pairAddress" bytea NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "unique_project_pairAddress" UNIQUE ("pairAddress"), CONSTRAINT "PK_5893dd931640dcef5cc364e2728" PRIMARY KEY ("pairAddress"))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "balancesOfLp"`);
    await queryRunner.query(`DROP TABLE "blockAddressPointOfLp"`);
    await queryRunner.query(`DROP TABLE "pointsOfLp"`);
    await queryRunner.query(`DROP TABLE "project"`);
  }
}
