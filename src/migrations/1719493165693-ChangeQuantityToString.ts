import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeQuantityToString1719493165693 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactionDataOfPoints" ADD "quantity_temp" varchar(128)`);

        await queryRunner.query(`UPDATE "transactionDataOfPoints" SET "quantity_temp" = "quantity"::varchar`);

        await queryRunner.query(`ALTER TABLE "transactionDataOfPoints" DROP COLUMN "quantity"`);

        await queryRunner.query(`ALTER TABLE "transactionDataOfPoints" RENAME COLUMN "quantity_temp" TO "quantity"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactionDataOfPoints" ADD "quantity_temp" bigint`);

        await queryRunner.query(`UPDATE "transactionDataOfPoints" SET "quantity_temp" = "quantity"::bigint`);

        await queryRunner.query(`ALTER TABLE "transactionDataOfPoints" DROP COLUMN "quantity"`);

        await queryRunner.query(`ALTER TABLE "transactionDataOfPoints" RENAME COLUMN "quantity_temp" TO "quantity"`);
    }

}
