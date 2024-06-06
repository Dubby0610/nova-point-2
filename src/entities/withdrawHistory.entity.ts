import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserRedistributePoint } from './userRedistributePoint.entity';
import { BaseEntity } from './base.entity';

@Entity({ name: "withdrawHistory" })
export class WithdrawHistory extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 128 })
  balance: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @ManyToOne(() => UserRedistributePoint, (userPoints) => userPoints.withdrawHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: "userPointId" })
  userPointId: UserRedistributePoint;
}