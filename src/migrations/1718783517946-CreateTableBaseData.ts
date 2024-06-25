import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTableBaseData1718783517946 implements MigrationInterface {
  name = "CreateTableBaseData1718783517946";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "blockTokenPrice" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockNumber" bigint NOT NULL, "priceId" varchar NOT NULL, "usdPrice" double precision NOT NULL, PRIMARY KEY ("priceId","blockNumber"))`
    );
    await queryRunner.query(
      `CREATE TABLE "addressFirstDeposits" ("address" bytea NOT NULL, "firstDepositTime" TIMESTAMP NOT NULL, CONSTRAINT "PK_304182e1377fdca8908cd9e4dc3" PRIMARY KEY ("address"))`
    );
    await queryRunner.query(
      `CREATE TABLE "blockAddressPoint" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                                             "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                                             "blockNumber" bigint NOT NULL, 
                                             "address" bytea NOT NULL, 
                                             "depositPoint" decimal NOT NULL DEFAULT 0 ,
                                             "holdPoint" decimal NOT NULL, 
                                             "refPoint" decimal NOT NULL DEFAULT 0 , 
                                             PRIMARY KEY ("blockNumber", "address"))`
    );
    await queryRunner.query(
      `CREATE TABLE "points" ("id" BIGSERIAL NOT NULL, "address" bytea NOT NULL, "stakePoint" decimal NOT NULL, "refPoint" decimal NOT NULL DEFAULT 0, CONSTRAINT "PK_c9bd7c6da50151b24c19e90a0f5" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_186821d745a802779bae61192c" ON "points" ("address") `);

    await queryRunner.query(
      `CREATE TABLE "referralPoints" ("address" bytea NOT NULL, "pairAddress" bytea NOT NULL, "point" numeric NOT NULL, CONSTRAINT "PK_1893dd931640dcef5cc364e2727" PRIMARY KEY ("address","pairAddress"))`
    );

    await queryRunner.query(
      `CREATE TABLE "blockReferralPoints" ("address" bytea NOT NULL, "pairAddress" bytea NOT NULL, "point" numeric NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now())`
    );
    await queryRunner.query(`CREATE INDEX "IDX_15717f61c13aacde581a05ec43" ON "blockReferralPoints" ("address") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_15717f61c13aacde581a05ec43"`);
    await queryRunner.query(`DROP TABLE "blockReferralPoints"`);
    await queryRunner.query(`DROP TABLE "referralPoints"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_186821d745a802779bae61192c"`);
    await queryRunner.query(`DROP TABLE "points"`);
    await queryRunner.query(`DROP TABLE "blockAddressPoint"`);
    await queryRunner.query(`DROP TABLE "addressFirstDeposits"`);
    await queryRunner.query(`DROP TABLE "blockTokenPrice"`);
  }
}
