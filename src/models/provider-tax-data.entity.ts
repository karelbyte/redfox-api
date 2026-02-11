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
import { Provider } from './provider.entity';

@Entity('provider_tax_data')
export class ProviderTaxData {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    provider_id: string;

    @ManyToOne(() => Provider, (provider) => provider.taxData)
    @JoinColumn({ name: 'provider_id' })
    provider: Provider;

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
