import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { BLOCKS_REVERT_DETECTED_EVENT } from "./constants";
import { BridgePointService } from "./points/bridgePoint.service";

import { BridgeActiveService } from "./points/bridgeActive.service";
import { AdapterService } from "./points/adapter.service";
import { TvlPointService } from "./points/tvlPoint.service";
import { TxPointService } from "./points/txPoint.service";
import { RedistributePointService } from "./points/redistributePoint.service";

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger;

  public constructor(
    private readonly bridgePointService: BridgePointService,

    private readonly bridgeActiveService: BridgeActiveService,
    private readonly configService: ConfigService,
    private readonly adapterService: AdapterService,
    private readonly tvlPointService: TvlPointService,
    private readonly txPointService: TxPointService,
    private readonly redistributePointService: RedistributePointService
  ) {
    this.logger = new Logger(AppService.name);
  }

  public async onModuleInit() {
    // example:
    // await this.adapterService.runProcess();
    // second params is utc+8
    // await this.tvlPointService.handleHoldPoint(1395273, new Date(1715159940 * 1000).toISOString());
    // this.compensatePoints()
    // this.redistributePointService.runProcess();
    this.tvlPointService.runProcess()

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

  private async compensatePoints() { }
}
