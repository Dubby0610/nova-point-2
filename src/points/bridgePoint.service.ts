import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import waitFor from "../utils/waitFor";
import { CacheRepository, ProjectRepository, TransferRepository } from "../repositories";
import BigNumber from "bignumber.js";
import { ConfigService } from "@nestjs/config";
import BridgeConfig from "src/bridge.config";
import { HoldLpPointService } from "./holdLpPoint.service";

interface TransferItem {
  address: string;
  tokenAddress: string;
  bridgeAddress: string;
  blockNumber: number;
  amount: bigint;
}

const PREFIX_ACTIVE = "active-";
const PREFIX_NEXT_TRANSFERPOINTS = "nextTransferPoints-";
const ETH_ADDRESS = "0x000000000000000000000000000000000000800a".toLocaleLowerCase();
const USDT_USDC_ADDRESS = [
  // usdt
  "0x012726F9f458a63f86055b24E67BA0aa26505028".toLocaleLowerCase(),
  "0x6aFb043b4955505fc9B2B965FCF6972Fa561291d".toLocaleLowerCase(),
  "0x0ace5E8e1Be0d3Df778f639d79fa8231b376b9F1".toLocaleLowerCase(),
  "0x7356804be101E88C260e074a5b34fC0E0D2d569b".toLocaleLowerCase(),
  "0x8Fed4307f02eCcbd9EC88C84081Ba5eDCAcD0964".toLocaleLowerCase(),
  "0xAF5852CA4Fc29264226Ed0c396dE30C945589D6D".toLocaleLowerCase(),
  "0x8a87de262e7C0EfA4Cb59eC2a8e60494edD59e8f".toLocaleLowerCase(),
  // usdc
  "0x7581469cb53E786F39ff26E8aF6Fd750213dAcEd".toLocaleLowerCase(),
  "0xd4A037d77AAFf6d7a396562fC5beaC76041A9EAf".toLocaleLowerCase(),
  "0x60CF0D62329699A23E988d500A7E40Faae4a3E4D".toLocaleLowerCase(),
  "0xfFE944D301BB97b1271f78c7d0E8C930b75DC51B".toLocaleLowerCase(),
  "0x220B1C622c8c169a9174f42CEA89a9E2f83B63F6".toLocaleLowerCase(),
  "0x70064389730D2BDBcF85D8565A855716Cda0Bfca".toLocaleLowerCase(),
  "0xA8A59Bb7fe9fE2364ae39a3B48E219fAB096c852".toLocaleLowerCase(),
  "0x4E340B4Ea46ca1D1CE6e2dF7b21e649e2921521f".toLocaleLowerCase(),
];
const ETH_AMOUNT = BigInt(10 ** 17);
const USDT_AMOUNT = BigInt(500 * 10 ** 6);

@Injectable()
export class BridgePointService extends Worker {
  private readonly logger: Logger;
  private readonly bridgeConfig: any = {};
  private readonly bridgeAddress: string[] = [];
  private lastTransferBlockNumber: number = 0;
  private readonly startBlock: number;

  public constructor(
    private readonly transferRepository: TransferRepository,
    private readonly cacheRepository: CacheRepository,
    private readonly holdLpPointService: HoldLpPointService,
    private readonly projectRepository: ProjectRepository,
    private readonly configService: ConfigService
  ) {
    super();
    this.logger = new Logger(BridgePointService.name);
    this.startBlock = this.configService.get<number>("startBlock");
    // loop BridgeConfig, use bridge.address to key and save to bridgeConfig
    for (const bridge of BridgeConfig) {
      this.bridgeConfig[bridge.address] = bridge;
      this.bridgeAddress.push(bridge.address);
      this.projectRepository.upsert({ pairAddress: bridge.address, name: bridge.id }, true, ["pairAddress"]);
    }
  }

  protected async runProcess(): Promise<void> {
    const interval = 20;
    try {
      await this.handlePoint();
    } catch (error) {
      this.logger.error("Failed to calculate hold point", error.stack);
    }

    await waitFor(() => !this.currentProcessPromise, interval * 1000, interval * 1000);
    if (!this.currentProcessPromise) {
      return;
    }

    return this.runProcess();
  }

  async handlePoint() {
    const lastTransferBlockNumberTmp = await this.cacheRepository.getLastBridgeStatisticalBlockNumber();
    this.lastTransferBlockNumber = Math.max(this.startBlock, lastTransferBlockNumberTmp);
    const transfers = await this.fetchTransferList();
    if (transfers.length > 0) {
      await this.executePoints(transfers);
    }
  }

