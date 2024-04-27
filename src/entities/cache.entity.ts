import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "./base.entity";

@Entity({ name: "cache" })
export class Cache extends BaseEntity {
  @PrimaryColumn({ type: "varchar", length: 50 })
  public readonly key: string;

  @Column({ type: "varchar", length: 100 })
  public readonly value: string;
}
