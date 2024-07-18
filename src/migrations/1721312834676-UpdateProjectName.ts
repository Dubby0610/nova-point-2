import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateProjectName1721312834676 implements MigrationInterface {
    name = 'UpdateProjectName1721312834676'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const pools = [
            '65a3Fe89c6455446450DD859ddde0F78e28Ba830',
            'E3D9E69a34b098a03138ad79752B2b3766327d8c',
            '9af9C294Da04c4d4D74D0b3eBF6047C628E179A3',
            'b606aD7805619A23A7Ba730fA138e767AD68DB2c',
            '7b1903e1c361ED6c5aD33f889a93b755319b64f3',
            'a3938c2922E928e8AFB013FfB7C80Df7DdE93fA0',
            '75F547aE1378Afee3bd56A8C3AeA381bAc4BEc5a',
            '4D97766E8a62972E7Cc735BAa573B9E823637F65',
            '883E6F8772639362C819A0668B525FDfC71D5598',
            '8a2A706eE457878097e9342A212f3D9945c61023',
            'c1C2144AAdc481b5E138404E3378cB8cE8A3e961',
            'e5E56cC658159Cce9AC859159d236657881C8baf',
            '8644415CD5029560e865eedf9cbCE080FFF41A1e',
            'e9805a7aBC550B0aA92b0a37f6Aa63e29dd05a47',
            '87eB17d50c2d7ce3Ee4343027309D7025EFa2d6B',
            'd823f4D7BC6a2f5E95F27D29dC022A3FE0538C70',
            'BaA7426bff7f68a218a8BFAa9d3fD22DD66E16BC',
            'd6c2EE2AF8ddc3Cce14D2969fd2777731e02D219',
            'bC8b9E93D11106291Bc0B2a6b476E4B1525D251A',
            '02df80fC705D3E740EdEF000C59954ecb5B62Dc8',
            'ee4d7caA9E7d4fe8350E9B534a145DA754E6018E',
            '0bc8678D5F909626d3D3Ed990d10c5AA641D88b8'
        ];

        const formattedPools = pools.map(pool => `decode('${pool}', 'hex')`).join(', ');

        await queryRunner.query(`
            UPDATE "project"
            SET name = 'novaswap'
            WHERE "pairAddress" IN (${formattedPools});
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

    }

}
