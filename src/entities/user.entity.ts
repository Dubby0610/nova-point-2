import { Entity, PrimaryColumn, OneToMany } from 'typeorm';
import { UserRedistributePoint } from './userRedistributePoint.entity';
import { BaseEntity } from './base.entity';
import { hexTransformer } from '../transformers/hex.transformer';

@Entity()
export class User extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  userAddress: string;

  @OneToMany(() => UserRedistributePoint, (point) => point.userAddress, {
    cascade: true,
  })
  points: UserRedistributePoint[];
}
