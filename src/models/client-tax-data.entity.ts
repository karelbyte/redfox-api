import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';

@Entity('client_tax_data')
export class ClientTaxData {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    client_id: string;

    @ManyToOne(() => Client, (client) => client.taxData)
    @JoinColumn({ name: 'client_id' })
    client: Client;

    @Column({ length: 100 })
    tax_document: string;

    @Column({ length: 10, nullable: true })
    tax_system: string;

    @Column({ length: 255, nullable: true })
    tax_name: string;

    @Column({ length: 10, nullable: true })
    default_invoice_use: string;

    @Column({ default: false })
    is_main: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @DeleteDateColumn()
    deleted_at: Date;
}
