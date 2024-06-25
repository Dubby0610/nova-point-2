import { Injectable, Logger } from "@nestjs/common";
import { promises as promisesFs, existsSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";
import { TxProcessingRepository, TvlProcessingRepository, BalanceOfLpRepository, BlockRepository, CacheRepository, ProjectRepository, TxDataOfPointsRepository } from "../repositories";
import csv from "csv-parser";
import fs from "fs";
import { Cron } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { TxProcessingStatus, TvlProcessingStatus } from "src/entities";

const OTHER_CHAINS_ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
const NOVA_CHAIN_ETH_ADDRESS = "0x000000000000000000000000000000000000800a";

@Injectable()
export class AdapterService {
  private readonly logger: Logger;
  private readonly adaptersPath = join(__dirname, "../../src/adapters");
  private readonly outputFileName = "/data";
  private readonly adapterTxSyncBlockNumber = 'transactionDataBlockNumber';
  private readonly tvlFilePrefix = 'tvl';
  private readonly txFilePrefix = 'tx';
  private readonly tvlPaths: string[]
  private readonly txPaths: string[]


  constructor(
    private readonly configService: ConfigService,
    private readonly cacheRepository: CacheRepository,
    private readonly blockRepository: BlockRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly transactionDataOfPointsRepository: TxDataOfPointsRepository,
    private readonly balanceOfLpRepository: BalanceOfLpRepository,
    private readonly tvlProcessingRepository: TvlProcessingRepository,
    private readonly txProcessingRepository: TxProcessingRepository
  ) {
    this.logger = new Logger(AdapterService.name);
    this.tvlPaths = Object.keys(this.configService.get('projectTokenBooster'))
    this.txPaths = Object.keys(this.configService.get('projectTxBooster')).flatMap(key => Object.keys(this.configService.get('projectTxBooster')[key]));
  }

  @Cron("20 1,9,17 * * *")
  public async runProcess(): Promise<void> {
    this.logger.log(`${AdapterService.name} initialized`);
    try {
      const dirs = await this.getAllDirectories();
      await Promise.all(dirs.map((dir) => {
        this.processDirectory(dir)
      }));
    } catch (error) {
      this.logger.error("Failed to initialize or process tasks", error.stack);
    }
  }

  private async getAllDirectories(): Promise<string[]> {
    const files = await promisesFs.readdir(this.adaptersPath, { withFileTypes: true });
    return files.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);
  }

  // public async compensatePointsData(name: string, curBlockNumber: number, lastBlockNumber: number) {
  //   await this.processDirectory(name);
  //   this.logger.log(`compensatePointsData ${name} at block ${curBlockNumber}`)
  // }

  private async processDirectory(dir: string): Promise<void> {
    await this.initDirectory(dir);
    await Promise.all([this.pipeTvlData(dir), this.pipeTxData(dir)])
  }

  private async initDirectory(dir: string): Promise<void> {
    try {
      this.logger.log(`initDirectory start ${dir}`);
      await this.runCommand(`npm i && npm run compile`, join(this.adaptersPath, dir, 'execution'));
      this.logger.log(`initDirectory finished ${dir}`);
    } catch (error) {
      this.logger.error(`initDirectory error ${error.stack}`)
    }
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
          resolve();
        } else {
          const error = new Error(`Command failed: ${command}\n${stderr}`);
          this.logger.error(error.message);
          reject(error);
        }
      });
    });
  }

  private async saveCSVDataToDb(fileName: string, dir: string, blockNumber: number, insertFunction: (rows: any[], dir: string) => Promise<void>): Promise<void> {
    return new Promise(resolve => {
      const outputPath = join(this.adaptersPath, dir, this.outputFileName, fileName);
      if (!existsSync(outputPath)) {
        this.logger.error(`${fileName} file not found`);
        resolve()
        return;
      }

      const results = [];
      fs.createReadStream(outputPath)
        .pipe(csv())
        .on("data", (row) => results.push(row))
        .on("end", async () => {
          if (results.length > 0) {
            await insertFunction(results, dir);
          }
          fs.unlinkSync(outputPath);
          this.logger.log(`Adapter:${dir} ${fileName} successfully processed at ${blockNumber}, inserted ${results.length} rows into db.`);
          resolve()
        });
    })
  }

  private async pipeTvlData(dir: string) {
    if (!this.tvlPaths.includes(dir)) {
      return
    }
    // const currentBlock = await this.blockRepository.getLastBlock({
    //   select: { number: true, timestamp: true },
    // }) 
    const currentBlock = { number: 2999935, timestamp: Math.floor(new Date().getTime() / 1000) };
    const processingStatus = new TvlProcessingStatus();
    processingStatus.adapterName = dir;
    processingStatus.blockNumber = currentBlock.number
    await this.tvlProcessingRepository.add(processingStatus);
    await this.processTvlData(dir, processingStatus.blockNumber)
  }

  private async processTvlData(dir: string, curBlockNumber: number) {
    try {
      const tvlCommand = `npm run adapter:tvl -- ${dir} ${this.tvlFilePrefix} ${curBlockNumber}`;
      await this.runCommand(tvlCommand, this.adaptersPath);
      this.logger.log(`Execute ${dir} tvl file succeeded`);
      await this.saveCSVDataToDb(`${this.tvlFilePrefix}.${curBlockNumber}.csv`, dir, curBlockNumber, this.insertTVLDataToDb.bind(this));
      await this.tvlProcessingRepository.updateTxStatus(dir, { adapterProcessed: true })
    } catch (error) {
      this.logger.error(`processTvlData error in ${dir}:`, error.stack);
    }
  }

  private async insertTVLDataToDb(rows: any[], dir: string): Promise<void> {
    const poolAddresses: string[] = [];
    const dataToInsert = rows.map((row) => {
      if (!poolAddresses.includes(row.poolAddress)) {
        poolAddresses.push(row.poolAddress);
      }
      let tokenAddress = row.tokenAddress;
      if (row.tokenAddress === OTHER_CHAINS_ETH_ADDRESS) {
        tokenAddress = NOVA_CHAIN_ETH_ADDRESS;
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
      await this.projectRepository.upsert({ pairAddress: poolAddress, name: dir }, true, ["pairAddress"]);
    }
    try {
      await this.balanceOfLpRepository.addManyIgnoreConflicts(dataToInsert);
    } catch (e) {
      this.logger.error(`Error inserting ${rows.length} TVL data to db: ${e.stack}`);
    }
  }

  private async pipeTxData(dir: string) {
    if (!this.txPaths.includes(dir)) return
    // const currentBlock = await this.blockRepository.getLastBlock({
    //   select: { number: true, timestamp: true },
    // })
    const currentBlock = { number: 2999935, timestamp: Math.floor(new Date().getTime() / 1000) };
    const prevBlockNumberInCache = await this.cacheRepository.getValue(this.adapterTxSyncBlockNumber) ?? '0'; // can be remove after re-deployment
    const processedStatus = await this.txProcessingRepository.findOneBy({ adapterName: dir })

    if (!!processedStatus && processedStatus.pointProcessed === false) {
      return
    }
    const record = new TxProcessingStatus();
    record.blockNumberStart = !processedStatus ? Number(prevBlockNumberInCache) : processedStatus.blockNumberEnd
    record.blockNumberEnd = currentBlock.number
    record.pointProcessed = false
    record.adapterProcessed = false
    await this.txProcessingRepository.updateTxStatus(dir, record);
    await this.processTxData(dir, record.blockNumberStart, record.blockNumberEnd)
  }

  private async processTxData(dir: string, prevBlockNumber: number, curBlockNumber: number) {
    try {
      const txCommand = `npm run adapter:tx -- ${dir} ${this.txFilePrefix} ${prevBlockNumber} ${curBlockNumber}`;
      await this.runCommand(txCommand, this.adaptersPath);
      this.logger.log(`Execute ${dir} tx file succeeded`);
      await this.saveCSVDataToDb(`${this.txFilePrefix}.${curBlockNumber}.csv`, dir, curBlockNumber, this.insertTXDataToDb.bind(this));
      await this.txProcessingRepository.updateTxStatus(dir, { adapterProcessed: true })
    } catch (error) {
      this.logger.error(`processTxData error in ${dir}:`, error.stack);
    }
  }



  private async insertTXDataToDb(rows: any[], dir: string): Promise<void> {
    const poolAddresses: string[] = [];
    const dataToInsert = rows.map((row) => {
      if (!poolAddresses.includes(row.contractAddress)) {
        poolAddresses.push(row.contractAddress);
      }
      let tokenAddress = row.tokenAddress;
      if (row.tokenAddress === OTHER_CHAINS_ETH_ADDRESS) {
        tokenAddress = NOVA_CHAIN_ETH_ADDRESS;
      }
      return {
        timestamp: new Date(row.timestamp * 1000),
        userAddress: row.userAddress,
        contractAddress: row.contractAddress,
        tokenAddress: tokenAddress,
        decimals: row.decimals,
        price: row.price,
        quantity: row.quantity,
        txHash: row.txHash,
        nonce: row.nonce,
        blockNumber: row.blockNumber,
      };
    });
    for (const poolAddress of poolAddresses) {
      await this.projectRepository.upsert({ pairAddress: poolAddress, name: dir }, true, ["pairAddress"]);
    }
    try {
      await this.transactionDataOfPointsRepository.addManyIgnoreConflicts(dataToInsert);
    } catch (e) {
      this.logger.error(`Error inserting ${rows.length} tx data to db: ${e.stack}`);
    }
  }
}
