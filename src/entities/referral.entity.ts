import { Entity, Column, Index, PrimaryColumn } from "typeorm";
import { hexTransformer } from "../transformers/hex.transformer";
import { BaseEntity } from "./base.entity";

@Entity({ name: "referrers" })
export class Referral extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly address: string;

  @Index()
  @Column({ type: "bytea", transformer: hexTransformer })
  public readonly referrer: string;
}
