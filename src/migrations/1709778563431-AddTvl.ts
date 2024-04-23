import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1709778563431 implements MigrationInterface {
  name = "Migrations1709778563431";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "addressTvls" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "address" bytea NOT NULL, "tvl" numeric NOT NULL, "referralTvl" numeric NOT NULL, CONSTRAINT "PK_073976644536e031d5e5ba334b0" PRIMARY KEY ("address"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_073976644536e031d5e5ba334b" ON "addressTvls" ("address") `);
    await queryRunner.query(
      `CREATE TABLE "addressTokenTvls" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "address" bytea NOT NULL, "tokenAddress" bytea NOT NULL, "balance" numeric NOT NULL, "tvl" numeric NOT NULL, CONSTRAINT "PK_da9226c61baf74a54aca178f8de" PRIMARY KEY ("address", "tokenAddress"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_3087fd5f663582167074da3b10" ON "addressTokenTvls" ("address") `);
    await queryRunner.query(
      `CREATE TABLE "groupTvls" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "groupId" varchar NOT NULL, "tvl" numeric NOT NULL, CONSTRAINT "PK_76c0c12beb707760665b3f51d14" PRIMARY KEY ("groupId"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_76c0c12beb707760665b3f51d1" ON "groupTvls" ("groupId") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "pointsHistory" ALTER COLUMN "refPoint" TYPE numeric`);
    await queryRunner.query(`ALTER TABLE "pointsHistory" ALTER COLUMN "stakePoint" TYPE numeric`);
    await queryRunner.query(`ALTER TABLE "points" ALTER COLUMN "refPoint" TYPE numeric`);
    await queryRunner.query(`ALTER TABLE "points" ALTER COLUMN "stakePoint" TYPE numeric`);
    await queryRunner.query(`ALTER TABLE "tokens" ALTER COLUMN "networkKey" DROP NOT NULL`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9e8db541b8d5e9ff8276ec41e8"`);
    await queryRunner.query(`DROP TABLE "referrals"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_76c0c12beb707760665b3f51d1"`);
    await queryRunner.query(`DROP TABLE "groupTvls"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3087fd5f663582167074da3b10"`);
    await queryRunner.query(`DROP TABLE "addressTokenTvls"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_073976644536e031d5e5ba334b"`);
    await queryRunner.query(`DROP TABLE "addressTvls"`);
  }
}
