import { Entity, Column, Index, PrimaryColumn, Unique } from "typeorm";
import { hexTransformer } from "../transformers/hex.transformer";
import { decimalToNumberTransformer } from '../transformers/decimal.transformer'

@Entity({ name: "pointsOfLp" })
@Unique("unique_address_pairAddress", ["address", "pairAddress"])
export class PointsOfLp {
  @PrimaryColumn({ generated: true, type: "bigint" })
  public readonly id: number;

  @Index()
  @Column({ type: "bytea", transformer: hexTransformer })
  public readonly address: string;

  @Index()
  @Column({ type: "bytea", transformer: hexTransformer })
  public readonly pairAddress: string;

  @Column({ type: "decimal", transformer: decimalToNumberTransformer })
  public stakePoint: number;
}
