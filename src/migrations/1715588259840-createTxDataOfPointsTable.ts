import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTxDataOfPointsTable1715588259840 implements MigrationInterface {
    name = 'CreateTxDataOfPointsTable1715588259840'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "transactionDataOfPoints" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userAddress" bytea NOT NULL, "contractAddress" bytea NOT NULL, "tokenAddress" bytea NOT NULL, "decimals" smallint NOT NULL, "price" character varying(100) NOT NULL, "quantity" bigint NOT NULL, "nonce" character varying(100) NOT NULL, "timestamp" TIMESTAMP NOT NULL, "txHash" bytea NOT NULL, "blockNumber" bigint NOT NULL, CONSTRAINT "PK_1ce87ac09edee26f11353445594" PRIMARY KEY ("userAddress", "contractAddress", "tokenAddress", "decimals", "txHash"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3aa265f06c18ae2d5c26c24f1c" ON "transactionDataOfPoints" ("blockNumber") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_945272c96c70305f2c490034eb" ON "transactionDataOfPoints" ("userAddress", "txHash", "nonce") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_945272c96c70305f2c490034eb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3aa265f06c18ae2d5c26c24f1c"`);
        await queryRunner.query(`DROP TABLE "transactionDataOfPoints"`);
    }

}
