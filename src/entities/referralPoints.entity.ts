import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "referralPoints" })
export class ReferralPoints {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly address: string;

  @Index()
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly pairAddress: string;

  @Column("decimal")
  public point: number;
}
