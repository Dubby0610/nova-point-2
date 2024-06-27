import { Entity, Column, Index, PrimaryColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'txProcessingStatus' })
@Index(['adapterProcessed', 'pointProcessed'])
export class TxProcessingStatus extends BaseEntity {
    @PrimaryColumn({ unique: true })
    projectName: string;

    @Column()
    blockNumberStart: number;

    @Column()
    blockNumberEnd: number;

    @Column({ default: false })
    adapterProcessed: boolean;

    @Column({ default: false })
    pointProcessed: boolean;
}
