import { Injectable, Logger } from "@nestjs/common";
import { Worker } from "../common/worker";
import BigNumber from "bignumber.js";
import { Cron } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { BoosterService } from "../booster/booster.service";
import {
  PointsOfLpRepository,
  BlockAddressPointOfLpRepository,
  AddressFirstDepositRepository,
  CacheRepository,
  TxDataOfPointsRepository,
} from "../repositories";
import { PointsOfLp, AddressFirstDeposit } from "src/entities";
import { TransactionDataOfPointsDto } from "../repositories/txDataOfPoints.repository";

const volLastBlockNumberKey = "volLastBlockNumber";
const transactionDataBlockNumberKey = "transactionDataBlockNumber";

@Injectable()
export class TxVolPointService extends Worker {
  private readonly logger: Logger;
  private readonly type: string = "txVol";
  private readonly projectNames: string[] = [];

  public constructor(
    private readonly cacheRepository: CacheRepository,
    private readonly transactionDataOfPointsRepository: TxDataOfPointsRepository,
    private readonly pointsOfLpRepository: PointsOfLpRepository,
    private readonly blockAddressPointOfLpRepository: BlockAddressPointOfLpRepository,
    private readonly addressFirstDepositRepository: AddressFirstDepositRepository,
    private readonly boosterService: BoosterService,
    private readonly configService: ConfigService
  ) {
    super();
    this.logger = new Logger(TxVolPointService.name);
    const projectTxBooster = this.configService.get('projectTxBooster')
    this.projectNames = Object.keys(projectTxBooster[this.type])
  }

  @Cron("0 2,10,18 * * *")
  protected async runProcess(): Promise<void> {
    this.logger.log(`${TxVolPointService.name} start...`);
    try {
      const lastBlockNumberStr = await this.cacheRepository.getValue(volLastBlockNumberKey);
      const lastBlockNumber = lastBlockNumberStr ? Number(lastBlockNumberStr) : 0;
      const endBlockNumberStr = await this.cacheRepository.getValue(transactionDataBlockNumberKey);
      const endBlockNumber = endBlockNumberStr ? Number(endBlockNumberStr) : 0;
      this.logger.log(`${TxVolPointService.name} points from ${lastBlockNumber} to ${endBlockNumber}`);
      await this.handleCalculatePoint(lastBlockNumber, endBlockNumber);
      await this.cacheRepository.setValue(volLastBlockNumberKey, endBlockNumberStr);
      this.logger.log(`Finish ${TxVolPointService.name} end at ${endBlockNumberStr}`);
    } catch (error) {
      this.logger.error("Failed to calculate hold point", error.stack);
    }
  }

