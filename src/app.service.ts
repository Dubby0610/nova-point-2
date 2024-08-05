import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { BLOCKS_REVERT_DETECTED_EVENT } from "./constants";
import { BridgePointService } from "./points/bridgePoint.service";

import { BridgeActiveService } from "./points/bridgeActive.service";
import { GenAdapterDataService } from "./points/genAdapterData.service";
import { CalTvlPointService } from "./points/calTvlPoint.service";
import { CalTxPointService } from "./points/calTxPoint.service";
import { RedistributePointService } from "./points/redistributePoint.service";
import { BaseDataService } from "./points/baseData.service";
import { ReferralPointService } from "./points/referralPoints.service";
import { SeasonTotalPointService } from "./points/seasonTotalPoint.service";
import { DirectPointService } from "./points/directPoint.service";

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger;

  public constructor(
    private readonly baseDataService: BaseDataService,
    private readonly bridgePointService: BridgePointService,

    private readonly bridgeActiveService: BridgeActiveService,
    private readonly configService: ConfigService,
    private readonly genAdapterDataService: GenAdapterDataService,
    private readonly calTvlPointService: CalTvlPointService,
    private readonly calTxPointService: CalTxPointService,
    private readonly redistributePointService: RedistributePointService,
    private readonly referralPointService: ReferralPointService,
    private readonly seasonTotalPointService: SeasonTotalPointService,
    private readonly directPointService: DirectPointService
  ) {
    this.logger = new Logger(AppService.name);
  }

  public async onModuleInit() {
    await this.genAdapterDataService.initAllDirectory()
    // example:
    // await this.adapterService.runProcess();
    // second params is utc+8
    // await this.tvlPointService.handleHoldPoint(1395273, new Date(1715159940 * 1000).toISOString());
    // this.compensatePoints()
    this.redistributePointService.runProcess();
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
      this.genAdapterDataService.start(),
      this.calTvlPointService.start(),
      this.calTxPointService.start(),
      this.seasonTotalPointService.start(),
      this.directPointService.start(),
    ]);
  }

  private stopWorkers() {
    return Promise.all([
      this.baseDataService.stop(),
      this.bridgeActiveService.stop(),
      this.bridgePointService.stop(),
      this.genAdapterDataService.stop(),
      this.calTvlPointService.stop(),
      this.calTxPointService.stop(),
      this.seasonTotalPointService.stop(),
      this.directPointService.stop(),
    ]);
  }

  private async compensatePoints() {}
}
