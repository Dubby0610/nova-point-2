import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "project" })
@Index(["name"])
export class Project extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly pairAddress: string;

  @Column({ type: "varchar", length: 50 })
  public readonly name: string;

  @Column({ type: "varchar", length: 100 })
  public readonly tvl: string;
}
