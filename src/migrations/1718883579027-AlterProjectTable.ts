import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterProjectTable1718883579027 implements MigrationInterface {
  name = "AlterProjectTable1718883579027";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE project ADD COLUMN "tvl" VARCHAR(100) DEFAULT '0';`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE project DROP COLUMN "tvl";`);
  }
}
