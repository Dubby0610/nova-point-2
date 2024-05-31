import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { BLOCKS_REVERT_DETECTED_EVENT } from "./constants";
import { BridgePointService } from "./points/bridgePoint.service";

import { BridgeActiveService } from "./points/bridgeActive.service";
import { AdapterService } from "./points/adapter.service";
import { TvlPointService } from "./points/tvlPoint.service";
import { TxVolPointService } from "./points/txVolPoint.service";
import { TxNumPointService } from "./points/txNumPoint.service";

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger;

  public constructor(
    private readonly bridgePointService: BridgePointService,

    private readonly bridgeActiveService: BridgeActiveService,
    private readonly configService: ConfigService,
    private readonly adapterService: AdapterService,
    private readonly tvlPointService: TvlPointService,
    private readonly txVolPointService: TxVolPointService,
    private readonly txNumPointService: TxNumPointService,
  ) {
    this.logger = new Logger(AppService.name);
  }

  public async onModuleInit() {
    // example:
    // await this.adapterService.loadLastBlockNumber(1476336, 1376336);
    // second params is utc+8
    // await this.tvlPointService.handleHoldPoint(1395273, new Date(1715159940 * 1000).toISOString());
    this.compensatePoints()


    this.startWorkers();
  }

  public onModuleDestroy() {
    this.stopWorkers();
  }

  @OnEvent(BLOCKS_REVERT_DETECTED_EVENT)
  protected async handleBlocksRevert({ detectedIncorrectBlockNumber }: { detectedIncorrectBlockNumber: number }) {
    this.logger.log("Stopping workers before blocks revert");
    await this.stopWorkers();

    this.logger.log("Starting workers after blocks revert");
    await this.startWorkers();
  }

  private startWorkers() {
    const tasks = [this.bridgeActiveService.start(), this.bridgePointService.start()];
    return Promise.all(tasks);
  }

  private stopWorkers() {
    return Promise.all([this.bridgeActiveService.stop(), this.bridgePointService.stop()]);
  }

  private async compensatePoints() {
    await this.adapterService.compensatePointsData('novaswap', 2228865, 2215814);
    await this.tvlPointService.handleHoldPoint(2228865, new Date("2024-05-29 17:22:55Z").toISOString());
    await this.adapterService.compensatePointsData('novaswap', 2242907, 2228865);
    await this.tvlPointService.handleHoldPoint(2242907, new Date("2024-05-30 01:22:55Z").toISOString());
    await this.adapterService.compensatePointsData('novaswap', 2256932, 2242907);
    await this.tvlPointService.handleHoldPoint(2256932, new Date("2024-05-30 09:22:55Z").toISOString());
    await this.adapterService.compensatePointsData('novaswap', 2270939, 2256932);
    await this.tvlPointService.handleHoldPoint(2270939, new Date("2024-05-30 17:22:55Z").toISOString());
    await this.adapterService.compensatePointsData('novaswap', 2284939, 2270939);
    await this.tvlPointService.handleHoldPoint(2284939, new Date("2024-05-31 01:22:55Z").toISOString());
  }

}
