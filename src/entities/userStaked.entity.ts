import { Entity, Column, ManyToOne, PrimaryColumn, Index, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { hexTransformer } from '../transformers/hex.transformer';
import { BaseEntity } from './base.entity';

@Entity({ name: "userStaked" })
@Index(["userAddress", "tokenAddress", "poolAddress"], { unique: true })
export class UserStaked extends BaseEntity {

  @ManyToOne(() => User, (user) => user.holdings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: "userAddress" })
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  userAddress: string;

  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  tokenAddress: string;

  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  poolAddress: string;

  @Column({ type: "varchar", length: 128 })
  balance: string;

  @Column({ type: "varchar", length: 128 })
  pointWeight: string;

  @Column('decimal', { precision: 30, scale: 18 })
  pointWeightPercentage: number;
}