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
import { BaseDataService } from "./points/baseData.service";
import { ReferralPointService } from "./points/referralPoints.service";
import { SeasonTotalPointService } from "./points/seasonTotalPoint.service";

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger;

  public constructor(
    private readonly baseDataService: BaseDataService,
    private readonly bridgePointService: BridgePointService,

    private readonly bridgeActiveService: BridgeActiveService,
    private readonly configService: ConfigService,
    private readonly adapterService: AdapterService,
    private readonly tvlPointService: TvlPointService,
    private readonly txPointService: TxPointService,
    private readonly redistributePointService: RedistributePointService,
    private readonly referralPointService: ReferralPointService,
    private readonly seasonTotalPointService: SeasonTotalPointService
  ) {
    this.logger = new Logger(AppService.name);
  }

  public async onModuleInit() {
    // example:
    // await this.adapterService.runProcess();
    // second params is utc+8

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
    return Promise.all([
      this.baseDataService.start(),
      this.bridgeActiveService.start(),
      this.bridgePointService.start(),
      this.adapterService.start(),
      this.tvlPointService.start(),
      this.txPointService.start()
    ]);
  }

  private stopWorkers() {
    return Promise.all([this.baseDataService.stop(), this.bridgeActiveService.stop(), this.bridgePointService.stop()]);
  }

  private async compensatePoints() { }
}
