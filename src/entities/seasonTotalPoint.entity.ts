import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "seasonTotalPoint" })
@Index("IDX_seasonTotalPoint_1", ["season", "pairAddress", "userAddress", "type"])
@Index("IDX_seasonTotalPoint_2", ["userAddress"])
export class SeasonTotalPoint extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public userAddress: string;

  // 0x000..000 is direct point
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public pairAddress: string;

  @Column({ type: "varchar", length: 100 })
  public userName: string;

  @Column("decimal")
  public point: number;

  // directHold, tvl, txNum, txVol, bridgeTxNum, referral, other
  @PrimaryColumn({ type: "varchar", length: 20 })
  public type: string;

  @PrimaryColumn("int")
  public season: number;
}
