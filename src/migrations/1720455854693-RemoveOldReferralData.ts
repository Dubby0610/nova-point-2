import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveOldReferralData1720455854693 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `delete from "seasonTotalPoint" where "season" = 2 AND "updatedAt" < '2024-07-09 04:00:00';`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
