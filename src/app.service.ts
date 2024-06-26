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
import { RedistributePointService } from "./points/redistributePoint.service";
import { BaseDataService } from "./points/baseData.service";
import { ReferralPointService } from "./points/referralPoints.service";

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
    private readonly txVolPointService: TxVolPointService,
    private readonly txNumPointService: TxNumPointService,
    private readonly redistributePointService: RedistributePointService,
    private readonly referralPointService: ReferralPointService
  ) {
    this.logger = new Logger(AppService.name);
  }

  public async onModuleInit() {
    // example:
    // await this.adapterService.loadLastBlockNumber(1476336, 1376336);
    // second params is utc+8
    // await this.tvlPointService.handleHoldPoint(1395273, new Date(1715159940 * 1000).toISOString());
    // this.compensatePoints()
    await this.referralPointService.handleReferralPoint();
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
    ]);
  }

  private stopWorkers() {
    return Promise.all([this.baseDataService.stop(), this.bridgeActiveService.stop(), this.bridgePointService.stop()]);
  }

  private async compensatePoints() {}
}
