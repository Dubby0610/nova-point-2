import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUniqueIndex1714489958001 implements MigrationInterface {
  name = "CreateUniqueIndex1714489958001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_46546aeed5740ded71e2cf3f2e" ON "blockAddressPointOfLp" ("blockNumber", "address", "pairAddress")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_46546aeed5740ded71e2cf3f2e"`
    );
  }
}
