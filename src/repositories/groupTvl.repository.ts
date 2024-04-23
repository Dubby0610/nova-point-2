import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { UnitOfWork } from "../unitOfWork";
import { GroupTvl } from "../entities";

@Injectable()
export class GroupTvlRepository extends BaseRepository<GroupTvl> {
  public constructor(unitOfWork: UnitOfWork) {
    super(GroupTvl, unitOfWork);
  }

  public async getGroupTvl(groupId: string): Promise<GroupTvl> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<GroupTvl>(GroupTvl, {
      where: { groupId },
    });
  }

  public createDefaultGroupTvl(groupId: string): GroupTvl {
    return {
      createdAt: new Date(),
      updatedAt: new Date(),
      groupId: groupId,
      tvl: 0,
    };
  }
}
