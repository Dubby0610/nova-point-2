import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { DataSource } from "typeorm";
import { BLOCKS_REVERT_DETECTED_EVENT } from "./constants";
import runMigrations from "./utils/runMigrations";
import { AdapterService } from "./points/adapter.service";
import { HoldLpPointService } from "./points/holdLpPoint.service";
import { BridgePointService } from "./points/bridgePoint.service";
import { BridgeActiveService } from "./points/bridgeActive.service";

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger;

  public constructor(
    private readonly dataSource: DataSource,
    private readonly holdLpPointService: HoldLpPointService,
    private readonly adapterService: AdapterService,
    private readonly bridgePointService: BridgePointService,
    private readonly bridgeActiveService: BridgeActiveService,
    private readonly configService: ConfigService
  ) {
    this.logger = new Logger(AppService.name);
  }

  public async onModuleInit() {
    // example:
    // await this.adapterService.loadLastBlockNumber(1376336, 1715102340);
    // second params is utc+8
    // await this.holdLpPointService.handleHoldPoint(1395273, new Date(1715159940 * 1000).toISOString());

    await this.holdLpPointService.handleHoldPoint(1614970, new Date(1715709842 * 1000).toISOString());
    await this.adapterService.loadLastBlockNumber(1629154, 1715736000);
    await this.holdLpPointService.handleHoldPoint(1629154, new Date(1715738590 * 1000).toISOString());
    await this.holdLpPointService.handleHoldPoint();
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
}
