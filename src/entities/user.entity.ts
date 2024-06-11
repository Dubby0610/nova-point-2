import { Entity, PrimaryColumn, OneToMany } from 'typeorm';
import { UserHolding } from './userHolding.entity';
import { BaseEntity } from './base.entity';
import { hexTransformer } from '../transformers/hex.transformer';
import { UserWithdraw } from './userWithdraw.entity';
import { UserStaked } from './userStaked.entity';

@Entity()
export class User extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  userAddress: string;

  @OneToMany(() => UserHolding, (point) => point.userAddress, {
    cascade: true,
  })
  holdings: UserHolding[];

  @OneToMany(() => UserStaked, (point) => point.userAddress, {
    cascade: true,
  })
  stakes: UserStaked[];

  @OneToMany(() => UserWithdraw, (withdraw) => withdraw.userAddress, {
    cascade: true,
  })
  withdraws: UserWithdraw[];
}
