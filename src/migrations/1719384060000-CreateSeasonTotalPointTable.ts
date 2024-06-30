import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSeasonTotalPointTable1719384060000 implements MigrationInterface {
  name = "CreateSeasonTotalPointTable1719384060000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "seasonTotalPoint" (
        "userAddress" bytea NOT NULL,
        "pairAddress" bytea NOT NULL,
        "userName" VARCHAR(100) NOT NULL,
        "type" VARCHAR(20) NOT NULL,
        "point" numeric default 0,
        "season" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_seasonTotalPoint_1" ON "seasonTotalPoint" ("season", "pairAddress", "userAddress", "type") `
    );
    await queryRunner.query(`CREATE INDEX "IDX_seasonTotalPoint_2" ON "seasonTotalPoint" ("userAddress") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_seasonTotalPoint_1"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_seasonTotalPoint_2"`);
    await queryRunner.query(`DROP TABLE "seasonTotalPoint"`);
  }
}
