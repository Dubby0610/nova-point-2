import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { BLOCKS_REVERT_DETECTED_EVENT } from "./constants";
import { BridgePointService } from "./points/bridgePoint.service";

import { BridgeActiveService } from "./points/bridgeActive.service";
import { AdapterService } from "./points/adapter.service";
import { TvlPointService } from "./points/tvlPoint.service";

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger;

  public constructor(

    private readonly bridgePointService: BridgePointService,

    private readonly bridgeActiveService: BridgeActiveService,
    private readonly configService: ConfigService,
    private readonly adapterService: AdapterService,
    private readonly tvlPointService: TvlPointService,
  ) {
    this.logger = new Logger(AppService.name);
  }

  public async onModuleInit() {
    // example:
    // await this.adapterService.loadLastBlockNumber(1376336, 1476336);
    // second params is utc+8
    // await this.holdLpPointService.handleHoldPoint(1395273, new Date(1715159940 * 1000).toISOString());

    await this.adapterService.loadLastBlockNumber(1671452, 1671452);
    await this.tvlPointService.handleHoldPoint(1671452, new Date("2024-05-16 09:19").toISOString());
    this.startWorkers();
    // runMigrations(this.dataSource, this.logger).then(() => {
    //   this.startWorkers();
    // });
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
}
