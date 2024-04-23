import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "addressFirstDeposits" })
@Index(["address"])
export class AddressFirstDeposit {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly address: string;

  @Column({ type: "timestamp" })
  public readonly firstDepositTime: Date;
}
