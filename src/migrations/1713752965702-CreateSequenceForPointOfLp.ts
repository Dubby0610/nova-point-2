import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSequenceForPointOfLp1713752965702 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE "pointOfLpStatisticalBlockNumber" AS BIGINT MINVALUE 0`);
    await queryRunner.query(`CREATE SEQUENCE "holdPointOfLpStatisticalBlockNumber" AS BIGINT MINVALUE 1`);
    await queryRunner.query(`CREATE SEQUENCE "balanceOfLpStatisticalBlockNumber" AS BIGINT MINVALUE 1`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE "pointOfLpStatisticalBlockNumber"`);
    await queryRunner.query(`DROP SEQUENCE "holdPointOfLpStatisticalBlockNumber"`);
    await queryRunner.query(`DROP SEQUENCE "balanceOfLpStatisticalBlockNumber"`);
  }
}
