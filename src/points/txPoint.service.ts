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
  TxDataOfPointsRepository,
  TxProcessingRepository,
} from "../repositories";
import { AddressFirstDeposit, TransactionDataOfPoints, TxProcessingStatus } from "src/entities";
import { UnitOfWork } from "src/unitOfWork";


@Injectable()
export class TxPointService extends Worker {
  private readonly logger: Logger;
  private readonly projectTxBooster: unknown
  private readonly txNum: string = "txNum";
  private readonly txVol: string = "txVol";

  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly txDataOfPointsRepository: TxDataOfPointsRepository,
    private readonly pointsOfLpRepository: PointsOfLpRepository,
    private readonly blockAddressPointOfLpRepository: BlockAddressPointOfLpRepository,
    private readonly addressFirstDepositRepository: AddressFirstDepositRepository,
    private readonly boosterService: BoosterService,
    private readonly configService: ConfigService,
    private readonly txProcessingRepository: TxProcessingRepository

  ) {
    super();
    this.logger = new Logger(TxPointService.name);
    this.projectTxBooster = this.configService.get('projectTxBooster')
  }

  @Cron("0 2,10,18 * * *")
  protected async runProcess(): Promise<void> {
    this.logger.log(`${TxPointService.name} start...`);
    try {
      const pendingProcessed = await this.txProcessingRepository.find({ where: { pointProcessed: false } })
      pendingProcessed.forEach(async status => {
        this.calculateTxNumPoint(status)
      })

      // update todo
    } catch (error) {
      this.logger.error("Failed to calculate hold point", error.stack);
    }
  }

  calTxNumPoint(itemProjectName: string, data: TransactionDataOfPoints, addressFirstDepositMap: Map<string, AddressFirstDeposit>) {
    const { userAddress, timestamp } = data
    const addressFirstDeposit = addressFirstDepositMap.get(userAddress);

    const basePoint = new BigNumber(1);
    // project booster
    const projectBooster = this.boosterService.getProjectBooster(itemProjectName, 'txNum');
    // loyalty booster
    const loyaltyBooster = this.boosterService.getLoyaltyBooster(timestamp.getTime(), addressFirstDeposit?.firstDepositTime?.getTime());

    const newHoldPoint = basePoint.multipliedBy(projectBooster).multipliedBy(loyaltyBooster)

    return newHoldPoint.toNumber()
  }

  calTxVolPoint(itemProjectName: string, data: TransactionDataOfPoints, addressFirstDepositMap: Map<string, AddressFirstDeposit>) {
    const { userAddress, quantity, decimals, price, timestamp } = data
    const addressFirstDeposit = addressFirstDepositMap.get(userAddress);

    const basePoint = new BigNumber(quantity.toString()).dividedBy(BigNumber(10 ** decimals)).multipliedBy(BigNumber(price));
    // project booster
    const projectBooster = this.boosterService.getProjectBooster(itemProjectName, 'txVol');
    // loyalty booster
    const loyaltyBooster = this.boosterService.getLoyaltyBooster(timestamp.getTime(), addressFirstDeposit?.firstDepositTime?.getTime());

    const newHoldPoint = basePoint.multipliedBy(projectBooster).multipliedBy(loyaltyBooster)

    return newHoldPoint.toNumber()
  }

  async calculateTxNumPoint(status: TxProcessingStatus) {
    const { blockNumberStart, blockNumberEnd, adapterName } = status
    this.logger.log(`txNum points from ${blockNumberStart} to ${blockNumberEnd}`);

    const txData = await this.txDataOfPointsRepository.getTxsByBlockNumber(
      blockNumberStart,
      blockNumberEnd,
    );
    if (txData.length === 0) {
      this.logger.error(`volume details is empty, from lastBlockNumber: ${blockNumberStart}`);
      return;
    }

    // get all addresses
    const addresses = [...new Set(txData.map(item => item.userAddress))]
    // get first deposit map by userAddress
    const addressFirstDepositMap =
      await this.addressFirstDepositRepository.getFirstDepositMapForAddresses(addresses);
    // get point map by userAddress_poolAddress key
    const addressPointMap = await this.pointsOfLpRepository.getPointMapForAddresses(addresses);

    let blockAddressPointMap = new Map<string, {
      blockNumber: number,
      address: string,
      pairAddress: string,
      holdPoint: number,
      type: string
    }>();
    for (let i = 0; i < txData.length; i++) {
      const { blockNumber, userAddress, contractAddress } = txData[i];
      const pointUniqueKey = `${userAddress}-${contractAddress}`;
      if (!addressPointMap.has(pointUniqueKey)) {
        addressPointMap.set(pointUniqueKey, {
          id: 0,
          address: userAddress,
          pairAddress: contractAddress,
          stakePoint: 0,
        });
      }


      if (this.projectTxBooster[this.txVol][adapterName]) {
        const txVolPoint = this.calTxVolPoint(adapterName, txData[i], addressFirstDepositMap)
        // update tx point
        addressPointMap.get(pointUniqueKey).stakePoint += txVolPoint

        const uniqueKey = `${userAddress}-${contractAddress}-${blockNumber}-${this.txVol}`;
        if (!blockAddressPointMap.has(uniqueKey)) {
          this.logger.log(`get block address point empty, key is : ${uniqueKey}`);
          blockAddressPointMap.set(uniqueKey, {
            blockNumber: blockNumber,
            address: userAddress,
            pairAddress: contractAddress,
            holdPoint: txVolPoint,
            type: this.txVol,
          });
        } else {
          blockAddressPointMap.get(uniqueKey).holdPoint += txVolPoint;
        }
      }

      if (this.projectTxBooster[this.txNum][adapterName]) {
        const txNumPoint = this.calTxNumPoint(adapterName, txData[i], addressFirstDepositMap)
        // update tx point
        addressPointMap.get(pointUniqueKey).stakePoint += txNumPoint

        const uniqueKey = `${userAddress}-${contractAddress}-${blockNumber}-${this.txVol}`;
        if (!blockAddressPointMap.has(uniqueKey)) {
          this.logger.log(`get block address point empty, key is : ${uniqueKey}`);
          blockAddressPointMap.set(uniqueKey, {
            blockNumber: blockNumber,
            address: userAddress,
            pairAddress: contractAddress,
            holdPoint: txNumPoint,
            type: this.txVol,
          });
        } else {
          blockAddressPointMap.get(uniqueKey).holdPoint += txNumPoint;
        }

      }
    }

    this.unitOfWork.useTransaction(async () => {
      const blockAddressPointArr = Array.from(blockAddressPointMap.values());
      const addressPointArr = Array.from(addressPointMap.values());
      await this.blockAddressPointOfLpRepository.addManyIgnoreConflicts(blockAddressPointArr);
      this.logger.log(`Finish txNum blockAddressPointArr, length: ${blockAddressPointArr.length}`);
      await this.pointsOfLpRepository.addManyOrUpdate(addressPointArr, ["stakePoint"], ["address", "pairAddress"]);
      this.logger.log(`Finish txNum addressPointArr, length: ${addressPointArr.length}`);
      this.txProcessingRepository.updateTxStatus(adapterName, { pointProcessed: true })
    })
  }



}
