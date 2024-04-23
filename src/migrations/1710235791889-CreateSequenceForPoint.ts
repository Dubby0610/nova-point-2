import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSequenceForPoint1710235791889 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE "pointStatisticalBlockNumber" AS BIGINT MINVALUE 0`);
    await queryRunner.query(`CREATE SEQUENCE "holdPointStatisticalBlockNumber" AS BIGINT MINVALUE 1`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE "pointStatisticalBlockNumber"`);
    await queryRunner.query(`DROP SEQUENCE "holdPointStatisticalBlockNumber"`);
  }
}
