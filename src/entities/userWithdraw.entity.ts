import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { hexTransformer } from '../transformers/hex.transformer';

@Entity({ name: "userWithdraw" })
@Index(["userAddress", "tokenAddress", "timestamp"], { unique: true })
export class UserWithdraw extends BaseEntity {
  @ManyToOne(() => User, (user) => user.holdings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: "userAddress" })
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  userAddress: string;

  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  tokenAddress: string;

  @PrimaryColumn({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: "varchar", length: 128 })
  balance: string;
}