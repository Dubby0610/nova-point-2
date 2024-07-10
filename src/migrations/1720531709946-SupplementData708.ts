import { MigrationInterface, QueryRunner, DataSource } from "typeorm";
import { typeOrmRefactorModuleOptions } from "../typeorm.config";

export class SupplementData7081720531709946 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const typeOrmRefactorCliDataSource = new DataSource({
      ...typeOrmRefactorModuleOptions,
    });
    const startTime = "2024-07-07 00:00:00";
    const endTime = "2024-07-08 00:00:00";
    await queryRunner.query(
      `delete from "blockAddressPoint" where "createdAt">='${startTime}' and "createdAt"<'${endTime}';`
    );

    const refactorDataSource = await typeOrmRefactorCliDataSource.initialize();

    let offset = 0;
    const limit = 5000000;
    while (true) {
      const blockAddressPointData = await refactorDataSource.query(
        `SELECT * FROM "blockAddressPoint" WHERE "createdAt">='${startTime}' and "createdAt">='${endTime}' ORDER BY "blockNumber" asc, "address" asc limit ${limit} offset ${offset}`
      );
      if (blockAddressPointData.length === 0) {
        break;
      }
      await this.batchInsertIgnore(queryRunner, blockAddressPointData, "blockAddressPoint", [
        "blockNumber",
        "address",
        "depositPoint",
        "holdPoint",
        "refPoint",
        "createdAt",
        "updatedAt",
      ]);
      offset += limit;
    }

    const pointsData = await refactorDataSource.query(`SELECT * FROM "points"`);
    await this.batchInsertOrUpdate(queryRunner, pointsData, "points", ["id", "address", "stakePoint", "refPoint"]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  public async batchInsertIgnore(queryRunner: QueryRunner, data: any, table: string, columns: string[]): Promise<void> {
    const batchSize = 1000;
    const tmpBatchData = [];
    for (let i = 0; i < data.length; i++) {
      tmpBatchData.push(data[i]);
      if (tmpBatchData.length === batchSize || i === data.length - 1) {
        const batchData = tmpBatchData.map((item) => columns.map((column) => item[column]).flat());
        const querySql = `INSERT INTO "${table}" ("${columns.join('", "')}") VALUES ${batchData
          .map((_, index) => `(${columns.map((_, cindex) => `$${index * columns.length + 1 + cindex}`).join(", ")})`)
          .join(", ")} ON CONFLICT (address, "blockNumber") DO NOTHING;`;
        await queryRunner.query(querySql, batchData.flat());
        tmpBatchData.length = 0;
      }
    }
  }

  public async batchInsertOrUpdate(
    queryRunner: QueryRunner,
    data: any,
    table: string,
    columns: string[]
  ): Promise<void> {
    const batchSize = 1000;
    const tmpBatchData = [];
    for (let i = 0; i < data.length; i++) {
      tmpBatchData.push(data[i]);
      if (tmpBatchData.length === batchSize || i === data.length - 1) {
        const batchData = tmpBatchData.map((item) => columns.map((column) => item[column]).flat());
        const querySql = `INSERT INTO "${table}" ("${columns.join('", "')}") VALUES ${batchData
          .map((_, index) => `(${columns.map((_, cindex) => `$${index * columns.length + 1 + cindex}`).join(", ")})`)
          .join(
            ", "
          )} ON CONFLICT (address) DO UPDATE SET "stakePoint" = EXCLUDED."stakePoint", "refPoint" = EXCLUDED."refPoint";`;
        await queryRunner.query(querySql, batchData.flat());
        tmpBatchData.length = 0;
      }
    }
  }
}