  async handleCalculatePoint(startBlock: number, endBlock: number) {
    if (this.projectNames.length == 0) {
      this.logger.log(`None project calculate ${this.type} points.`);
      return;
    }

    const volDetails: TransactionDataOfPointsDto[] = await this.transactionDataOfPointsRepository.getListByBlockNumber(
      startBlock,
      endBlock,
      this.projectNames
    );
    if (volDetails.length === 0) {
      this.logger.error(`volume details is empty, from ${startBlock} to ${endBlock}`);
      return;
    }
    // get all addresses
    let addresses: string[] = [];
    for (let i = 0; i < volDetails.length; i++) {
      const address = volDetails[i].userAddress;
      if (!addresses.includes(address)) {
        addresses.push(address);
      }
    }
    // get all first deposit time
    const addressFirstDepositList: AddressFirstDeposit[] =
      await this.addressFirstDepositRepository.getAllAddressesFirstDeposits(addresses);
    this.logger.log(`Address first deposit map size: ${addressFirstDepositList.length}`);
    const addressFirstDepositMap: { [address: string]: AddressFirstDeposit } = {};
    for (let i = 0; i < addressFirstDepositList.length; i++) {
      const item = addressFirstDepositList[i];
      const tmpAddress = item.address.toLocaleLowerCase();
      if (tmpAddress) {
        addressFirstDepositMap[tmpAddress] = item;
      }
    }
    // get all point of lp by addresses
    let addressPointMap = new Map();
    let blockAddressPointMap = new Map();
    const addressPointList: PointsOfLp[] = await this.pointsOfLpRepository.getPointByAddresses(addresses);
    this.logger.log(`Address point map size: ${addressPointList.length}`);
    for (let i = 0; i < addressPointList.length; i++) {
      const item = addressPointList[i];
      const tmpAddress = item.address.toLocaleLowerCase();
      const tmpPairAddress = item.pairAddress.toLocaleLowerCase();
      if (tmpAddress && tmpPairAddress) {
        const key = `${tmpAddress}-${tmpPairAddress}`;
        addressPointMap.set(key, item);
      }
    }

    const alreadyCalculatedPointsKey =
      await this.blockAddressPointOfLpRepository.getUniquePointKeyByBlockRange(startBlock, endBlock, 'txVol');
    for (let i = 0; i < volDetails.length; i++) {
      const item = volDetails[i];
      const itemBlockNumber = item.blockNumber;
      const itemProjectName = item.projectName;
      const itemTimestamp = item.timestamp.getTime();
      const itemUserAddress = item.userAddress;
      const itemPoolAddress = item.contractAddress;
      if (alreadyCalculatedPointsKey.has(`${itemUserAddress}-${itemPoolAddress}`)) {
        continue;
      }

      const itemVolume = new BigNumber(item.quantity.toString())
        .dividedBy(BigNumber(10 ** item.decimals))
        .multipliedBy(BigNumber(item.price));
      const basePoint = itemVolume;
      // group booster
      const projectBooster = this.boosterService.getProjectBooster(itemProjectName, this.type);
      // loyalty booster
      let loyaltyBooster = new BigNumber(1);
      const addressFirstDeposit = addressFirstDepositMap[itemUserAddress];
      if (addressFirstDeposit && addressFirstDeposit.firstDepositTime) {
        const firstDepositTime = addressFirstDeposit.firstDepositTime;
        loyaltyBooster = this.boosterService.getLoyaltyBooster(itemTimestamp, firstDepositTime.getTime());
      } else {
        this.logger.log(
          `get address first deposit empty, address is : ${itemUserAddress}, fistDeposit is : ${JSON.stringify(addressFirstDeposit)}`
        );
      }
      const newHoldPoint = basePoint.multipliedBy(projectBooster).multipliedBy(loyaltyBooster)

      const fromBlockAddressPointKey = `${itemUserAddress}-${itemPoolAddress}-${itemBlockNumber}-${this.type}`;
      if (!blockAddressPointMap.has(fromBlockAddressPointKey)) {
        this.logger.log(`get block address point empty, key is : ${fromBlockAddressPointKey}`);
        blockAddressPointMap.set(fromBlockAddressPointKey, {
          blockNumber: itemBlockNumber,
          address: itemUserAddress,
          pairAddress: itemPoolAddress,
          holdPoint: newHoldPoint.toNumber(),
          type: this.type,
        });
      } else {
        const fromBlockAddressPoint = blockAddressPointMap.get(fromBlockAddressPointKey);
        fromBlockAddressPoint.holdPoint = Number(fromBlockAddressPoint.holdPoint) + newHoldPoint.toNumber();
      }

      const fromAddressPointKey = `${itemUserAddress}-${itemPoolAddress}`;
      if (!addressPointMap.has(fromAddressPointKey)) {
        this.logger.log(`get address point empty, key is : ${fromAddressPointKey}`);
        addressPointMap.set(fromAddressPointKey, {
          id: 0,
          address: itemUserAddress,
          pairAddress: itemPoolAddress,
          stakePoint: newHoldPoint.toNumber(),
        });
      } else {
        const fromAddressPoint = addressPointMap.get(fromAddressPointKey);
        fromAddressPoint.stakePoint = Number(fromAddressPoint.stakePoint) + newHoldPoint.toNumber();
      }
    }

    const blockAddressPointArr = Array.from(blockAddressPointMap.values());
    const addressPointArr = Array.from(addressPointMap.values());
    await this.blockAddressPointOfLpRepository.addManyIgnoreConflicts(blockAddressPointArr);
    this.logger.log(`Finish ${TxVolPointService.name} blockAddressPointArr, length: ${blockAddressPointArr.length}`);
    await this.pointsOfLpRepository.addManyOrUpdate(addressPointArr, ["stakePoint"], ["address", "pairAddress"]);
    this.logger.log(`Finish ${TxVolPointService.name} addressPointArr, length: ${addressPointArr.length}`);
  }
}
