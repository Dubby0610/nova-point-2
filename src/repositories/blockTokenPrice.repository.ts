import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { UnitOfWork } from "../unitOfWork";
import { BlockTokenPrice } from "../entities/blockTokenPrice.entity";

@Injectable()
export class BlockTokenPriceRepository extends BaseRepository<BlockTokenPrice> {
  public constructor(unitOfWork: UnitOfWork) {
    super(BlockTokenPrice, unitOfWork);
  }

  public async getBlockTokenPrice(blockNumber: number, priceId: string): Promise<BlockTokenPrice> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<BlockTokenPrice>(BlockTokenPrice, {
      where: { blockNumber, priceId },
    });
  }
}
