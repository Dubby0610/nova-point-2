import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import { promises as promisesFs, existsSync } from "fs";
import { join } from "path";
import { exec } from "child_process";
import { BlockRepository, CacheRepository, RedistributeBalanceRepository, ProjectRepository } from "../repositories";
import * as csv from "csv-parser";
import * as fs from "fs";
import { Cron } from "@nestjs/schedule";
import { getAddress } from "ethers/lib/utils";

const OTHER_CHAINS_ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
const NOVA_CHAIN_ETH_ADDRESS = "0x000000000000000000000000000000000000800a";
const TOKEN_ADDRESS_WHITELIST = [
  "0x1B49eCf1A8323Db4abf48b2F5EFaA33F7DdAB3FC", // pufEth.eth
  '0x3FDB1939daB8e2d4F7a04212F142469Cd52d6402', // ezETH.arb
  '0xdA7Fa837112511F6E353091D7e388A4c45Ce7D6C', // ezETH,eth
  '0x8FEe71Ab3Ffd6F8Aec8Cd2707Da20f4Da2bf583D', // ezETH.linea
  '0x8eDFa0151dF300C2b14bba9dA9f07A805565009d', // ezETH.blast
  '0x186c0c42C617f1Ce65C4f7DF31842eD7C5fD8260', // rsETH.eth
  "0x4A2da287deB06163fB4D77c52901683d69bD06f4", // rsETH.arb
]
const DIRS = ['agx']

@Injectable()
export class RedistributeBalanceService extends Worker {
  private readonly logger: Logger;
  private readonly outputFileName = "/data/";
  private readonly adaptersPath = join(__dirname, "../../src/adapters");
  private readonly adapterTxSyncBlockNumber = 'transactionDataBlockNumber'

  public constructor(
    private readonly redistributeBalanceRepository: RedistributeBalanceRepository,
    private readonly blockRepository: BlockRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly cacheRepository: CacheRepository,
  ) {
    super();
    this.logger = new Logger(RedistributeBalanceService.name);
  }

  @Cron("0 0 * * * *")
  protected async runProcess(): Promise<void> {
    this.logger.log(`${RedistributeBalanceService.name} initialized`);
    try {
      await this.loadLastBlockNumber();
    } catch (error) {
      this.logger.error("Failed to adapter balance", error.stack);
    }
  }

  public async compensatePointsData(name: string, curBlockNumber: number, lastBlockNumber: number) {
    await this.executeCommandInDirectory(name, curBlockNumber, lastBlockNumber);
    this.logger.log(`compensateRedistributeData ${name} at block ${curBlockNumber}`)
  }

  public async loadLastBlockNumber(curBlockNumber?: number, lastBlockNumber?: number) {
    if (lastBlockNumber && curBlockNumber) {
      await this.runCommandsInAllDirectories(curBlockNumber, lastBlockNumber);
    } else {
      const currentBlock = await this.blockRepository.getLastBlock({
        select: { number: true, timestamp: true },
      })
      const adapterTxSyncBlockNumber = await this.cacheRepository.getValue(this.adapterTxSyncBlockNumber) ?? 0;
      this.logger.log(`Adapter start from ${currentBlock.number} to ${adapterTxSyncBlockNumber}`)
      await this.runCommandsInAllDirectories(currentBlock.number, Number(adapterTxSyncBlockNumber));
      this.cacheRepository.setValue(this.adapterTxSyncBlockNumber, currentBlock.number.toString())
      this.logger.log(`Adapter end from ${currentBlock.number} to ${adapterTxSyncBlockNumber}`)
    }

  }

  public async runCommandsInAllDirectories(curBlockNumber: number, lastBlockNumber: number,): Promise<void> {
    this.logger.log(
      `Executing commands in all directories, curBlockNumber: ${curBlockNumber}, lastBlockNumber: ${lastBlockNumber}`
    );
    try {
      for (const dir of DIRS) {
        await this.executeCommandInDirectory(dir, curBlockNumber, lastBlockNumber);
      }
      this.logger.log(`All commands executed from ${curBlockNumber} to ${lastBlockNumber} , project count : ${DIRS.length}.`);
    } catch (error) {
      this.logger.error("Failed to read directories:", error.stack);
    }
  }

  private async executeCommandInDirectory(dir: string, curBlockNumber: number, lastBlockNumber: number): Promise<void> {
    await this.execCommand(`npm i && npm run compile `, join(this.adaptersPath, dir, 'execution'))
    this.logger.log(`Folder '${dir}' init successfully`);
    const command = `node genHourlyData.js ${dir} ${curBlockNumber} ${lastBlockNumber}`;

    try {
      await this.execCommand(command, this.adaptersPath);
      this.logger.log(`Execute succeed : ${command}`);
      // read output.csv file and save data to db
      await this.saveTVLDataToDb(dir, curBlockNumber);
    } catch (error) {
      this.logger.error(`Error executing command in ${dir}: `, error.stack);
    }
  }

  private execCommand(command: string, cwd: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      exec(command, { cwd }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  // read output.csv file and save data to db
  private async saveTVLDataToDb(dir: string, blockNumber: number): Promise<void> {
    return new Promise((resolve) => {
      // read output.csv file and save data to db
      const outputPath = join(this.adaptersPath, dir, this.outputFileName + `hourly.${blockNumber}.csv`);
      if (!existsSync(outputPath)) {
        this.logger.warn(`Folder '${dir}' does not contain hourly.${blockNumber}.csv file.`);
        resolve()
        return;
      }

      const results = [];
      fs.createReadStream(outputPath)
        .pipe(csv())
        .on("data", (row) => results.push(row))
        .on("end", async () => {
          if (results.length > 0) {
            await this.insertTVLDataToDb(results, dir);
          }
          fs.unlinkSync(outputPath);
          this.logger.log(
            `Adapter:${dir} hourly CSV file successfully processed at ${blockNumber}, insert ${results.length} rows into db.`
          );
          resolve()
        });
    })
  }

  // insert into db
  private async insertTVLDataToDb(rows, dir: string) {
    let poolAddresses: string[] = [];
    const dataToInsert = rows.filter(row => TOKEN_ADDRESS_WHITELIST.includes(getAddress(row.tokenAddress))).
      map(row => {
        if (!poolAddresses.includes(row.poolAddress)) {
          poolAddresses.push(row.poolAddress);
        }
        let tokenAddress = row.tokenAddress;
        if (row.tokenAddress == OTHER_CHAINS_ETH_ADDRESS) {
          tokenAddress = NOVA_CHAIN_ETH_ADDRESS;
        }
        return {
          userAddress: row.userAddress,
          tokenAddress: tokenAddress,
          pairAddress: row.poolAddress,
          blockNumber: row.blockNumber,
          balance: row.balance,
        };
      });
    for (const poolAddress of poolAddresses) {
      this.projectRepository.upsert({ pairAddress: poolAddress, name: dir }, true, ["pairAddress"]);
    }
    try {
      await this.redistributeBalanceRepository.updateCumulativeData(dataToInsert);
    } catch (e) {
      this.logger.error(`Error inserting ${rows.length} hourly data to db: ${e.stack}`);
    }
  }
}
