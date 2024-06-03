import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { bigIntNumberTransformer } from "../transformers/bigIntNumber.transformer";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "redistribute_balance" })
@Index(["userAddress", "tokenAddress", "pairAddress", "blockNumber"])
export class RedistributeBalance extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public userAddress: string;

  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public tokenAddress: string;

  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public pairAddress: string;

  @Column({ type: "varchar", length: 50 })
  public percentage: string;

  @Column({ type: "varchar", length: 50 })
  public balance: string;

  @Column({ type: "varchar", length: 50 })
  public accumulateBalance: string;

  @PrimaryColumn({ type: "bigint", transformer: bigIntNumberTransformer })
  public blockNumber: number;
}