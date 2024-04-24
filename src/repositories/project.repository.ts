import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { Project } from "../entities";

@Injectable()
export class ProjectRepository extends BaseRepository<Project> {
  public constructor(unitOfWork: UnitOfWork) {
    super(Project, unitOfWork);
  }
}
