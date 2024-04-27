import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTableCache1714130217001 implements MigrationInterface {
  name = "CreateTableCache1714130217001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "cache" ("key" character varying(50) NOT NULL, "value" character varying(100) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5893dd931640dcef5cc364e2747" PRIMARY KEY ("key"))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "cache"`);
  }
}
