import { Entity, Column, PrimaryColumn } from "typeorm";
import { BaseEntity } from "./base.entity";
import { bigIntNumberTransformer } from "../transformers/bigIntNumber.transformer";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "blockAddressPoint" })
export class BlockAddressPoint extends BaseEntity {
  @PrimaryColumn({ type: "bigint", transformer: bigIntNumberTransformer })
  public readonly blockNumber: number;

  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly address: string;

  @Column("decimal")
  public depositPoint: number;

  @Column("decimal")
  public holdPoint: number;

  @Column("decimal")
  public refPoint: number;
}
