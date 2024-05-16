import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { bigIntNumberTransformer } from "../transformers/bigIntNumber.transformer";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "blockAddressPointOfLp" })
export class BlockAddressPointOfLp extends BaseEntity {
  @PrimaryColumn({ type: "bigint", transformer: bigIntNumberTransformer })
  public readonly blockNumber: number;

  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly address: string;

  @Index()
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly pairAddress: string;

  @Column("decimal")
  public holdPoint: number;

  @Column("varchar")
  public type: string;
}
