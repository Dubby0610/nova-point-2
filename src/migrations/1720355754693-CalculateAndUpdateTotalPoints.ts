import { MigrationInterface, QueryRunner, DataSource } from "typeorm";
import { typeOrmLrtModuleOptions } from "../typeorm.config";

export class CalculateAndUpdateTotalPoints1720355754693 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "pointsOfLp_backup" AS SELECT * FROM "pointsOfLp";`);
    const typeOrmLrtCliDataSource = new DataSource({
      ...typeOrmLrtModuleOptions,
    });
    const lrtDataSource = await typeOrmLrtCliDataSource.initialize();
    const blockAddressPointOfLpData = await lrtDataSource.query(
      `SELECT address, "pairAddress", SUM("holdPoint") as "stakePoint" FROM "blockAddressPointOfLp" GROUP BY address, "pairAddress";`
    );
    await this.batchInsert(queryRunner, blockAddressPointOfLpData, "pointsOfLp", [
      "address",
      "pairAddress",
      "stakePoint",
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "pointsOfLp";`);
    await queryRunner.query(`ALTER TABLE "pointsOfLp_backup" RENAME TO "pointsOfLp";`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_pointsOfLp_unique_address_pairAddress" ON public."pointsOfLp" USING btree (address, "pairAddress")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pointsOfLp_pairAddress" ON public."pointsOfLp" USING btree ("pairAddress")`
    );
  }

  public async batchInsert(queryRunner: QueryRunner, data: any, table: string, columns: string[]): Promise<void> {
    const batchSize = 1000;
    const tmpBatchData = [];
    for (let i = 0; i < data.length; i++) {
      tmpBatchData.push(data[i]);
      if (tmpBatchData.length === batchSize || i === data.length - 1) {
        const batchData = tmpBatchData.map((item) => columns.map((column) => item[column]).flat());
        const querySql = `INSERT INTO "${table}" ("${columns.join('", "')}") VALUES ${batchData
          .map((_, index) => `(${columns.map((_, cindex) => `$${index * columns.length + 1 + cindex}`).join(", ")})`)
          .join(", ")} ON CONFLICT (address, "pairAddress") DO UPDATE SET "stakePoint" = EXCLUDED."stakePoint"`;
        await queryRunner.query(querySql, batchData.flat());
        tmpBatchData.length = 0;
      }
    }
  }
}
