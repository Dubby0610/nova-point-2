import { MigrationInterface, QueryRunner } from "typeorm";

export class CalculateAndUpdateReferralPoints1720455754693 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "blockReferralPoints" RENAME TO "blockReferralPoints_delete";`);
    await queryRunner.query(`ALTER TABLE "referralPoints" ADD COLUMN "season" numeric DEFAULT 0;`);
    await queryRunner.query(`CREATE TABLE "referralPoints_backup" AS SELECT * FROM "referralPoints";`);
    await queryRunner.query(`TRUNCATE TABLE "referralPoints";`);
    await queryRunner.query(`DROP INDEX "PK_1893dd931640dcef5cc364e2727";`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "PK_1893dd931640dcef5cc364e2727" ON "referralPoints" ("address", "pairAddress", "season");`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "PK_1893dd931640dcef5cc364e2727";`);
    await queryRunner.query(`DROP TABLE "referralPoints";`);
    await queryRunner.query(`ALTER TABLE "referralPoints_backup" RENAME TO "referralPoints";`);
    await queryRunner.query(`ALTER TABLE "referralPoints" DROP COLUMN "season";`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "PK_1893dd931640dcef5cc364e2727" ON "referralPoints" ("address", "pairAddress");`
    );
    await queryRunner.query(`ALTER TABLE "blockReferralPoints_delete" RENAME TO "blockReferralPoints";`);
  }
}
