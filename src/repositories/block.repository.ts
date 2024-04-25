import { Injectable } from "@nestjs/common";
import { FindOptionsRelations, FindOptionsSelect, FindOptionsWhere } from "typeorm";
import { Block } from "../entities";
import { UnitOfWork } from "../unitOfWork";

@Injectable()
export class BlockRepository {
  public constructor(private readonly unitOfWork: UnitOfWork) {}

  public async getLastBlock({
    where = {},
    select,
    relations,
  }: {
    where?: FindOptionsWhere<Block>;
    select?: FindOptionsSelect<Block>;
    relations?: FindOptionsRelations<Block>;
  } = {}): Promise<Block> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<Block>(Block, {
      where,
      select,
      order: { number: "DESC" },
      relations,
    });
  }

  public async getLastBlockNumber(): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const lastBlock = await transactionManager
      .createQueryBuilder(Block, "block")
      .select("block.number")
      .orderBy("block.number", "DESC")
      .limit(1)
      .getOne();
    return lastBlock?.number || 0;
  }

  public async getLastExecutedBlockNumber(): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const lastExecutedBlock = await transactionManager
      .createQueryBuilder(Block, "block")
      .select("block.number")
      .innerJoin("block.batch", "batch")
      .where("batch.executedAt IS NOT NULL")
      .orderBy("block.number", "DESC")
      .limit(1)
      .getOne();
    return lastExecutedBlock?.number || 0;
  }

  public async getNextHoldPointStatisticalBlock(nextStatisticalTs: Date): Promise<Block> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager
      .createQueryBuilder(Block, "block")
      .select(["block.number", "block.timestamp"])
      .where("block.timestamp > :nextStatisticalTs", { nextStatisticalTs })
      .orderBy("block.number", "ASC")
      .limit(1)
      .getOne();
  }

  public async getBlocksByBlockNumber(blockNumber: number, limit: number): Promise<Block[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager
      .createQueryBuilder(Block, "block")
      .select(["block.number", "block.timestamp"])
      .where("block.number > :blockNumber", { blockNumber })
      .orderBy("block.number", "ASC")
      .limit(limit)
      .getMany();
  }

  // public async delete(where: FindOptionsWhere<Block>): Promise<void> {
  //   const transactionManager = this.unitOfWork.getTransactionManager();
  //   await transactionManager.delete<Block>(Block, where);
  // }
}
