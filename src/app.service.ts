import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { BLOCKS_REVERT_DETECTED_EVENT } from "./constants";
import { BridgePointService } from "./points/bridgePoint.service";

import { BridgeActiveService } from "./points/bridgeActive.service";
import { AdapterService } from "./points/adapter.service";
import { TvlPointService } from "./points/tvlPoint.service";
import { TxVolPointService } from "./points/txVolPoint.service";

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger;

  public constructor(
    private readonly bridgePointService: BridgePointService,

    private readonly bridgeActiveService: BridgeActiveService,
    private readonly configService: ConfigService,
    private readonly adapterService: AdapterService,
    private readonly tvlPointService: TvlPointService,
    private readonly txVolPointService: TxVolPointService
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
    // 1981167 1967134
    await this.adapterService.compensatePointsData('aqua', 1981167, 1967134);
    await this.adapterService.compensatePointsData('layerbank', 1981167, 1967134);
    await this.tvlPointService.handleHoldPoint(1981167, new Date("2024-05-23 07:19:56Z").toISOString())
    // 1995180 1981167
    await this.adapterService.compensatePointsData('aqua', 1995180, 1981167);
    await this.adapterService.compensatePointsData('layerbank', 1995180, 1981167);
    await this.tvlPointService.handleHoldPoint(1995180, new Date("2024-05-24 01:19:55Z").toISOString())
    // 2009169 1995180
    await this.adapterService.compensatePointsData('aqua', 2009169, 1995180);
    // await this.adapterService.compensatePointsData('layerbank', 2009169, 1995180);
    await this.adapterService.compensatePointsData('logx', 2009169, 1995180);
    await this.adapterService.compensatePointsData('novaswap', 2009169, 1995180);
    await this.tvlPointService.handleHoldPoint(2009169, new Date("2024-05-24 09:19:56Z").toISOString())
    // 2023225 2009169
    await this.adapterService.compensatePointsData('aqua', 2023225, 2009169);
    // await this.adapterService.compensatePointsData('layerbank', 2023225, 2009169);
    await this.adapterService.compensatePointsData('logx', 2023225, 2009169);
    await this.adapterService.compensatePointsData('novaswap', 2023225, 2009169);
    await this.tvlPointService.handleHoldPoint(2023225, new Date("2024-05-24 17:19:54Z").toISOString());
    // 2037300 2023225
    // await this.adapterService.compensatePointsData('aqua', 2037300, 2023225);
    // await this.adapterService.compensatePointsData('layerbank', 2037300, 2023225);
    await this.adapterService.compensatePointsData('logx', 2037300, 2023225);
    await this.adapterService.compensatePointsData('novaswap', 2037300, 2023225);
    await this.tvlPointService.handleHoldPoint(2037300, new Date("2024-05-25 01:19:55Z").toISOString());

    await this.txVolPointService.handleCalculatePoint()
  }

}
