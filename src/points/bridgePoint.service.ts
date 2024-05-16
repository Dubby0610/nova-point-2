import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import waitFor from "../utils/waitFor";
import {
  BlockAddressPointOfLpRepository,
  CacheRepository,
  PointsOfLpRepository,
  ProjectRepository,
  TransferRepository,
} from "../repositories";
import BigNumber from "bignumber.js";
import { ConfigService } from "@nestjs/config";
import BridgeConfig from "src/bridge.config";

interface TransferItem {
  address: string;
  tokenAddress: string;
  bridgeAddress: string;
  blockNumber: number;
  number: number;
  timestamp: number;
  amount: bigint;
}

const PREFIX_ACTIVE = "active-";
const PREFIX_NEXT_TRANSFERPOINTS = "nextTransferPoints-";
const ETH_ADDRESS = [
  "0x000000000000000000000000000000000000800a".toLocaleLowerCase(),
  "0x8280a4e7D5B3B658ec4580d3Bc30f5e50454F169".toLocaleLowerCase(),
];
const USDT_USDC_ADDRESS = [
  // usdt
  "0x2F8A25ac62179B31D62D7F80884AE57464699059".toLocaleLowerCase(),
  "0x012726F9f458a63f86055b24E67BA0aa26505028".toLocaleLowerCase(),
  "0x6aFb043b4955505fc9B2B965FCF6972Fa561291d".toLocaleLowerCase(),
  "0x0ace5E8e1Be0d3Df778f639d79fa8231b376b9F1".toLocaleLowerCase(),
  "0x7356804be101E88C260e074a5b34fC0E0D2d569b".toLocaleLowerCase(),
  "0x8Fed4307f02eCcbd9EC88C84081Ba5eDCAcD0964".toLocaleLowerCase(),
  "0xAF5852CA4Fc29264226Ed0c396dE30C945589D6D".toLocaleLowerCase(),
  "0x8a87de262e7C0EfA4Cb59eC2a8e60494edD59e8f".toLocaleLowerCase(),
  // usdc
  "0x1a1A3b2ff016332e866787B311fcB63928464509".toLocaleLowerCase(),
  "0x7581469cb53E786F39ff26E8aF6Fd750213dAcEd".toLocaleLowerCase(),
  "0xd4A037d77AAFf6d7a396562fC5beaC76041A9EAf".toLocaleLowerCase(),
  "0x60CF0D62329699A23E988d500A7E40Faae4a3E4D".toLocaleLowerCase(),
  "0xfFE944D301BB97b1271f78c7d0E8C930b75DC51B".toLocaleLowerCase(),
  "0x220B1C622c8c169a9174f42CEA89a9E2f83B63F6".toLocaleLowerCase(),
  "0x70064389730D2BDBcF85D8565A855716Cda0Bfca".toLocaleLowerCase(),
  "0xA8A59Bb7fe9fE2364ae39a3B48E219fAB096c852".toLocaleLowerCase(),
  "0x4E340B4Ea46ca1D1CE6e2dF7b21e649e2921521f".toLocaleLowerCase(),
];
const ETH_AMOUNT = BigInt((98 / 100) * 10 ** 17);
const USDT_AMOUNT = BigInt((98 / 100) * 500 * 10 ** 6);
const symbiosisNotEqualToAddress = [
  "0x2E818E50b913457015E1277B43E469b63AC5D3d7".toLocaleLowerCase(),
  "0x0000000000000000000000000000000000000000".toLocaleLowerCase(),
];
const symbiosisBaseContractAddress = "0x8Dc71561414CDcA6DcA7C1dED1ABd04AF474D189".toLocaleLowerCase();

@Injectable()
export class BridgePointService extends Worker {
  private readonly logger: Logger;
  private readonly type: string = "bridgeTxNum";
  private readonly bridgeConfig = [];
  private readonly bridgeAddress: string[] = [];
  private lastTransferBlockNumber: number = 0;
  private readonly startBlock: number;

