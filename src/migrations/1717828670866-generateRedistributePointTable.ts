import { MigrationInterface, QueryRunner } from "typeorm";

export class GenerateRedistributePointTable1717828670866 implements MigrationInterface {
    name = 'GenerateRedistributePointTable1717828670866'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "userHolding" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userAddress" bytea NOT NULL, "tokenAddress" bytea NOT NULL, "balance" character varying(128) NOT NULL, "pointWeight" character varying(128) NOT NULL, "pointWeightPercentage" numeric(30,18) NOT NULL, CONSTRAINT "PK_1278933827bde6189d18dd9f840" PRIMARY KEY ("userAddress", "tokenAddress"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1278933827bde6189d18dd9f84" ON "userHolding" ("userAddress", "tokenAddress") `);
        await queryRunner.query(`CREATE TABLE "userWithdraw" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userAddress" bytea NOT NULL, "tokenAddress" bytea NOT NULL, "timestamp" TIMESTAMP NOT NULL, "balance" character varying(128) NOT NULL, CONSTRAINT "PK_6665108aace1ac4ba2f23cb18c5" PRIMARY KEY ("userAddress", "tokenAddress", "timestamp"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6665108aace1ac4ba2f23cb18c" ON "userWithdraw" ("userAddress", "tokenAddress", "timestamp") `);
        await queryRunner.query(`CREATE TABLE "user" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userAddress" bytea NOT NULL, CONSTRAINT "PK_71264313587278982a0a3c18ea0" PRIMARY KEY ("userAddress"))`);
        await queryRunner.query(`CREATE TABLE "userStaked" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userAddress" bytea NOT NULL, "tokenAddress" bytea NOT NULL, "poolAddress" bytea NOT NULL, "balance" character varying(128) NOT NULL, "pointWeight" character varying(128) NOT NULL, "pointWeightPercentage" numeric(30,18) NOT NULL, CONSTRAINT "PK_866e203fc5afb89a7d10a0c115a" PRIMARY KEY ("userAddress", "tokenAddress", "poolAddress"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_866e203fc5afb89a7d10a0c115" ON "userStaked" ("userAddress", "tokenAddress", "poolAddress") `);
        await queryRunner.query(`ALTER TABLE "userHolding" ADD CONSTRAINT "FK_1f57e6f595fddd95e3dd7338f61" FOREIGN KEY ("userAddress") REFERENCES "user"("userAddress") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "userWithdraw" ADD CONSTRAINT "FK_5530acf5f71e1ab872f81207553" FOREIGN KEY ("userAddress") REFERENCES "user"("userAddress") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "userStaked" ADD CONSTRAINT "FK_975d7c94854b177d1654dbd5c09" FOREIGN KEY ("userAddress") REFERENCES "user"("userAddress") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "userStaked" DROP CONSTRAINT "FK_975d7c94854b177d1654dbd5c09"`);
        await queryRunner.query(`ALTER TABLE "userWithdraw" DROP CONSTRAINT "FK_5530acf5f71e1ab872f81207553"`);
        await queryRunner.query(`ALTER TABLE "userHolding" DROP CONSTRAINT "FK_1f57e6f595fddd95e3dd7338f61"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_866e203fc5afb89a7d10a0c115"`);
        await queryRunner.query(`DROP TABLE "userStaked"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6665108aace1ac4ba2f23cb18c"`);
        await queryRunner.query(`DROP TABLE "userWithdraw"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1278933827bde6189d18dd9f84"`);
        await queryRunner.query(`DROP TABLE "userHolding"`);
    }
}
