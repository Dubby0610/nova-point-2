import { MigrationInterface, QueryRunner } from "typeorm";

export class GenerateAdapterProcessingStatusTable1718727384566 implements MigrationInterface {
    name = 'GenerateAdapterProcessingStatusTable1718727384566'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tvlProcessingStatus" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "adapterName" character varying NOT NULL, "blockNumber" integer NOT NULL, "adapterProcessed" boolean NOT NULL DEFAULT false, "pointProcessed" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_8bad5c20846b2c74b028a71f1dd" UNIQUE ("adapterName", "blockNumber"), CONSTRAINT "PK_0c4304c0cf57c38a868a1b3e128" PRIMARY KEY ("adapterName"))`);
        await queryRunner.query(`CREATE INDEX "IDX_49366c9100fefb49e8c7ef9f8b" ON "tvlProcessingStatus" ("adapterName", "adapterProcessed", "pointProcessed") `);
        await queryRunner.query(`CREATE INDEX "IDX_29ac93d8f3dc7d17dec4e7eb19" ON "tvlProcessingStatus" ("adapterName", "adapterProcessed") `);
        await queryRunner.query(`CREATE TABLE "txProcessingStatus" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "adapterName" character varying NOT NULL, "blockNumberStart" integer NOT NULL, "blockNumberEnd" integer NOT NULL, "adapterProcessed" boolean NOT NULL DEFAULT false, "txNumberPointProcessed" boolean NOT NULL DEFAULT false, "txVolPointProcessed" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_9693f9fb6623854a5dafa729fc0" PRIMARY KEY ("adapterName"))`);
        await queryRunner.query(`CREATE INDEX "IDX_58588ccdc7b0478231f8e9b740" ON "txProcessingStatus" ("adapterName", "adapterProcessed", "txVolPointProcessed", "txNumberPointProcessed") `);
        await queryRunner.query(`CREATE INDEX "IDX_ee7d6ab1aefc9b82fda340ef78" ON "txProcessingStatus" ("adapterName", "adapterProcessed", "txVolPointProcessed") `);
        await queryRunner.query(`CREATE INDEX "IDX_e498a7eaca3307a5f8da8fba19" ON "txProcessingStatus" ("adapterName", "adapterProcessed", "txNumberPointProcessed") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_e498a7eaca3307a5f8da8fba19"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ee7d6ab1aefc9b82fda340ef78"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_58588ccdc7b0478231f8e9b740"`);
        await queryRunner.query(`DROP TABLE "txProcessingStatus"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_29ac93d8f3dc7d17dec4e7eb19"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_49366c9100fefb49e8c7ef9f8b"`);
        await queryRunner.query(`DROP TABLE "tvlProcessingStatus"`);
    }

}
