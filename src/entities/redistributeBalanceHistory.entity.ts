import { Entity, Column, PrimaryColumn, Index, Unique } from "typeorm";
import { BaseEntity } from "./base.entity";
import { bigIntNumberTransformer } from "../transformers/bigIntNumber.transformer";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "redistribute_balance_history" })
@Index(["userAddress", "tokenAddress", "pairAddress"])
@Unique(["userAddress", "tokenAddress", "pairAddress", "blockNumber"])
@Index(["blockNumber"])
export class RedistributeBalanceHistory extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public userAddress: string;

  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public tokenAddress: string;

  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public pairAddress: string;

  @Column({ type: "varchar", length: 50 })
  public balance: string;

  @PrimaryColumn({ type: "bigint", transformer: bigIntNumberTransformer })
  public blockNumber: number;
}
