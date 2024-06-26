import { Entity, Column, PrimaryColumn } from "typeorm";
import { BaseEntity } from "./base.entity";
import { hexTransformer } from "../transformers/hex.transformer";

@Entity({ name: "invites" })
export class Invites extends BaseEntity {
  @PrimaryColumn({ type: "bytea", transformer: hexTransformer })
  address: string;

  @Column({ type: "varchar", length: 10 })
  code: string;

  @Column({ type: "varchar", length: 128 })
  userName: string;
}
