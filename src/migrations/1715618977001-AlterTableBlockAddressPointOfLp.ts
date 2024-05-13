import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTableBlockAddressPointOfLp1715618977001 implements MigrationInterface {
  name = "AlterTableBlockAddressPointOfLp1715618977001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "blockAddressPointOfLp" ADD COLUMN "type" VARCHAR(20) DEFAULT 'tvl';`);
    await queryRunner.query(`DROP INDEX "IDX_46546aeed5740ded71e2cf3f2e"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_46546aeed5740ded71e2cf3f2f" ON "blockAddressPointOfLp" ("blockNumber", "address", "pairAddress", "type")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_46546aeed5740ded71e2cf3f2f"`);
    await queryRunner.query(`ALTER TABLE "blockAddressPointOfLp" DROP COLUMN "type";`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_46546aeed5740ded71e2cf3f2e" ON "blockAddressPointOfLp" ("blockNumber", "address", "pairAddress")`
    );
  }
}
