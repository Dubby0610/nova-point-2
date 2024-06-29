import { MigrationInterface, QueryRunner, DataSource } from "typeorm";
import { typeOrmRefactorModuleOptions } from "../typeorm.config";

export class CreateTableBaseData1718783517946 implements MigrationInterface {
  name = "CreateTableBaseData1718783517946";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "blockTokenPrice" (
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "blockNumber" bigint NOT NULL, 
        "priceId" varchar NOT NULL, 
        "usdPrice" double precision NOT NULL, 
        PRIMARY KEY ("blockNumber","priceId")
      ) PARTITION BY RANGE ("blockNumber");`
    );
    for (let i = 0; i < 24; i++) {
      const startBlock = i * 1500000;
      const endBlock = (i + 1) * 1500000;
      const partitionTableName = `blockTokenPrice_part${i + 1}`;

      await queryRunner.query(`
          CREATE TABLE "${partitionTableName}" PARTITION OF "blockTokenPrice"
          FOR VALUES FROM (${startBlock}) TO (${endBlock});
      `);
    }
    await queryRunner.query(
      `CREATE TABLE "addressFirstDeposits" ("address" bytea NOT NULL, "firstDepositTime" TIMESTAMP NOT NULL, CONSTRAINT "PK_304182e1377fdca8908cd9e4dc3" PRIMARY KEY ("address"))`
    );
    await queryRunner.query(
      `CREATE TABLE "blockAddressPoint" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                                             "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                                             "blockNumber" bigint NOT NULL, 
                                             "address" bytea NOT NULL, 
                                             "depositPoint" decimal NOT NULL DEFAULT 0 ,
                                             "holdPoint" decimal NOT NULL, 
                                             "refPoint" decimal NOT NULL DEFAULT 0 , 
                                             PRIMARY KEY ("blockNumber", "address")
                                            ) PARTITION BY RANGE ("blockNumber");`
    );
    await queryRunner.query(`CREATE INDEX "IDX_186821d745a802779bae61191d" ON "blockAddressPoint" ("createdAt") `);
    for (let i = 0; i < 48; i++) {
      const startBlock = i * 500000;
      const endBlock = (i + 1) * 500000;
      const partitionTableName = `blockAddressPoint_part${i + 1}`;

      await queryRunner.query(`
          CREATE TABLE "${partitionTableName}" PARTITION OF "blockAddressPoint"
          FOR VALUES FROM (${startBlock}) TO (${endBlock});
      `);
    }

    await queryRunner.query(
      `CREATE TABLE "points" ("id" BIGSERIAL NOT NULL, "address" bytea NOT NULL, "stakePoint" decimal NOT NULL, "refPoint" decimal NOT NULL DEFAULT 0, CONSTRAINT "PK_c9bd7c6da50151b24c19e90a0f5" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_186821d745a802779bae61192c" ON "points" ("address") `);

    await queryRunner.query(
      `CREATE TABLE "referralPoints" ("address" bytea NOT NULL, "pairAddress" bytea NOT NULL, "point" numeric NOT NULL, CONSTRAINT "PK_1893dd931640dcef5cc364e2727" PRIMARY KEY ("address","pairAddress"))`
    );

    await queryRunner.query(
      `CREATE TABLE "blockReferralPoints" ("address" bytea NOT NULL, "pairAddress" bytea NOT NULL, "point" numeric NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now())`
    );
    await queryRunner.query(`CREATE INDEX "IDX_15717f61c13aacde581a05ec43" ON "blockReferralPoints" ("address") `);

    const typeOrmRefactorCliDataSource = new DataSource({
      ...typeOrmRefactorModuleOptions,
    });

    const refactorDataSource = await typeOrmRefactorCliDataSource.initialize();

    let offset = 0;
    const limit = 5000000;
    while (true) {
      const blockTokenPriceData = await refactorDataSource.query(
        `SELECT * FROM "blockTokenPrice" WHERE "createdAt">='2024-05-30 00:00:00' limit ${limit} offset ${offset}`
      );
      if (blockTokenPriceData.length === 0) {
        break;
      }
      await this.batchInsert(queryRunner, blockTokenPriceData, "blockTokenPrice", [
        "blockNumber",
        "priceId",
        "usdPrice",
        "createdAt",
        "updatedAt",
      ]);
      offset += limit;
    }

    const addressFirstDepositsData = await refactorDataSource.query(`SELECT * FROM "addressFirstDeposits"`);
    await this.batchInsert(queryRunner, addressFirstDepositsData, "addressFirstDeposits", [
      "address",
      "firstDepositTime",
    ]);

    let offset2 = 0;
    const limit2 = 5000000;
    while (true) {
      const blockAddressPointData = await refactorDataSource.query(
        `SELECT * FROM "blockAddressPoint" WHERE "createdAt">='2024-05-30 00:00:00' limit ${limit2} offset ${offset2}`
      );
      if (blockAddressPointData.length === 0) {
        break;
      }
      await this.batchInsert(queryRunner, blockAddressPointData, "blockAddressPoint", [
        "blockNumber",
        "address",
        "depositPoint",
        "holdPoint",
        "refPoint",
        "createdAt",
        "updatedAt",
      ]);
      offset2 += limit2;
    }

    const pointsData = await refactorDataSource.query(`SELECT * FROM "points"`);
    await this.batchInsert(queryRunner, pointsData, "points", ["id", "address", "stakePoint", "refPoint"]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_15717f61c13aacde581a05ec43"`);
    await queryRunner.query(`DROP TABLE "blockReferralPoints"`);
    await queryRunner.query(`DROP TABLE "referralPoints"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_186821d745a802779bae61192c"`);
    await queryRunner.query(`DROP TABLE "points"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_186821d745a802779bae61191d"`);
    await queryRunner.query(`DROP TABLE "blockAddressPoint"`);
    await queryRunner.query(`DROP TABLE "addressFirstDeposits"`);
    await queryRunner.query(`DROP TABLE "blockTokenPrice"`);
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
          .join(", ")}`;
        await queryRunner.query(querySql, batchData.flat());
        tmpBatchData.length = 0;
      }
    }
  }
}
