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
    // await this.adapterService.loadLastBlockNumber(800000, 0);
    // await this.holdLpPointService.handleHoldPoint(975239, 1715102340);
    // await this.holdLpPointService.handleHoldPoint(1376336, 1715102340);
    // await this.holdLpPointService.handleHoldPoint(1385070, 1715131140);
    // await this.holdLpPointService.handleHoldPoint(1395273, 1715159940);
    // await this.holdLpPointService.handleHoldPoint(1401273, 1715188740);
    // await this.holdLpPointService.handleHoldPoint(1401273, 1715188740);
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
