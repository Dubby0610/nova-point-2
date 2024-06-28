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

  @Cron("0 2,10,18 * * *")
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
          this.logger.log(`Command successfully: ${command}!`);
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
    this.logger.log(`Start process ${dir} tvl data`)
    const currentBlock = { number: 3189935, timestamp: Math.floor(new Date().getTime() / 1000) };
    const record = new TvlProcessingStatus();
    record.projectName = dir;
    record.blockNumber = currentBlock.number
    const status = await this.tvlProcessingRepository.upsertStatus(record);
    if (!status.adapterProcessed) {
      await this.processTvlData(dir, record.blockNumber)
      await this.tvlProcessingRepository.upsertStatus({ ...record, adapterProcessed: true })
    }
  }

  private async processTvlData(dir: string, curBlockNumber: number) {
    const tvlCommand = `npm run adapter:tvl -- ${dir} ${this.tvlFilePrefix} ${curBlockNumber}`;
    await this.runCommand(tvlCommand, this.adaptersPath);
    await this.saveCSVDataToDb(`${this.tvlFilePrefix}.${curBlockNumber}.csv`, dir, curBlockNumber, this.insertTVLDataToDb.bind(this));
    this.logger.log(`finish processing ${dir} tvl data!`)
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
    await this.balanceOfLpRepository.addManyIgnoreConflicts(dataToInsert);
  }

  private async pipeTxData(dir: string) {
    if (!this.txPaths.includes(dir)) return
    // const currentBlock = await this.blockRepository.getLastBlock({
    //   select: { number: true, timestamp: true },
    // })
    try {
      const currentBlock = { number: 3189935, timestamp: Math.floor(new Date().getTime() / 1000) };
      const prevBlockNumberInCache = await this.cacheRepository.getValue(this.adapterTxSyncBlockNumber); // can be remove after re-deployment
      const processedStatus = await this.txProcessingRepository.findOneBy({ projectName: dir })

      if (!!processedStatus && processedStatus.adapterProcessed === true && processedStatus.pointProcessed === false) {
        return
      }
      this.logger.log(`Start process ${dir} tx data`)
      const record = new TxProcessingStatus();
      record.projectName = dir;
      record.blockNumberStart = !processedStatus ? Number(prevBlockNumberInCache) + 1 : processedStatus.blockNumberEnd + 1
      record.blockNumberEnd = currentBlock.number
      record.pointProcessed = false
      record.adapterProcessed = false
      const status = await this.txProcessingRepository.upsertStatus(record);
      if (!status.adapterProcessed) {
        await this.processTxData(dir, record.blockNumberStart, record.blockNumberEnd)
        await this.txProcessingRepository.upsertStatus({ ...record, adapterProcessed: true });
      }

    } catch (error) {
      this.logger.error(`processTxData error in ${dir}:`, error.stack);
    }
  }

  private async processTxData(dir: string, prevBlockNumber: number, curBlockNumber: number) {
    const txCommand = `npm run adapter:tx -- ${dir} ${this.txFilePrefix} ${prevBlockNumber} ${curBlockNumber}`;
    await this.runCommand(txCommand, this.adaptersPath);
    await this.saveCSVDataToDb(`${this.txFilePrefix}.${curBlockNumber}.csv`, dir, curBlockNumber, this.insertTXDataToDb.bind(this));
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
    await this.transactionDataOfPointsRepository.addManyIgnoreConflicts(dataToInsert);
  }
}
