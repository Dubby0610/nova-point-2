import { Entity, Column, Unique, Index, PrimaryColumn } from "typeorm";
import { BaseEntity } from "./base.entity";

@Entity({ name: "directHoldProcessingStatus" })
@Index(["pointProcessed"])
export class DirectHoldProcessingStatus extends BaseEntity {
  @PrimaryColumn()
  blockNumber: number;

  @Column({ default: false })
  pointProcessed: boolean;
}
