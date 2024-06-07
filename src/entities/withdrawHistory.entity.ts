import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, Index } from 'typeorm';
import { UserRedistributePoint } from './userRedistributePoint.entity';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { hexTransformer } from '../transformers/hex.transformer';

@Entity({ name: "withdrawHistory" })
@Index(["tokenAddress", "userAddress", "timestamp"])
export class WithdrawHistory extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  id: string;

  @Column({ type: "varchar", length: 128 })
  balance: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: "bytea", transformer: hexTransformer })
  tokenAddress: string;

  @ManyToOne(() => UserRedistributePoint, (userPoints) => userPoints.withdrawHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: "userPointId" })
  userPointId: UserRedistributePoint;

  @ManyToOne(() => User, (user) => user.withdrawHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: "userAddressId" })
  userAddress: User;
}