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

  public onModuleInit() {
    this.startWorkers();
  }

  public onModuleDestroy() {
    this.stopWorkers();
  }

  @OnEvent(BLOCKS_REVERT_DETECTED_EVENT)
  protected async handleBlocksRevert({ detectedIncorrectBlockNumber }: { detectedIncorrectBlockNumber: number }) {
    this.logger.log("Stopping workers before blocks revert");
    // await this.holdLpPointService.handleHoldPoint();
    // await this.holdLpPointService.handleHoldPoint();
    // await this.holdLpPointService.handleHoldPoint();
    // await this.holdLpPointService.handleHoldPoint();
    await this.stopWorkers();

    this.logger.log("Starting workers after blocks revert");
    await this.startWorkers();
  }

  private startWorkers() {
    // const tasks = [this.holdLpPointService.start(), this.bridgePointService.start()];
    const tasks = [this.bridgeActiveService.start(), this.bridgePointService.start()];
    return Promise.all(tasks);
  }

  private stopWorkers() {
    // return Promise.all([this.holdLpPointService.stop(), this.bridgePointService.stop()]);
    return Promise.all([this.bridgeActiveService.stop(), this.bridgePointService.stop()]);
  }
}
