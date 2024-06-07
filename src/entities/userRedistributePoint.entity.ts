import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, PrimaryColumn, Index, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { WithdrawHistory } from './withdrawHistory.entity';
import { hexTransformer } from '../transformers/hex.transformer';
import { BaseEntity } from './base.entity';

@Entity({ name: "userRedistributePoint" })
@Index(["userAddress", "tokenAddress"], { unique: true })
export class UserRedistributePoint extends BaseEntity {
  @PrimaryColumn({ type: "varchar", length: 128 })
  id: string;

  @Column({ type: "bytea", transformer: hexTransformer })
  tokenAddress: string;

  @Column({ type: "varchar", length: 128 })
  balance: string;

  @Column('decimal', { precision: 30, scale: 18 })
  exchangeRate: number

  @Column({ type: "varchar", length: 128 })
  pointWeight: string;

  @Column('decimal', { precision: 30, scale: 18 })
  pointWeightPercentage: number;

  @ManyToOne(() => User, (user) => user.points, { onDelete: 'CASCADE' })
  @JoinColumn({ name: "userAddress" })
  userAddress: User;

  @OneToMany(() => WithdrawHistory, (withdrawHistory) => withdrawHistory.userPointId, {
    cascade: true,
  })
  withdrawHistory: WithdrawHistory[];

}






