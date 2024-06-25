import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterUserStakedTable1718857406446 implements MigrationInterface {
    name = 'AlterUserStakedTable1718857406446'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_1fdcf4066791089215c76132d3" ON "userStaked" ("tokenAddress", "userAddress") `);
        await queryRunner.query(`CREATE INDEX "IDX_85837fe1f75b61f077ee2db4a8" ON "userStaked" ("poolAddress") `);
        await queryRunner.query(`CREATE INDEX "IDX_1114f74a7dc507f24b3252adbc" ON "userStaked" ("tokenAddress") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_1114f74a7dc507f24b3252adbc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_85837fe1f75b61f077ee2db4a8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1fdcf4066791089215c76132d3"`);
    }
}
