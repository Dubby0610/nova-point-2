import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "addressTokenTvls" })
@Index(["address"])
export class AddressTokenTvl extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly address: string;

  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly tokenAddress: string;

  @Column("decimal", { scale: 6 })
  public balance: number;

  @Column("decimal", { scale: 6 })
  public tvl: number;
}
