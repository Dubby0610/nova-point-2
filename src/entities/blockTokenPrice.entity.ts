import { Entity, Column, PrimaryColumn } from "typeorm";
import { BaseEntity } from "./base.entity";
import { bigIntNumberTransformer } from "../transformers/bigIntNumber.transformer";

@Entity({ name: "blockTokenPrice" })
export class BlockTokenPrice extends BaseEntity {
  @PrimaryColumn({ type: "bigint", transformer: bigIntNumberTransformer })
  public readonly blockNumber: number;

  @PrimaryColumn({ type: "varchar" })
  public readonly priceId: string;

  @Column({ type: "double precision" })
  public readonly usdPrice: number;
}
