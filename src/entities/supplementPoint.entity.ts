import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { hexTransformer } from "../transformers/hex.transformer";

export enum SupplementPointType {
  DirectHold = "directHold",
}

@Entity({ name: "supplementPoint" })
@Index("idx_supplementPoint_1", ["address", "batchString", "type"])
export class SupplementPoint extends BaseEntity {
  @Column({ type: "bytea", transformer: hexTransformer })
  public address: string;

  @Column({ type: "varchar", length: 20 })
  public batchString: string;

  @Column("decimal")
  public point: number;

  // directHold
  @PrimaryColumn({ type: "varchar", length: 20 })
  public type: string;
}
