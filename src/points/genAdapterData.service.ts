import { Injectable, Logger } from "@nestjs/common";
import { promises as promisesFs, existsSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";
import { TxProcessingRepository, TvlProcessingRepository, BalanceOfLpRepository, ProjectRepository, TxDataOfPointsRepository } from "../repositories";
import csv from "csv-parser";
import fs from "fs";
import { ConfigService } from "@nestjs/config";
import { Worker } from "src/common/worker";
import waitFor from "src/utils/waitFor";

const OTHER_CHAINS_ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
const NOVA_CHAIN_ETH_ADDRESS = "0x000000000000000000000000000000000000800a";

interface UserTVLData {
  userAddress: string;
  poolAddress: string;
  tokenAddress: string;
  blockNumber: string;
  balance: string;
  timestamp: string;
}

interface UserTransactionData {
  timestamp: string;
  userAddress: string;
  contractAddress: string;
  tokenAddress: string;
  decimals: string;
  price: string;
  quantity: string;
  txHash: string;
  nonce: string;
  blockNumber: string;
}

@Injectable()
export class GenAdapterDataService extends Worker {
  private readonly logger: Logger;
  private readonly adaptersPath = join(__dirname, "../../src/adapters");
  private readonly outputPath = "/data";
  private readonly tvlFilePrefix = 'tvl';
  private readonly txFilePrefix = 'tx';
  private readonly tvlPaths: string[]
  private readonly txPaths: string[]


  constructor(
    private readonly configService: ConfigService,
    private readonly projectRepository: ProjectRepository,
    private readonly transactionDataOfPointsRepository: TxDataOfPointsRepository,
    private readonly balanceOfLpRepository: BalanceOfLpRepository,
    private readonly tvlProcessingRepository: TvlProcessingRepository,
    private readonly txProcessingRepository: TxProcessingRepository
  ) {
    super()
    this.logger = new Logger(GenAdapterDataService.name);
    this.tvlPaths = Object.keys(this.configService.get('projectTokenBooster'))
    this.txPaths = Object.keys(this.configService.get('projectTxBooster')).flatMap(key => Object.keys(this.configService.get('projectTxBooster')[key]));
  }

  protected async runProcess(): Promise<void> {
    try {
      this.logger.log(`${GenAdapterDataService.name} initialized`);
      const dirs = await this.getAllDirectories();
      await Promise.all(dirs.map(async (dir) => {
        await this.initDirectory(dir);
        await Promise.all([this.pipeTvlData(dir), this.pipeTxData(dir)])
      }));

      await waitFor(() => !this.currentProcessPromise, 10000, 10000);
      if (!this.currentProcessPromise) {
        return;
      }
      return this.runProcess();
    } catch (error) {
      this.logger.error(`Error in runProcess ${error.stack}`)
    }
  }

  private async getAllDirectories(): Promise<string[]> {
    const files = await promisesFs.readdir(this.adaptersPath);
    return files.filter(dir => dir !== 'example');
  }

  private async initDirectory(dir: string): Promise<void> {
    this.logger.log(`initDirectory start ${dir}`);
    await this.runCommand(`npm i && npm run compile`, join(this.adaptersPath, dir, 'execution'));
    this.logger.log(`initDirectory finished ${dir}`);
  }

  private async runCommand(command: string, cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, { cwd, shell: true });

      let stderr = '';

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.logger.log(`Command successfully: ${command}!`);
          resolve();
        } else {
          const error = new Error(`Command failed: ${command} ${stderr}`);
          reject(error);
        }
      });
    });
  }

  private async genCSVDataToDb<T>(projectName: string, filePrefix: string, blockNumber: number): Promise<T[]> {
    const fileName = `${filePrefix}.${blockNumber}.csv`;
    return new Promise((resolve, reject) => {
      const outputPath = join(this.adaptersPath, projectName, this.outputPath, fileName);
      if (!existsSync(outputPath)) {
        this.logger.error(`${fileName} file not found`);
        resolve([])
        return;
      }

      const results: T[] = [];
      fs.createReadStream(outputPath)
        .pipe(csv())
        .on("data", (row) => results.push(row))
        .on("end", async () => {
          if (results.length > 0) {
            resolve(results);
          }
          try {
            this.logger.log(`Adapter:${projectName} ${fileName} successfully processed at ${blockNumber}, inserted ${results.length} rows into db.`);
            await fs.unlinkSync(outputPath);
          } catch (error) {
            reject(error)
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    })
  }

  private async pipeTvlData(dir: string) {
    if (!this.tvlPaths.includes(dir)) return

    this.logger.log(`Start process ${dir} tvl data`)
    const pendingProcess = await this.tvlProcessingRepository.find({ where: { adapterProcessed: false, projectName: dir } });
    await Promise.all(pendingProcess.map(async status => {
      await this.processTvlData(dir, status.blockNumber)
      await this.tvlProcessingRepository.upsertStatus({ ...status, adapterProcessed: true })
    }))
    this.logger.log(`End process ${dir} tvl data`)
  }

  private async processTvlData(dir: string, curBlockNumber: number) {
    const tvlCommand = `npm run adapter:tvl -- ${dir} ${this.tvlFilePrefix} ${curBlockNumber}`;
    await this.runCommand(tvlCommand, this.adaptersPath);
    const csvData = await this.genCSVDataToDb<UserTVLData>(dir, this.txFilePrefix, curBlockNumber);
    const insertedData = await this.insertTVLDataToDb(csvData)
    await this.updateTvlProjects(insertedData, dir)
    this.logger.log(`Finish processing ${dir} tvl data at ${curBlockNumber}!`)
  }

  private async insertTVLDataToDb(rows: UserTVLData[]) {
    const dataToInsert = rows.map((row) => {
      return {
        address: row.userAddress,
        tokenAddress: this.mapETHTokenAddress(row.tokenAddress),
        pairAddress: row.poolAddress,
        blockNumber: Number(row.blockNumber),
        balance: row.balance,
      };
    });

    await this.balanceOfLpRepository.addManyIgnoreConflicts(dataToInsert);
    return dataToInsert;
  }

  private async pipeTxData(dir: string) {
    if (!this.txPaths.includes(dir)) return

    this.logger.log(`Start process ${dir} tx data`)
    const pendingProcess = await this.txProcessingRepository.find({ where: { adapterProcessed: false, projectName: dir } });
    await Promise.all(pendingProcess.map(async status => {
      await this.processTxData(dir, status.blockNumberStart, status.blockNumberEnd)
      await this.txProcessingRepository.upsertStatus({ ...status, adapterProcessed: true })
    }))
    this.logger.log(`End process ${dir} tx data`)
  }

  private async processTxData(dir: string, prevBlockNumber: number, curBlockNumber: number) {
    const txCommand = `npm run adapter:tx -- ${dir} ${this.txFilePrefix} ${prevBlockNumber} ${curBlockNumber}`;
    await this.runCommand(txCommand, this.adaptersPath);
    const csvData = await this.genCSVDataToDb<UserTransactionData>(dir, this.txFilePrefix, curBlockNumber);
    const insertedData = await this.insertTXDataToDb(csvData)
    await this.updateTxProjects(insertedData, dir)
    this.logger.log(`Finish processing ${dir} tx data from ${prevBlockNumber} to ${curBlockNumber}!`)
  }

  private async insertTXDataToDb(rows: UserTransactionData[]) {
    const dataToInsert = rows.map((row) => {
      return {
        timestamp: new Date(Number(row.timestamp) * 1000),
        userAddress: row.userAddress,
        contractAddress: row.contractAddress,
        tokenAddress: this.mapETHTokenAddress(row.tokenAddress),
        decimals: Number(row.decimals),
        price: row.price,
        quantity: row.quantity,
        txHash: row.txHash,
        nonce: row.nonce,
        blockNumber: Number(row.blockNumber),
      };
    });
    await this.transactionDataOfPointsRepository.addManyIgnoreConflicts(dataToInsert);

    return dataToInsert
  }

  private mapETHTokenAddress = (tokenAddress: string) => {
    return tokenAddress === OTHER_CHAINS_ETH_ADDRESS ? NOVA_CHAIN_ETH_ADDRESS : tokenAddress
  }

  private updateTvlProjects = async (rows: Awaited<ReturnType<typeof this.insertTVLDataToDb>>, projectName: string) => {
    const pairAddresses = rows.map(i => i.pairAddress);
    const uniquePairAddresses = [...new Set(pairAddresses)]
    await this.projectRepository.addManyIgnoreConflicts(uniquePairAddresses.map(item => ({ pairAddress: item, dir: projectName })))
  }

  private updateTxProjects = async (rows: Awaited<ReturnType<typeof this.insertTXDataToDb>>, projectName: string) => {
    const pairAddresses = rows.map(i => i.contractAddress);
    const uniquePairAddresses = pairAddresses
    await this.projectRepository.addManyIgnoreConflicts(uniquePairAddresses.map(item => ({ pairAddress: item, dir: projectName })))
  }
}
