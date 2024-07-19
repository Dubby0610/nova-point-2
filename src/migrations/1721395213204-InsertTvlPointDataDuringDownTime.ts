import { join } from "path";
import { promises as promisesFs } from "fs";
import { MigrationInterface, QueryRunner } from "typeorm";
import genConfig from '../config'

export class InsertTvlPointDataDuringDownTime1721395213204 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const blocks = [4215480]
        const adaptersPath = join(__dirname, "../adapters");
        const dirs = await promisesFs.readdir(adaptersPath);
        const allProjectNames = dirs.filter(dir => dir !== 'example');
        const config = genConfig()
        const tvlPaths = Object.keys(config['projectTokenBooster'])

        await Promise.all(blocks.map(block => {
            const sqlList = allProjectNames.map(async name => {
                if (!tvlPaths.includes(name)) return
                const projectName = name;
                const blockNumber = block;
                const adapterProcessed = false;
                const pointProcessed = false;
                return queryRunner.query(`
            INSERT INTO "tvlProcessingStatus" ("projectName", "blockNumber", "adapterProcessed", "pointProcessed")
            VALUES ($1, $2, $3, $4);
        `, [projectName, blockNumber, adapterProcessed, pointProcessed]);
            }).flat()

            return sqlList
        }))

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
