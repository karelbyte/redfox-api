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
import { Provider } from './provider.entity';
import { Currency } from './currency.entity';

@Entity('provider_credits')
export class ProviderCredit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id' })
  provider_id: string;

  @OneToOne(() => Provider, (provider) => provider.credit, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

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
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date;
}
