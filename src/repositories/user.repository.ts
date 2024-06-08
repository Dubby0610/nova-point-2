import { Injectable } from "@nestjs/common";
import { LrtUnitOfWork as UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { User } from "../entities";

@Injectable()
export class UserRepository extends BaseRepository<User> {
    public constructor(unitOfWork: UnitOfWork) {
        super(User, unitOfWork);
    }
}
