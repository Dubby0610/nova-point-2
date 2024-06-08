import { Entity, Column, ManyToOne, PrimaryColumn, Index, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { hexTransformer } from '../transformers/hex.transformer';
import { BaseEntity } from './base.entity';

@Entity({ name: "userHolding" })
@Index(["userAddress", "tokenAddress"], { unique: true })
export class UserHolding extends BaseEntity {

  @ManyToOne(() => User, (user) => user.holdings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: "userAddress" })
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  userAddress: string;

  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  tokenAddress: string;

  @Column({ type: "varchar", length: 128 })
  balance: string;

  @Column({ type: "varchar", length: 128 })
  pointWeight: string;

  @Column('decimal', { precision: 30, scale: 18 })
  pointWeightPercentage: number;
}






