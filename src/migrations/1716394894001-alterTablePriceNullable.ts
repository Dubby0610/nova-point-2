import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTablePriceNullable1716394894001 implements MigrationInterface {
    name = 'AlterTablePriceNullable1716394894001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactionDataOfPoints" ALTER COLUMN "price" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactionDataOfPoints" ALTER COLUMN "price" SET NOT NULL`);
    }

}
