import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTabletsUserProjectPoints1716274359001 implements MigrationInterface {
  name = "AlterTabletsUserProjectPoints1716274359001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`alter table user_project_points add "snapshotDate" date default date(CURRENT_DATE) not null;`);
    await queryRunner.query(`CREATE INDEX "IDX_b77ae7c6db57aa0ff5f226e7e6" ON "user_project_points" ("snapshotDate", "userAddress");`);
    await queryRunner.query(`CREATE INDEX "IDX_b77ae7c6db57aa0ff5f2269999" ON "user_project_points" ("userAddress");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_b77ae7c6db57aa0ff5f2269999"`);
    await queryRunner.query(`DROP INDEX "IDX_b77ae7c6db57aa0ff5f226e7e6"`);
    await queryRunner.query(`ALTER TABLE "user_project_points" DROP COLUMN "snapshotDate";`);
  }
}