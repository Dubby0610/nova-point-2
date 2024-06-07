import { MigrationInterface, QueryRunner } from "typeorm";

export class GenerateRedistributePointTable1717701508402 implements MigrationInterface {
    name = 'GenerateRedistributePointTable1717701508402'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userAddress" bytea NOT NULL, CONSTRAINT "PK_71264313587278982a0a3c18ea0" PRIMARY KEY ("userAddress"))`);
        await queryRunner.query(`CREATE TABLE "userRedistributePoint" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "tokenAddress" bytea NOT NULL, "balance" character varying(128) NOT NULL, "exchangeRate" numeric(30,18) NOT NULL, "pointWeight" character varying(128) NOT NULL, "pointWeightPercentage" numeric(30,18) NOT NULL, "userAddress" bytea, CONSTRAINT "PK_7d35951e96b031084122a02e0bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97ffb944fb6c94b18d50c151be" ON "userRedistributePoint" ("userAddress", "tokenAddress") `);
        await queryRunner.query(`CREATE TABLE "withdrawHistory" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "balance" character varying(128) NOT NULL, "timestamp" TIMESTAMP NOT NULL, "userPointId" integer, CONSTRAINT "PK_f844814e17b888d56d0d78f7766" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "userRedistributePoint" ADD CONSTRAINT "FK_ad5bd66759f6a794cb5f14a3cef" FOREIGN KEY ("userAddress") REFERENCES "user"("userAddress") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "withdrawHistory" ADD CONSTRAINT "FK_122ebb8224bd4de6913eced23d0" FOREIGN KEY ("userPointId") REFERENCES "userRedistributePoint"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "withdrawHistory" DROP CONSTRAINT "FK_122ebb8224bd4de6913eced23d0"`);
        await queryRunner.query(`ALTER TABLE "userRedistributePoint" DROP CONSTRAINT "FK_ad5bd66759f6a794cb5f14a3cef"`);
        await queryRunner.query(`DROP TABLE "withdrawHistory"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97ffb944fb6c94b18d50c151be"`);
        await queryRunner.query(`DROP TABLE "userRedistributePoint"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
