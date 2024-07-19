import { MigrationInterface, QueryRunner } from "typeorm";
import { promises as promisesFs } from "fs";
import { join } from 'path'
import genConfig from '../config'

export class UpdateNovaswapTvlProcessingStatus1721354490856 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 7-11 18:00 3944080
        // 7-12 02:00 3958070
        // 7-12 10:00 3972076
        // 7-13 02:00 3999950
        // 7-13 10:00 4013650
        const blocks = [3944080, 3958070, 3972076, 3999950, 4013650]
        const adaptersPath = join(__dirname, "../../src/adapters");
        const files = await promisesFs.readdir(adaptersPath);
        const allFiles = files.filter(dir => dir !== 'example');
        const config = genConfig()
        const tvlPaths = Object.keys(config['projectTokenBooster'])

        await Promise.all(blocks.map(block => {
            return allFiles.map(async file => {
                if (!tvlPaths.includes(file)) return
                const projectName = file;
                const blockNumber = block;
                const adapterProcessed = false;
                const pointProcessed = false;
                return queryRunner.query(`
            INSERT INTO "tvlProcessingStatus" ("projectName", "blockNumber", "adapterProcessed", "pointProcessed")
            VALUES ($1, $2, $3, $4);
        `, [projectName, blockNumber, adapterProcessed, pointProcessed]);
            }).flat()
        }))

        await queryRunner.query(`
            UPDATE "tvlProcessingStatus"
            SET "adapterProcessed" = false, "pointProcessed" = false
            WHERE "blockNumber" >= 3986073;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
