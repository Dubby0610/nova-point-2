import { join } from "path";
import { promises as promisesFs } from "fs";
import { MigrationInterface, QueryRunner } from "typeorm";
import genConfig from '../config'

export class InsertTvlPointDataDuringDownTime1722837985144 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const blocks = [4768643, 4770233, 4772060, 4774301, 4775922, 4778290, 4781008, 4783501]
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

