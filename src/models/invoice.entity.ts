import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { Withdrawal } from './withdrawal.entity';
import { InvoiceDetail } from './invoice-detail.entity';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer',
  CHECK = 'check',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ type: 'date' })
  date: Date;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Withdrawal, { nullable: true })
  @JoinColumn({ name: 'withdrawal_id' })
  withdrawal?: Withdrawal;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_amount: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  @Column({ length: 36, nullable: true })
  cfdi_uuid: string;

  @Column({ length: 100, nullable: true })
  facturapi_id: string;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  payment_method: PaymentMethod;

  @Column({ length: 100, nullable: true })
  payment_conditions: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => InvoiceDetail, (detail) => detail.invoice)
  details: InvoiceDetail[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
