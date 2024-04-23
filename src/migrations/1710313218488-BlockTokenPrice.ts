import { MigrationInterface, QueryRunner } from "typeorm";

export class BlockTokenPrice1710313218488 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "blockTokenPrice" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "blockNumber" bigint NOT NULL, "priceId" varchar NOT NULL, "usdPrice" double precision NOT NULL, PRIMARY KEY ("blockNumber", "priceId"))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "blockTokenPrice"`);
  }
}
