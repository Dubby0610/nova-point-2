import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import waitFor from "../utils/waitFor";
import { ConfigService } from "@nestjs/config";
import { promises as promisesFs, appendFileSync, existsSync } from "fs";
import { join } from "path";
import { exec } from "child_process";
import { BalanceOfLpRepository, BlockRepository, CacheRepository, ProjectRepository, TxDataOfPointsRepository } from "src/repositories";
import * as csv from "csv-parser";
import * as fs from "fs";
import { Cron } from '@nestjs/schedule';

const OTHER_CHAINS_ETHADDRESS = "0x0000000000000000000000000000000000000000";
const NOVA_CHAIN_ETHADDRESS = "0x000000000000000000000000000000000000800a";
@Injectable()
export class AdapterService extends Worker {
  private readonly logger: Logger;
  private readonly outputFileName = "/data/";
  private readonly logFilePath = join(__dirname, "../../src/adapters/processLogs.log");
  private readonly adaptersPath = join(__dirname, "../../src/adapters");
  private readonly adapterTxSyncBlockNumber = 'transactionDataBlockNumber'

  public constructor(
    private readonly configService: ConfigService,
    private readonly balanceOfLpRepository: BalanceOfLpRepository,
    private readonly blockRepository: BlockRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly cacheRepository: CacheRepository,
    private readonly transactionDataOfPoints: TxDataOfPointsRepository
  ) {
    super();
    this.logger = new Logger(AdapterService.name);
  }

  @Cron('20 1,9,17 * * *')
  protected async runProcess(): Promise<void> {
    this.logger.log(`${AdapterService.name} initialized`);
    try {
      await this.loadLastBlockNumber();
    } catch (error) {
      this.logger.error("Failed to adapter balance", error.stack);
    }

    // const adapterInterval = this.configService.get<number>("adapterInterval");
    // await waitFor(() => !this.currentProcessPromise, adapterInterval * 1000, adapterInterval * 1000);
    // if (!this.currentProcessPromise) {
    //   return;
    // }
    // return this.runProcess();
  }

  public async loadLastBlockNumber() {
    const lastBlock = await this.blockRepository.getLastBlock({
      select: { number: true, timestamp: true },
    });
    const lastBalanceOfLp = await this.balanceOfLpRepository.getLastOrderByBlock();
    if (lastBalanceOfLp && lastBlock.number <= lastBalanceOfLp.blockNumber) {
      this.logger.log(
        `Had adapted balance, Last block number: ${lastBlock.number}, Last balance of lp block number: ${lastBalanceOfLp.blockNumber}`
      );
      return;
    }
    const adapterTxSyncBlockNumber = await this.cacheRepository.getValue(this.adapterTxSyncBlockNumber) ?? 0;
    await this.runCommandsInAllDirectories(lastBlock.number, Number(adapterTxSyncBlockNumber));
  }

  public async runCommandsInAllDirectories(curBlockNumber: number, lastBlockNumber: number,): Promise<void> {
    this.logger.log(
      `Executing commands in all directories, curBlockNumber: ${curBlockNumber}, lastBlockNumber: ${lastBlockNumber}`
    );
    try {
      const files = await promisesFs.readdir(this.adaptersPath, { withFileTypes: true });
      const dirs = files.filter((dirent) => dirent.isDirectory() && !['node_modules', 'example'].includes(dirent.name)).map((dirent) => dirent.name);
      for (const dir of dirs) {
        await this.executeCommandInDirectory(dir, curBlockNumber, lastBlockNumber);
      }
      this.cacheRepository.setValue(this.adapterTxSyncBlockNumber, curBlockNumber.toString())
      this.logger.log(`All commands executed, project count : ${dirs.length}.`);
    } catch (error) {
      this.logger.error("Failed to read directories:", error.stack);
    }
  }

