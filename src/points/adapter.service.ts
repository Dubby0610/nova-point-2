import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import waitFor from "../utils/waitFor";
import { ConfigService } from "@nestjs/config";
import { promises as promisesFs, appendFileSync, existsSync } from "fs";
import { join } from "path";
import { exec } from "child_process";
import { BalanceOfLpRepository, BlockRepository, ProjectRepository } from "src/repositories";
import * as csv from "csv-parser";
import * as fs from "fs";

@Injectable()
export class AdapterService extends Worker {
  private readonly logger: Logger;
  private readonly outputFileName = "/data/output";
  private readonly logFilePath = join(__dirname, "../../src/adapters/processLogs.log");
  private readonly adaptersPath = join(__dirname, "../../src/adapters");

  public constructor(
    private readonly configService: ConfigService,
    private readonly balanceOfLpRepository: BalanceOfLpRepository,
    private readonly blockRepository: BlockRepository,
    private readonly projectRepository: ProjectRepository
  ) {
    super();
    this.logger = new Logger(AdapterService.name);
  }

  protected async runProcess(): Promise<void> {
    this.logger.log(`${AdapterService.name} initialized`);

    try {
      await this.loadLastBlockNumber();
    } catch (error) {
      this.logger.error("Failed to adapter balance", error.stack);
    }

    const adapterInterval = this.configService.get<number>("adapterInterval");
    await waitFor(() => !this.currentProcessPromise, adapterInterval * 1000, adapterInterval * 1000);
    if (!this.currentProcessPromise) {
      return;
    }

    return this.runProcess();
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
    await this.runCommandsInAllDirectories(lastBlock.number, Number(lastBlock.timestamp.getTime() / 1000));
  }

  public async runCommandsInAllDirectories(blockNumber: number, blockTimestamp: number): Promise<void> {
    this.logger.log(
      `Executing commands in all directories, blockNumber: ${blockNumber}, blockTimestamp: ${blockTimestamp}`
    );
    try {
      const files = await promisesFs.readdir(this.adaptersPath, { withFileTypes: true });
      const dirs = files.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);
      for (const dir of dirs) {
        await this.executeCommandInDirectory(dir, blockNumber, blockTimestamp);
      }
      this.logger.log(`All commands executed, project count : ${dirs.length}.`);
    } catch (error) {
      this.logger.error("Failed to read directories:", error.stack);
    }
  }

  private async executeCommandInDirectory(dir: string, blockNumber: number, blockTimestamp: number): Promise<void> {
    // Check if the provided folder contains index.ts file
    const indexPath = join(this.adaptersPath, dir, "dist/index.js");
    if (!existsSync(indexPath)) {
      this.logger.error(`Folder '${dir}' does not contain index.ts file.`);
      return;
    }
    const command = `cd ${this.adaptersPath} && node runScript.js ${dir} ${blockNumber} ${blockTimestamp}`;
    const nowT = new Date();
    nowT.setHours(nowT.getHours() + 8);
    const now = nowT.toISOString().replace("T", " ").slice(0, 19);
    try {
      const { stdout, stderr } = await this.execCommand(command, join(this.adaptersPath, dir));
      appendFileSync(this.logFilePath, `${now}\nAdapter: ${dir}\n${stdout}\n${stderr}`);
      this.logger.log(`Execute successd : ${command}`);
      // read output.csv file and save data to db
      await this.saveDataToDb(dir, blockNumber);
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
  private async saveDataToDb(dir: string, blockNumber: number): Promise<void> {
    // read output.csv file and save data to db
    const outputPath = join(this.adaptersPath, dir, this.outputFileName + `.${blockNumber}.csv`);
    const nowT = new Date();
    nowT.setHours(nowT.getHours() + 8);
    const now = nowT.toISOString().replace("T", " ").slice(0, 19);
    if (!existsSync(outputPath)) {
      this.logger.error(`Folder '${dir}' does not contain output.${blockNumber}.csv file.`);
      appendFileSync(this.logFilePath, `${now}\nAdapter:${dir}\nDoes not contain output.csv file.`);
      return;
    }

    const results = [];
    fs.createReadStream(outputPath)
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", async () => {
        const rowsToInsert = [];
        let isFirstLine = true;
        for (const row of results) {
          if (isFirstLine) {
            isFirstLine = false;
          } else {
            rowsToInsert.push(row);
          }
        }
        if (rowsToInsert.length > 0) {
          await this.insertDataToDb(rowsToInsert, dir);
        }
        fs.unlinkSync(outputPath);
        this.logger.log(
          `Adapter:${dir}\tCSV file successfully processed, ${rowsToInsert.length} rows inserted into db.`
        );
      });
  }

  // insert into db
  private async insertDataToDb(rows, dir: string) {
    let pairAddresses: string[] = [];
    const dataToInsert = rows.map((row) => {
      if (!pairAddresses.includes(row.pairAddress)) {
        pairAddresses.push(row.pairAddress);
      }
      return {
        address: row.address,
        tokenAddress: row.tokenAddress,
        pairAddress: row.pairAddress,
        blockNumber: row.blockNumber,
        balance: row.balance,
      };
    });
    for (const pairAddress of pairAddresses) {
      this.projectRepository.upsert({ pairAddress, name: dir }, true, ["pairAddress"]);
    }
    try {
      await this.balanceOfLpRepository.addMany(dataToInsert);
    } catch (e) {
      this.logger.error(`Error inserting ${rows.length} data to db: ${e.stack}`);
    }
  }
}
