import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import waitFor from "../utils/waitFor";
import { CacheRepository, TransferRepository } from "../repositories";
import { ConfigService } from "@nestjs/config";
import BridgeConfig from "src/config/bridge.config";

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
const ONLY_ACTIVE_BLOCKNUMBER_KEY = "only_active_blocknumber_key";
const BTC_ADDRESS = [
  "0xbEAf16cFD8eFe0FC97C2a07E349B9411F5dC272C".toLocaleLowerCase(),
  "0x85D431A3a56FDf2d2970635fF627f386b4ae49CC".toLocaleLowerCase(),
];
// 0.005
const BTC_AMOUNT = BigInt(5 * (98 / 100) * 10 ** 15);

@Injectable()
export class BridgeActiveService extends Worker {
  private readonly logger: Logger;
  private lastTransferBlockNumber: number = 0;
  private readonly startBlock: number;

  public constructor(
    private readonly transferRepository: TransferRepository,
    private readonly cacheRepository: CacheRepository,
    private readonly configService: ConfigService
  ) {
    super();
    this.logger = new Logger(BridgeActiveService.name);
    this.startBlock = this.configService.get<number>("startBlock");
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
    const lastTransferBlockNumberStr = await this.cacheRepository.getValue(ONLY_ACTIVE_BLOCKNUMBER_KEY);
    const lastTransferBlockNumber = Number(lastTransferBlockNumberStr);
    this.lastTransferBlockNumber = Math.max(this.startBlock, lastTransferBlockNumber);
    const transfers = await this.fetchTransferList();
    if (transfers.length > 0) {
      await this.executePoints(transfers);
    }
  }

  public async executePoints(lastTransfers: TransferItem[]): Promise<void> {
    let latestBlockNumber = this.lastTransferBlockNumber;
    let activeList = [];
    // loop lastTransfers
    for (const transfer of lastTransfers) {
      const activeAddressKey = `${PREFIX_ACTIVE}-${transfer.address}`;
      activeList.push({
        key: activeAddressKey,
        value: "active",
      });
      latestBlockNumber = Math.max(latestBlockNumber, transfer.blockNumber);
    }
    if (activeList.length === 0) {
      this.logger.log(`no records from blockNumber ${latestBlockNumber}`);
      return;
    }
    await this.cacheRepository.addManyIgnoreConflicts(activeList);
    // update lastTransferBlockNumber
    await this.cacheRepository.setValue(ONLY_ACTIVE_BLOCKNUMBER_KEY, latestBlockNumber.toString());
    this.logger.log(
      `success for meson free bridge, latestBlockNumber is ${latestBlockNumber}, length: ${activeList.length}}`
    );
  }

  // fetch latest transfer list
  public async fetchTransferList(): Promise<TransferItem[]> {
    this.logger.log(`Fetch transfer list from blockNumber: ${this.lastTransferBlockNumber}`);
    let defalutBridgeAddress: string[] = [];
    for (const item of BridgeConfig) {
      if (item.id === "meson") {
        defalutBridgeAddress = [...defalutBridgeAddress, ...item.addresses];
      }
    }
    if (defalutBridgeAddress.length === 0) {
      this.logger.log(`No acitve bridge list.`);
    }
    let transfersDb = await this.transferRepository.getBtcTransfersByBlockNumber(
      this.lastTransferBlockNumber,
      defalutBridgeAddress,
      BTC_ADDRESS,
      BTC_AMOUNT
    );
    this.logger.log(
      `TransfersDb from blockNumber: ${this.lastTransferBlockNumber}, fetched ${transfersDb.length} transfers`
    );
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
}
