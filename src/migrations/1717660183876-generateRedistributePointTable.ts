import { MigrationInterface, QueryRunner } from "typeorm";

export class GenerateRedistributePointTable1717660183876 implements MigrationInterface {
    name = 'GenerateRedistributePointTable1717660183876'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userAddress" bytea NOT NULL, CONSTRAINT "PK_71264313587278982a0a3c18ea0" PRIMARY KEY ("userAddress"))`);
        await queryRunner.query(`CREATE TABLE "user_redistribute_point" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "tokenAddress" bytea NOT NULL, "balance" character varying(128) NOT NULL, "exchangeRate" numeric(12,10) NOT NULL, "pointWeight" character varying(128) NOT NULL, "pointWeightPercentage" numeric(12,10) NOT NULL, "userAddress" bytea, CONSTRAINT "PK_e5f3acb2209bf650835d71e28ed" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b41f5e626e104279c4dd838366" ON "user_redistribute_point" ("userAddress", "tokenAddress") `);
        await queryRunner.query(`CREATE TABLE "withdraw_history" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "balance" character varying(128) NOT NULL, "timestamp" TIMESTAMP NOT NULL, "userPointId" integer, CONSTRAINT "PK_c5fe833f62249dd76df8a5b36e7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user_redistribute_point" ADD CONSTRAINT "FK_bdf6801dec29e81f6257475bcc2" FOREIGN KEY ("userAddress") REFERENCES "user"("userAddress") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "withdraw_history" ADD CONSTRAINT "FK_042b2d881c4c7c4d3e74195863d" FOREIGN KEY ("userPointId") REFERENCES "user_redistribute_point"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "withdraw_history" DROP CONSTRAINT "FK_042b2d881c4c7c4d3e74195863d"`);
        await queryRunner.query(`ALTER TABLE "user_redistribute_point" DROP CONSTRAINT "FK_bdf6801dec29e81f6257475bcc2"`);
        await queryRunner.query(`DROP TABLE "withdraw_history"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b41f5e626e104279c4dd838366"`);
        await queryRunner.query(`DROP TABLE "user_redistribute_point"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