  public constructor(
    private readonly pointsOfLpRepository: PointsOfLpRepository,
    private readonly blockAddressPointOfLpRepository: BlockAddressPointOfLpRepository,
    private readonly transferRepository: TransferRepository,
    private readonly cacheRepository: CacheRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly configService: ConfigService
  ) {
    super();
    this.logger = new Logger(BridgePointService.name);
    this.startBlock = this.configService.get<number>("startBlock");
    // loop BridgeConfig, use bridge.address to key and save to bridgeConfig
    for (const bridge of BridgeConfig) {
      if (bridge.addresses.length > 0) {
        for (const address of bridge.addresses) {
          this.bridgeConfig[address] = bridge;
          this.bridgeAddress.push(address);
          this.projectRepository.upsert({ pairAddress: address, name: bridge.id }, true, ["pairAddress"]);
        }
      }
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
    const now = new Date();
    const bridgeAddressDailyCount = [];
    for (const address in this.bridgeConfig) {
      const bridge = this.bridgeConfig[address];
      const key = this.getBridgeAddressDailyKey(now, bridge.id);
      const count = Number(await this.cacheRepository.getValue(key)) || 0;
      this.logger.log(
        `key:${key}, BridgeAddress: ${address}, BridgeId: ${bridge.id}, date:${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}, initCount: ${count}`
      );
      bridgeAddressDailyCount[key] = count;
    }

    // loop lastTransfers
    for (const transfer of lastTransfers) {
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
      const date = new Date(transfer.timestamp);
      const key = this.getBridgeAddressDailyKey(date, bridge.id);
      // when interval is 10s, and now is 2024-04-26 00:00:05, the transfer time may be 2024-04-26 23:59:59 or 2024-04-27 00:00:02, so we need to check the date
      if (!bridgeAddressDailyCount[key]) {
        // from db
        const tmpValue = await this.cacheRepository.getValue(key);
        this.logger.log(
          `key is ${key}, BridgeAddress: ${transferBridgeAddress}, BridgeId: ${bridge.id}, timestmap:${transfer.timestamp},date:${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}, count: 0`
        );
        bridgeAddressDailyCount[key] = tmpValue;
      }
      const transferPoints = this.calculatePoint(bridgeAddressDailyCount[key], bridge);
      this.logger.log(
        `TransferAddress: ${transfer.address}, BridgeId: ${bridge.id}, TransferBridgeAddress:${transferBridgeAddress}, TokenAddress:${transfer.tokenAddress}, Count:${bridgeAddressDailyCount[key]}, TransferPoints: ${transferPoints} `
      );
      bridgeAddressDailyCount[key]++;

      // calculate nextTransferPoints
      const nextTransferPoints = this.calculatePoint(bridgeAddressDailyCount[key], bridge);
      const nextTransferPointsKey = `${PREFIX_NEXT_TRANSFERPOINTS}-${bridge.id}`;
      await this.cacheRepository.setValue(nextTransferPointsKey, nextTransferPoints.toString());
      // transferPoints save to pgsql
      await this.updateUserPoint(
        transfer.blockNumber,
        transferBridgeAddress,
        transfer.address.toLocaleLowerCase(),
        BigNumber(transferPoints.toString())
      );
      this.lastTransferBlockNumber = transfer.blockNumber;
    }

    // update count to pgsql
    for (const key in bridgeAddressDailyCount) {
      const count = bridgeAddressDailyCount[key];
      await this.cacheRepository.setValue(key, count.toString());
    }

    // update lastTransferBlockNumber
    await this.cacheRepository.setBridgeStatisticalBlockNumber(this.lastTransferBlockNumber);
  }

  // fetch latest transfer list
  public async fetchTransferList(): Promise<TransferItem[]> {
    this.logger.log(`Fetch transfer list from blockNumber: ${this.lastTransferBlockNumber}`);
    let defalutBridgeAddress: string[] = [],
      symbiosisAddress: string[] = [];
    for (const item of BridgeConfig) {
      if (item.id == "symbiosis") {
        symbiosisAddress = item.addresses;
      } else {
        defalutBridgeAddress = [...defalutBridgeAddress, ...item.addresses];
      }
    }
    let transfersDb = await this.transferRepository.getLatestQulifyTransfers(
      this.lastTransferBlockNumber,
      defalutBridgeAddress,
      ETH_ADDRESS,
      ETH_AMOUNT,
      USDT_USDC_ADDRESS,
      USDT_AMOUNT
    );
    this.logger.log(
      `TransfersDb from blockNumber: ${this.lastTransferBlockNumber}, fetched ${transfersDb.length} transfers`
    );

    // symbiosis
    const transfersDbSymbiosis = await this.transferRepository.getSymbiosisLatestQulifyTransfers(
      this.lastTransferBlockNumber,
      symbiosisAddress,
      ETH_ADDRESS,
      ETH_AMOUNT,
      USDT_USDC_ADDRESS,
      USDT_AMOUNT,
      symbiosisNotEqualToAddress,
      symbiosisBaseContractAddress
    );
    this.logger.log(
      `TransfersDbSymbiosis from blockNumber: ${this.lastTransferBlockNumber}, fetched ${transfersDbSymbiosis.length} transfers`
    );
    transfersDb = [...transfersDb, ...transfersDbSymbiosis];
    if (transfersDb.length === 0) {
      return [];
    }
    const transfers: TransferItem[] = transfersDb.map((transfer) => {
      return {
        address: transfer.to.toLocaleLowerCase(),
        tokenAddress: transfer.tokenAddress.toLocaleLowerCase(),
        bridgeAddress: transfer.from.toLocaleLowerCase(),
        blockNumber: transfer.blockNumber,
        number: transfer.number,
        timestamp: Number(transfer.timestamp),
        amount: BigInt(transfer.amount ?? "0"),
      };
    });
    transfers.sort((a, b) => a.number - b.number);
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
  public getBridgeAddressDailyKey(date: Date, bridgeId: string): string {
    return `${bridgeId}-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  async updateUserPoint(blockNumber: number, pairAddress: string, from: string, holdPoint: BigNumber) {
    const fromBlockAddressPoint = {
      blockNumber: blockNumber,
      address: from,
      pairAddress: pairAddress,
      holdPoint: holdPoint.toNumber(),
      type: this.type,
    };
    let fromAddressPoint = await this.pointsOfLpRepository.getPointByAddress(from, pairAddress);
    if (!fromAddressPoint) {
      fromAddressPoint = {
        id: 0,
        address: from,
        pairAddress: pairAddress,
        stakePoint: 0,
      };
    }
    fromAddressPoint.stakePoint = Number(fromAddressPoint.stakePoint) + holdPoint.toNumber();
    this.logger.log(`PairAddrss ${pairAddress}, Address ${from} get hold point: ${holdPoint}`);
    await this.blockAddressPointOfLpRepository.upsertUserPoints(fromBlockAddressPoint, fromAddressPoint);
  }
}
