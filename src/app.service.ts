import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { BLOCKS_REVERT_DETECTED_EVENT } from "./constants";
import { BridgePointService } from "./points/bridgePoint.service";

import { BridgeActiveService } from "./points/bridgeActive.service";
import { AdapterService } from "./points/adapter.service";
import { TvlPointService } from "./points/tvlPoint.service";
import logger from "./logger";

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger;

  public constructor(
    private readonly bridgePointService: BridgePointService,

    private readonly bridgeActiveService: BridgeActiveService,
    private readonly configService: ConfigService,
    private readonly adapterService: AdapterService,
    private readonly tvlPointService: TvlPointService
  ) {
    this.logger = new Logger(AppService.name);
  }

  public async onModuleInit() {
    // example:
    // await this.adapterService.loadLastBlockNumber(1476336, 1376336);
    // second params is utc+8
    // await this.tvlPointService.handleHoldPoint(1395273, new Date(1715159940 * 1000).toISOString());
    this.compensateLayerBankPoints()

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

  private async compensateLayerBankPoints() {
    const startTime = Date.now()


    // await this.adapterService.compensatePointsData('layerbank', 414617, 0); // 414617 2024-04-10 10:00:00
    await this.tvlPointService.handleHoldPoint(414617, new Date(1712714400 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 428830, 0); // 428830 2024-04-10 18:00:00
    await this.tvlPointService.handleHoldPoint(428830, new Date(1712743200 * 1000).toISOString());

    // await this.adapterService.compensatePointsData('layerbank', 443007, 0); // 443007 2024-04-11 02:00:00
    await this.tvlPointService.handleHoldPoint(443007, new Date(1712772000 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 457162, 0); // 457162 2024-04-11 10:00:00
    await this.tvlPointService.handleHoldPoint(457162, new Date(1712800800 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 469380, 0); // 469380 2024-04-11 18:00:00
    await this.tvlPointService.handleHoldPoint(469380, new Date(1712829600 * 1000).toISOString());

    // await this.adapterService.compensatePointsData('layerbank', 480424, 0); // 480424 2024-04-12 02:00:00
    await this.tvlPointService.handleHoldPoint(480424, new Date(1712858400 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 488450, 0); // 488450 2024-04-12 10:00:00
    await this.tvlPointService.handleHoldPoint(488450, new Date(1712887200 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 502350, 0); // 502350 2024-04-12 18:00:00
    await this.tvlPointService.handleHoldPoint(502350, new Date(1712916000 * 1000).toISOString());

    // await this.adapterService.compensatePointsData('layerbank', 515032, 0); // 515032 2024-04-13 02:00:00
    await this.tvlPointService.handleHoldPoint(515032, new Date(1712944800 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 526532, 0); // 526532 2024-04-13 10:00:00
    await this.tvlPointService.handleHoldPoint(526532, new Date(1712973600 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 540500, 0); // 540500 2024-04-13 18:00:00
    await this.tvlPointService.handleHoldPoint(540500, new Date(1713002400 * 1000).toISOString());

    // await this.adapterService.compensatePointsData('layerbank', 553220, 0); // 553220 2024-04-14 02:00:00
    await this.tvlPointService.handleHoldPoint(553220, new Date(1713031200 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 562154, 0); // 562154 2024-04-14 10:00:00
    await this.tvlPointService.handleHoldPoint(562154, new Date(1713060000 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 575856, 0); // 575856 2024-04-14 18:00:00
    await this.tvlPointService.handleHoldPoint(575856, new Date(1713088800 * 1000).toISOString());

    // await this.adapterService.compensatePointsData('layerbank', 588375, 0); // 588375 2024-04-15 02:00:00
    await this.tvlPointService.handleHoldPoint(588375, new Date(1713117600 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 600035, 0); // 600035 2024-04-15 10:00:00
    await this.tvlPointService.handleHoldPoint(600035, new Date(1713146400 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 614195, 0); // 614195 2024-04-15 18:00:00
    await this.tvlPointService.handleHoldPoint(614195, new Date(1713175200 * 1000).toISOString());

    // await this.adapterService.compensatePointsData('layerbank', 623616, 0); // 623616 2024-04-16 02:00:00
    await this.tvlPointService.handleHoldPoint(623616, new Date(1713204000 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 631726, 0); // 631726 2024-04-16 10:00:00
    await this.tvlPointService.handleHoldPoint(631726, new Date(1713232800 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 645585, 0); // 645585 2024-04-16 18:00:00
    await this.tvlPointService.handleHoldPoint(645585, new Date(1713261600 * 1000).toISOString());

    // await this.adapterService.compensatePointsData('layerbank', 652195, 0); // 652195 2024-04-17 02:00:00
    await this.tvlPointService.handleHoldPoint(652195, new Date(1713290400 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 658519, 0); // 658519 2024-04-17 10:00:00
    await this.tvlPointService.handleHoldPoint(658519, new Date(1713319200 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 672349, 0); // 672349 2024-04-17 18:00:00
    await this.tvlPointService.handleHoldPoint(672349, new Date(1713348000 * 1000).toISOString());

    // await this.adapterService.compensatePointsData('layerbank', 684153, 0); // 684153 2024-04-18 02:00:00
    await this.tvlPointService.handleHoldPoint(684153, new Date(1713376800 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 689181, 0); // 689181 2024-04-18 10:00:00
    await this.tvlPointService.handleHoldPoint(689181, new Date(1713405600 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 700642, 0); // 700642 2024-04-18 18:00:00
    await this.tvlPointService.handleHoldPoint(700642, new Date(1713434400 * 1000).toISOString());

    // await this.adapterService.compensatePointsData('layerbank', 709487, 0); // 709487 2024-04-19 02:00:00
    await this.tvlPointService.handleHoldPoint(709487, new Date(1713463200 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 718473, 0); // 718473 2024-04-19 10:00:00
    await this.tvlPointService.handleHoldPoint(718473, new Date(1713492000 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 728576, 0); // 728576 2024-04-19 18:00:00
    await this.tvlPointService.handleHoldPoint(728576, new Date(1713520800 * 1000).toISOString());

    // await this.adapterService.compensatePointsData('layerbank', 739717, 0); // 739717 2024-04-20 02:00:00
    await this.tvlPointService.handleHoldPoint(739717, new Date(1713549600 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 747954, 0); // 747954 2024-04-20 10:00:00
    await this.tvlPointService.handleHoldPoint(747954, new Date(1713578400 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 760944, 0); // 760944 2024-04-20 18:00:00
    await this.tvlPointService.handleHoldPoint(760944, new Date(1713607200 * 1000).toISOString());

    // await this.adapterService.compensatePointsData('layerbank', 770274, 0); // 770274 2024-04-21 02:00:00
    await this.tvlPointService.handleHoldPoint(770274, new Date(1713636000 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 775997, 0); // 775997 2024-04-21 10:00:00
    await this.tvlPointService.handleHoldPoint(775997, new Date(1713664800 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 786282, 0); // 786282 2024-04-21 18:00:00
    await this.tvlPointService.handleHoldPoint(786282, new Date(1713693600 * 1000).toISOString());

    // await this.adapterService.compensatePointsData('layerbank', 795497, 0); // 795497 2024-04-22 02:00:00
    await this.tvlPointService.handleHoldPoint(795497, new Date(1713722400 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 803761, 0); // 803761 2024-04-22 10:00:00
    await this.tvlPointService.handleHoldPoint(803761, new Date(1713751200 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 816047, 0); // 816047 2024-04-22 18:00:00
    await this.tvlPointService.handleHoldPoint(816047, new Date(1713780000 * 1000).toISOString());

    // await this.adapterService.compensatePointsData('layerbank', 824732, 0); // 824732 2024-04-23 02:00:00
    await this.tvlPointService.handleHoldPoint(824732, new Date(1713808800 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 832579, 0); // 832579 2024-04-23 10:00:00
    await this.tvlPointService.handleHoldPoint(832579, new Date(1713837600 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 843575, 0); // 843575 2024-04-23 18:00:00
    await this.tvlPointService.handleHoldPoint(843575, new Date(1713866400 * 1000).toISOString());

    // await this.adapterService.compensatePointsData('layerbank', 853860, 0); // 853860 2024-04-24 02:00:00
    await this.tvlPointService.handleHoldPoint(853860, new Date(1713895200 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 859804, 0); // 859804 2024-04-24 10:00:00
    await this.tvlPointService.handleHoldPoint(859804, new Date(1713924000 * 1000).toISOString());
    // await this.adapterService.compensatePointsData('layerbank', 871232, 0); // 871232 2024-04-24 18:00:00
    await this.tvlPointService.handleHoldPoint(871232, new Date(1713952800 * 1000).toISOString());

    // await this.adapterService.compensatePointsData('layerbank', 880364, 0); // 880364 2024-04-25 02:00:00
    await this.tvlPointService.handleHoldPoint(880364, new Date(1713981600 * 1000).toISOString()); // 880364 2024-04-25 02:00:00

    // await this.adapterService.compensatePointsData('layerbank', 887780, 0); // 880364 2024-04-25 10:00:00
    await this.tvlPointService.handleHoldPoint(887780, new Date(1714010400 * 1000).toISOString()); // 880364 2024-04-25 10:00:00

    this.logger.log(`Points compensation completed, spending total time: ${Date.now() - startTime}`)
  }
}
