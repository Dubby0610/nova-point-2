import { Entity, Column, Unique, Index, PrimaryColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'tvlProcessingStatus' })
@Index(['adapterName', 'adapterProcessed'])
@Index(['adapterName', 'adapterProcessed', 'pointProcessed'])
export class TvlProcessingStatus extends BaseEntity {
    @PrimaryColumn()
    adapterName: string;

    @PrimaryColumn()
    blockNumber: number;

    @Column({ default: false })
    adapterProcessed: boolean;

    @Column({ default: false })
    pointProcessed: boolean;
}
