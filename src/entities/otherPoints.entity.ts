import { Entity, Column, Index, PrimaryColumn } from "typeorm";
import { hexTransformer } from "../transformers/hex.transformer";
import { BaseEntity } from "./base.entity";

@Entity({ name: "points" })
export class OtherPoint extends BaseEntity {
  @PrimaryColumn({ generated: true, type: "bigint" })
  public readonly id: number;

  @Index()
  @Column({ type: "bytea", transformer: hexTransformer })
  public readonly address: string;

  @Column("varchar")
  public type: string;

  @Column("decimal")
  public points: number;
}
