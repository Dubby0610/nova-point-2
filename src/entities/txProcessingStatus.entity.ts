import { Entity, Column, Index, PrimaryColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'txProcessingStatus' })
@Index(['adapterName', 'adapterProcessed', 'txNumberPointProcessed'])
@Index(['adapterName', 'adapterProcessed', 'txVolPointProcessed'])
@Index(['adapterName', 'adapterProcessed', 'txVolPointProcessed', 'txNumberPointProcessed'])
export class TxProcessingStatus extends BaseEntity {
    @PrimaryColumn({ unique: true })
    adapterName: string;

    @Column()
    blockNumberStart: number;

    @Column()
    blockNumberEnd: number;

    @Column({ default: false })
    adapterProcessed: boolean;

    @Column({ default: false })
    pointProcessed: boolean;
}
