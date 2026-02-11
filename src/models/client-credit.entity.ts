import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    OneToOne,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import { Client } from './client.entity';
import { Currency } from './currency.entity';

@Entity('client_credits')
export class ClientCredit {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'client_id' })
    client_id: string;

    @OneToOne(() => Client, (client) => client.credit, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
    client: Client;

    @Column({
        name: 'credit_limit',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => parseFloat(value),
        },
    })
    credit_limit: number;

    @Column({ name: 'credit_days', type: 'integer', default: 0 })
    credit_days: number;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    is_active: boolean;

    @Column({ name: 'currency_id', nullable: true })
    currency_id: string;

    @ManyToOne(() => Currency, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'currency_id' })
    currency: Currency;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt: Date;
}
