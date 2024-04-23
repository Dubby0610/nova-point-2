import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1712642100254 implements MigrationInterface {
  name = "Migrations1712642100254";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX "IDX_5f7876e4a74cc2e145f591aece" ON "transfers" ("from", "type") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_5f7876e4a74cc2e145f591aece"`);
  }
}
