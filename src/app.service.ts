import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { DataSource } from "typeorm";
import { BLOCKS_REVERT_DETECTED_EVENT } from "./constants";
import runMigrations from "./utils/runMigrations";
import { BridgePointService } from "./points/bridgePoint.service";
import { AdapterService } from "./points/adapter.service";
import { TvlPointService } from "./points/tvlPoint.service";
import { VolPointService } from "./points/volPoint.service";
import { TxNumPointService } from "./points/txNumPoint.service";

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger;

  public constructor(
    private readonly dataSource: DataSource,
    private readonly adapterService: AdapterService,
    private readonly bridgePointService: BridgePointService,
    private readonly tvlPointService: TvlPointService,
    private readonly volPointService: VolPointService,
    private readonly txNumPointService: TxNumPointService,
    private readonly configService: ConfigService
  ) {
    this.logger = new Logger(AppService.name);
  }

  public onModuleInit() {
    runMigrations(this.dataSource, this.logger).then(() => {
      this.startWorkers();
    });
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
    this.adapterService.loadLastBlockNumber();
    const tasks = [
      this.tvlPointService.start(),
      this.volPointService.start(),
      this.txNumPointService.start(),
      this.bridgePointService.start(),
    ];
    // const tasks = [this.bridgePointService.start()];
    return Promise.all(tasks);
  }

  private stopWorkers() {
    const tasks = [
      this.tvlPointService.stop(),
      this.volPointService.stop(),
      this.txNumPointService.stop(),
      this.bridgePointService.stop(),
    ];
    // const tasks = [this.bridgePointService.stop()];
    return Promise.all(tasks);
  }
}
