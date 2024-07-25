import { MigrationInterface, QueryRunner } from "typeorm";

export class GenerateDirectPointProcessingStatusTable1721893869511 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "directHoldProcessingStatus" (
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "blockNumber" integer NOT NULL,  
        "pointProcessed" boolean NOT NULL DEFAULT false, 
        CONSTRAINT "PK_directHoldProcessingStatus" PRIMARY KEY ("blockNumber"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_directHoldProcessingStatus_1" ON "directHoldProcessingStatus" ("pointProcessed") `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_directHoldProcessingStatus_1"`);
    await queryRunner.query(`DROP TABLE "directHoldProcessingStatus"`);
  }
}
