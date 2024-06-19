import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterUserStakedTable1718792896227 implements MigrationInterface {
    name = 'AlterUserStakedTable1718792896227'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_1fdcf4066791089215c76132d3" ON "userStaked" ("tokenAddress", "userAddress") `);
        await queryRunner.query(`CREATE INDEX "IDX_553bd4029ff624d2f40d3f1d88" ON "userStaked" ("tokenAddress", "poolAddress") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_553bd4029ff624d2f40d3f1d88"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1fdcf4066791089215c76132d3"`);
    }
}
