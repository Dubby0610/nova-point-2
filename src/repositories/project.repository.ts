import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { Project } from "../entities";

@Injectable()
export class ProjectRepository extends BaseRepository<Project> {
  public constructor(unitOfWork: UnitOfWork) {
    super(Project, unitOfWork);
  }

  // select pairAddress from project where name = projectName
  public async getPairAddresses(projectName: string): Promise<Buffer[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const result = await transactionManager.query(
      `select "pairAddress" from project where name = $1`,
      [projectName],
    );
    return result.map((row: any) => row.pairAddress);
  }

  public async updateTvls(pairAddress: string, tvl: string): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.update(Project, { pairAddress }, { tvl });
  }
}
