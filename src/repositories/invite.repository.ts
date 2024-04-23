import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { ReferralUnitOfWork } from "../unitOfWork";
import { Invite } from "../entities";
import { hexTransformer } from "../transformers/hex.transformer";

@Injectable()
export class InviteRepository extends BaseRepository<Invite> {
  public constructor(unitOfWork: ReferralUnitOfWork) {
    super(Invite, unitOfWork);
  }

  public async getInvite(address: string): Promise<Invite> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<Invite>(Invite, {
      where: { address },
    });
  }

  public async getAllGroups(): Promise<string[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const ret = await transactionManager.query(`SELECT DISTINCT("groupId") FROM invites`);
    return ret.map((r: any) => r.groupId);
  }

  public async getGroupMembers(groupId: string): Promise<string[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const members = await transactionManager.query(`SELECT address FROM invites WHERE "groupId" = $1`, [groupId]);
    return members.map((row: any) => hexTransformer.from(row.address));
  }

  public async getGroupMembersByBlock(groupId: string, blockNumber: number): Promise<string[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const members = await transactionManager.query(
      `SELECT address FROM invites WHERE "groupId" = $1 AND active = true AND "blockNumber" <= $2`,
      [groupId, blockNumber]
    );
    return members.map((row: any) => hexTransformer.from(row.address));
  }
}
