import { MigrationInterface, QueryRunner } from "typeorm";

export class CalculateAndUpdateTotalPoints1720355754693 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "pointsOfLp_backup" AS SELECT * FROM "pointsOfLp";`);

    await queryRunner.query(`
        UPDATE "pointsOfLp" AS p 
        SET "stakePoint" = COALESCE((
            SELECT SUM(b."holdPoint")
            FROM "blockAddressPointOfLp" AS b
            WHERE b.address = p.address AND b."pairAddress" = p."pairAddress"
        ), 0);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "pointsOfLp";`);
    await queryRunner.query(`ALTER TABLE "pointsOfLp_backup" RENAME TO "pointsOfLp";`);
  }
}
