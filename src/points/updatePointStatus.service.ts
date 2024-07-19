import { Injectable, Logger } from "@nestjs/common";
import { promises as promisesFs } from "fs";
import { join } from "path";
import { TxProcessingRepository, TvlProcessingRepository, BlockRepository, CacheRepository } from "../repositories";
import { Cron } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { TxProcessingStatus, TvlProcessingStatus } from "src/entities";

@Injectable()
export class UpdatePointStatusService {
  private readonly logger: Logger;
  private readonly adaptersPath = join(__dirname, "../../src/adapters");
  private readonly adapterTxSyncBlockNumber = 'transactionDataBlockNumber';
  private readonly tvlPaths: string[]
  private readonly txPaths: string[]


  constructor(
    private readonly configService: ConfigService,
    private readonly cacheRepository: CacheRepository,
    private readonly blockRepository: BlockRepository,
    private readonly tvlProcessingRepository: TvlProcessingRepository,
    private readonly txProcessingRepository: TxProcessingRepository
  ) {
    this.logger = new Logger(UpdatePointStatusService.name);
    this.tvlPaths = Object.keys(this.configService.get('projectTokenBooster'))
    this.txPaths = Object.keys(this.configService.get('projectTxBooster')).flatMap(key => Object.keys(this.configService.get('projectTxBooster')[key]));
  }

  @Cron("0 2,10,18 * * *")
  public async runTask(): Promise<void> {
    try {
      this.logger.log(`${UpdatePointStatusService.name} initialized`);
      const dirs = await this.getAllDirectories();
      const currentBlock = await this.blockRepository.getLastBlock({
        select: { number: true },
      })
      await Promise.all(dirs.map(async (dir) => {
        this.updateTvlProcessStatus(dir, currentBlock.number)
        this.updateTxProcessStatus(dir, currentBlock.number)
      }));
    } catch (error) {
      this.logger.error(`Error in runTask ${error.stack}`)
    }
  }

  private async getAllDirectories(): Promise<string[]> {
    const files = await promisesFs.readdir(this.adaptersPath);
    return files.filter(dir => dir !== 'example');
  }

  private async updateTvlProcessStatus(projectName: string, blockNumber: number) {
    try {
      if (!this.tvlPaths.includes(projectName)) return
      const record = new TvlProcessingStatus();
      record.projectName = projectName;
      record.blockNumber = blockNumber;
      record.adapterProcessed = false;
      record.pointProcessed = false;
      await this.tvlProcessingRepository.upsertStatus(record);
      this.logger.log(`updateTvlProcessStatus at ${record.blockNumber}`)
    } catch (error) {
      throw new Error(`Error in updateTxProcessStatus at ${error.stack}`)
    }
  }

  private async updateTxProcessStatus(projectName: string, blockNumberEnd: number) {
    try {
      if (!this.txPaths.includes(projectName)) return
      const prevBlockNumberInCache = await this.cacheRepository.getValue(this.adapterTxSyncBlockNumber);
      const processedStatus = await this.txProcessingRepository.findOneBy({ projectName })
      const record = new TxProcessingStatus();
      record.projectName = projectName;
      record.blockNumberStart = processedStatus ? processedStatus.blockNumberEnd + 1 : Number(prevBlockNumberInCache) + 1
      record.blockNumberEnd = blockNumberEnd
      record.adapterProcessed = false;
      record.pointProcessed = false;
      await this.txProcessingRepository.upsertStatus(record);
      this.logger.log(`updateTxProcessStatus from ${record.blockNumberStart} to ${record.blockNumberEnd}`)
    } catch (error) {
      throw new Error(`Error in updateTxProcessStatus at ${error.stack}`)
    }
  }

}
