import { Entity, Column, Index, PrimaryColumn } from "typeorm";
import { hexTransformer } from "../transformers/hex.transformer";
import { bigIntNumberTransformer } from "../transformers/bigIntNumber.transformer";
import { BaseEntity } from "./base.entity";

@Entity({ name: "invites" })
export class Invite extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  public readonly address: string;

  @Column("boolean")
  public readonly active: boolean;

  @Column({ type: "varchar", nullable: true })
  public readonly code?: string;

  @Index()
  @Column({ type: "bigint", transformer: bigIntNumberTransformer, nullable: true })
  public readonly blockNumber?: number;

  @Column("varchar")
  public readonly twitterName: string;

  @Column("varchar")
  public readonly twitterHandler: string;

  @Index()
  @Column("varchar")
  public readonly groupId: string;
}
