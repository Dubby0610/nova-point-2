import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
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

  public async getLastTokenPrice(priceIds: string[]): Promise<BlockTokenPrice[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const selectScript = `
      select * from "blockTokenPrice"
      join (
        select "priceId", max("blockNumber") as "blockNumber"
        from "blockTokenPrice"
        where "priceId" = ANY($1)
        group by "priceId"
      ) as "latest_blockTokenPrice"
      on "blockTokenPrice"."priceId" = "latest_blockTokenPrice"."priceId"
      and "blockTokenPrice"."blockNumber" = "latest_blockTokenPrice"."blockNumber"
      `;
    return await transactionManager.query(selectScript, [priceIds]);
  }
}
