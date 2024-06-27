import { MigrationInterface, QueryRunner } from "typeorm";

export class GenerateAdapterProcessingStatusTable1719490599511 implements MigrationInterface {
    name = 'GenerateAdapterProcessingStatusTable1719490599511'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "txProcessingStatus" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "projectName" character varying NOT NULL, "blockNumberStart" integer NOT NULL, "blockNumberEnd" integer NOT NULL, "adapterProcessed" boolean NOT NULL DEFAULT false, "pointProcessed" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_9693f9fb6623854a5dafa729fc0" PRIMARY KEY ("projectName"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b8bfd368df24823b0450d10c33" ON "txProcessingStatus" ("adapterProcessed", "pointProcessed") `);
        await queryRunner.query(`CREATE TABLE "tvlProcessingStatus" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "projectName" character varying NOT NULL, "blockNumber" integer NOT NULL, "adapterProcessed" boolean NOT NULL DEFAULT false, "pointProcessed" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_8bad5c20846b2c74b028a71f1dd" PRIMARY KEY ("projectName", "blockNumber"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c28c5148e645836589b06f1b68" ON "tvlProcessingStatus" ("adapterProcessed", "pointProcessed") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_c28c5148e645836589b06f1b68"`);
        await queryRunner.query(`DROP TABLE "tvlProcessingStatus"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b8bfd368df24823b0450d10c33"`);
        await queryRunner.query(`DROP TABLE "txProcessingStatus"`);
    }

}
