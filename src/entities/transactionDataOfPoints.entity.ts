import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { bigIntNumberTransformer } from "../transformers/bigIntNumber.transformer";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "transactionDataOfPoints" })
@Index(["userAddress", "txHash", "nonce"])
export class TransactionDataOfPoints extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly userAddress: string;

  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly contractAddress: string;

  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly tokenAddress: string;

  @PrimaryColumn({ type: "smallint" })
  public readonly decimals: number;

  @Column({ type: "varchar", length: 100 })
  public readonly price: string;

  @Column({ type: "bigint", transformer: bigIntNumberTransformer })
  public readonly quantity: string;

  @Column({ type: "varchar", length: 100 })
  public readonly nonce: string;

  @Column({ type: "timestamp" })
  public readonly timestamp: Date;

  @Column({ type: "varchar", length: 100 })
  public readonly txHash: string;

  @PrimaryColumn({ type: "bigint", transformer: bigIntNumberTransformer })
  public readonly blockNumber: number;
}
