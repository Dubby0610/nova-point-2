import { Entity, Column, PrimaryColumn } from "typeorm";
import { BaseEntity } from "./base.entity";
import { bigIntNumberTransformer } from "../transformers/bigIntNumber.transformer";

@Entity({ name: "blockGroupTvl" })
export class BlockGroupTvl extends BaseEntity {
  @PrimaryColumn({ type: "bigint", transformer: bigIntNumberTransformer })
  public readonly blockNumber: number;

  @PrimaryColumn({ type: "varchar" })
  public readonly groupId: string;

  @Column("decimal")
  public readonly tvl: number;
}
