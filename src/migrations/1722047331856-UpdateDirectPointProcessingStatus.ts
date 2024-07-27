import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateDirectPointProcessingStatus1722047331856 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE "directHoldProcessingStatus"
            SET "pointProcessed" = false
            WHERE "blockNumber" in (4481678, 4494637, 4507425, 4520163);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