  private async executeCommandInDirectory(dir: string, curBlockNumber: number, lastBlockNumber: number): Promise<void> {
    // Check if the provided folder contains index.ts file
    const indexPath = join(this.adaptersPath, dir, "execution/dist/index.js");
    if (!existsSync(indexPath)) {
      this.logger.log(`Folder '${dir}' does not contain index.ts file.`);
    }

    await this.execCommand(`npm i && npm run compile `, join(this.adaptersPath, dir, 'execution'))
    this.logger.log(`Folder '${dir}' init successfully`);
    const command = `node runScript.js ${dir} ${curBlockNumber} ${lastBlockNumber}`;
    const nowT = new Date();
    nowT.setHours(nowT.getHours() + 8);
    const now = nowT.toISOString().replace("T", " ").slice(0, 19);
    try {
      const { stdout, stderr } = await this.execCommand(command, this.adaptersPath);
      appendFileSync(this.logFilePath, `${now}\nAdapter: ${dir}\n${stdout}\n${stderr}`);
      this.logger.log(`Execute succeed : ${command}`);
      // read output.csv file and save data to db
      await this.saveTVLDataToDb(dir, curBlockNumber);
      await this.saveTXDataToDb(dir, curBlockNumber)
    } catch (error) {
      appendFileSync(this.logFilePath, `${now}\nAdapter:${dir}\nError executing command: ${error.stack}`);
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
    // read output.csv file and save data to db
    const outputPath = join(this.adaptersPath, dir, this.outputFileName + `tvl.${blockNumber}.csv`);
    const nowT = new Date();
    nowT.setHours(nowT.getHours() + 8);
    const now = nowT.toISOString().replace("T", " ").slice(0, 19);
    if (!existsSync(outputPath)) {
      this.logger.error(`Folder '${dir}' does not contain tvl.${blockNumber}.csv file.`);
      appendFileSync(this.logFilePath, `${now}\nAdapter:${dir}\nDoes not contain tvl.csv file.`);
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
        // fs.unlinkSync(outputPath);
        this.logger.log(
          `Adapter:${dir}\tCSV file successfully processed, ${results.length} rows inserted into db.`
        );
      });
  }

  // insert into db
  private async insertTVLDataToDb(rows, dir: string) {
    let poolAddresses: string[] = [];
    const dataToInsert = rows.map((row) => {
      if (!poolAddresses.includes(row.poolAddress)) {
        poolAddresses.push(row.poolAddress);
      }
      let tokenAddress = row.tokenAddress;
      if (row.tokenAddress == OTHER_CHAINS_ETHADDRESS) {
        tokenAddress = NOVA_CHAIN_ETHADDRESS;
      }
      return {
        address: row.userAddress,
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
      await this.balanceOfLpRepository.addManyIgnoreConflicts(dataToInsert);
    } catch (e) {
      this.logger.error(`Error inserting ${rows.length} data to db: ${e.stack}`);
    }
  }

  private async saveTXDataToDb(dir: string, blockNumber: number): Promise<void> {
    // read output.csv file and save data to db
    const outputPath = join(this.adaptersPath, dir, this.outputFileName + `tx.${blockNumber}.csv`);
    const nowT = new Date();
    nowT.setHours(nowT.getHours() + 8);
    const now = nowT.toISOString().replace("T", " ").slice(0, 19);
    if (!existsSync(outputPath)) {
      this.logger.error(`Folder '${dir}' does not contain tx.${blockNumber}.csv file.`);
      appendFileSync(this.logFilePath, `${now}\nAdapter:${dir}\nDoes not contain tx.csv file.`);
      return;
    }

    const results = [];
    fs.createReadStream(outputPath)
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", async () => {
        await this.insertTXDataToDb(results, dir);
        fs.unlinkSync(outputPath);
        this.logger.log(
          `Adapter:${dir}\tCSV file successfully processed, ${results.length} rows inserted into db.`
        );
      });
  }

  // insert into db
  private async insertTXDataToDb(rows, dir: string) {
    let poolAddresses: string[] = [];
    const dataToInsert = rows.map((row) => {
      if (!poolAddresses.includes(row.contractAddress)) {
        poolAddresses.push(row.contractAddress);
      }
      let tokenAddress = row.tokenAddress;
      if (row.tokenAddress == OTHER_CHAINS_ETHADDRESS) {
        tokenAddress = NOVA_CHAIN_ETHADDRESS;
      }
      return {
        timestamp: row.timestamp,
        userAddress: row.userAddress,
        contractAddress: row.contractAddress,
        tokenAddress: tokenAddress,
        decimals: row.decimals,
        price: row.price,
        quantity: row.quantity,
        txHash: row.txHash,
        nonce: row.nonce,
        blockNumber: row.blockNumber
      };
    });
    for (const poolAddress of poolAddresses) {
      this.projectRepository.upsert({ pairAddress: poolAddress, name: dir }, true, ["pairAddress"]);
    }
    try {
      await this.transactionDataOfPoints.addManyIgnoreConflicts(dataToInsert);
    } catch (e) {
      this.logger.error(`Error inserting ${rows.length} data to db: ${e.stack}`);
    }
  }
}
