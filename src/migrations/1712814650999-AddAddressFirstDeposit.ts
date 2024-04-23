import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAddressFirstDeposit1712814650999 implements MigrationInterface {
  name = "AddAddressFirstDeposit1712814650999";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "addressFirstDeposits" ("address" bytea NOT NULL, "firstDepositTime" TIMESTAMP NOT NULL, CONSTRAINT "PK_304182e1377fdca8908cd9e4dc3" PRIMARY KEY ("address"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_304182e1377fdca8908cd9e4dc" ON "addressFirstDeposits" ("address") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_304182e1377fdca8908cd9e4dc"`);
    await queryRunner.query(`DROP TABLE "addressFirstDeposits"`);
  }
}