  public async executePoints(lastTransfers: TransferItem[]): Promise<void> {
    const bridgeAddress: string[] = this.bridgeAddress;
    const now = new Date();
    const bridgeAddressDailyCount = [];
    for (const address of bridgeAddress) {
      const key = this.getBridgeAddressDailyKey(now, address);
      const count = (await this.cacheRepository.getValue(key)) || 0;
      this.logger.log(
        `BridgeAddress: ${address}, date:${now.getFullYear()}-${now.getMonth()}-${now.getDay()}, initCount: ${count}`
      );
      bridgeAddressDailyCount[key] = count;
    }

    // loop lastTransfers
    for (const transfer of lastTransfers) {
      // if (
      //   !(
      //     (transfer.tokenAddress.toLocaleLowerCase() === ETH_ADDRESS && transfer.amount >= ETH_AMOUNT) ||
      //     (USDT_USDC_ADDRESS.includes(transfer.tokenAddress.toLocaleLowerCase()) && transfer.amount >= USDT_AMOUNT)
      //   )
      // ) {
      //   continue;
      // }
      const activeAddressKey = `${PREFIX_ACTIVE}-${transfer.address}`;
      await this.cacheRepository.setValue(activeAddressKey, "active");
      const transferBridgeAddress = transfer.bridgeAddress.toLocaleLowerCase();
      // get bridgeConfig by transfer.bridgeAddress
      const bridge = this.bridgeConfig[transferBridgeAddress];
      if (!bridge) {
        this.logger.log(`Bridge not found for bridgeAddress: ${transferBridgeAddress}`);
        continue;
      }
      // bridgeAddress-Date: total count of transfers of eve day, and saved by pgsql
      const date = new Date(transfer.blockNumber * 1000);
      const key = this.getBridgeAddressDailyKey(date, transferBridgeAddress);
      // when interval is 10s, and now is 2024-04-26 00:00:05, the transfer time may be 2024-04-26 23:59:59 or 2024-04-27 00:00:02, so we need to check the date
      if (!bridgeAddressDailyCount[key]) {
        this.logger.log(`New key : BridgeAddress: ${transferBridgeAddress}, date:${date.getDate()}, count: 0`);
        bridgeAddressDailyCount[key] = 0;
      }
      const transferPoints = this.calculatePoint(bridgeAddressDailyCount[key], bridge);
      this.logger.log(
        `TransferAddress: ${transfer.address}, TransferBridgeAddress:${transferBridgeAddress}, TokenAddress:${transfer.tokenAddress}, Count:${bridgeAddressDailyCount[key]}, TransferPoints: ${transferPoints} `
      );
      bridgeAddressDailyCount[key]++;

      // calculate nextTransferPoints
      const nextTransferPoints = this.calculatePoint(bridgeAddressDailyCount[key], bridge);
      const nextTransferPointsKey = `${PREFIX_NEXT_TRANSFERPOINTS}-${bridge.id}`;
      await this.cacheRepository.setValue(nextTransferPointsKey, nextTransferPoints.toString());
      // transferPoints save to pgsql
      await this.holdLpPointService.updateHoldPoint(
        transfer.blockNumber,
        transferBridgeAddress,
        transfer.address.toLocaleLowerCase(),
        BigNumber(transferPoints.toString())
      );
      this.lastTransferBlockNumber = transfer.blockNumber;
    }

    // update count to pgsql
    for (const [key, count] of bridgeAddressDailyCount) {
      await this.cacheRepository.setValue(key, count);
    }

    // update lastTransferBlockNumber
    await this.cacheRepository.setBridgeStatisticalBlockNumber(this.lastTransferBlockNumber);
  }

  // fetch latest transfer list
  public async fetchTransferList(): Promise<TransferItem[]> {
    this.logger.log(`Fetch transfer list from blockNumber: ${this.lastTransferBlockNumber}`);
    const bridgeAddress: string[] = this.bridgeAddress;
    const transfersDb = await this.transferRepository.getLatestQulifyTransfers(
      this.lastTransferBlockNumber,
      bridgeAddress,
      ETH_ADDRESS,
      ETH_AMOUNT,
      USDT_USDC_ADDRESS,
      USDT_AMOUNT
    );
    this.logger.log(`From blockNumber: ${this.lastTransferBlockNumber}, fetched ${transfersDb.length} transfers`);
    if (transfersDb.length === 0) {
      return [];
    }
    const transfers: TransferItem[] = transfersDb.map((transfer) => {
      return {
        address: transfer.to.toLocaleLowerCase(),
        tokenAddress: transfer.tokenAddress.toLocaleLowerCase(),
        bridgeAddress: transfer.from.toLocaleLowerCase(),
        blockNumber: transfer.blockNumber,
        amount: BigInt(transfer.amount.toString()),
      };
    });
    return transfers;
  }

  // calculate point
  public calculatePoint(count: bigint, bridgeConfig: any): number {
    const pointsRule = bridgeConfig.pointsRule;
    let points = 0;
    for (const rule of pointsRule) {
      const end = rule.end === 0 ? Number.MAX_SAFE_INTEGER : rule.end;
      if (count >= rule.start && count <= end) {
        points = rule.points;
        break;
      }
    }
    return points;
  }

  //get bridgeAddress daily key
  public getBridgeAddressDailyKey(date: Date, bridgeAddress: string): string {
    return `${bridgeAddress}-${date.getFullYear()}-${date.getMonth()}-${date.getDay()}`;
  }
}
