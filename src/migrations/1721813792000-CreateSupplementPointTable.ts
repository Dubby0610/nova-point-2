import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSupplementPointTable1721813792000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "supplementPoint" (
        "address" bytea NOT NULL,
        "batchString" VARCHAR(20) NOT NULL,
        "type" VARCHAR(20) NOT NULL,
        "point" numeric default 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_supplementPoint_1" ON "supplementPoint" ("address", "batchString","type") `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_supplementPoint_1"`);
    await queryRunner.query(`DROP TABLE "supplementPoint"`);
  }
}
