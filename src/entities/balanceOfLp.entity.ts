import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { bigIntNumberTransformer } from "../transformers/bigIntNumber.transformer";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "balancesOfLp" })
@Index(["blockNumber", "balance"])
export class BalanceOfLp extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly address: string;

  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly tokenAddress: string;

  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly pairAddress: string;

  @PrimaryColumn({ type: "bigint", transformer: bigIntNumberTransformer })
  public readonly blockNumber: number;

  @Column({ type: "varchar", length: 50 })
  public readonly balance: string;
}
