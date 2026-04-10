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
  Index,
} from 'typeorm';
import { Client } from './client.entity';
import { Withdrawal } from './withdrawal.entity';
import { InvoiceDetail } from './invoice-detail.entity';
import { InvoicePayment } from './invoice-payment.entity';
import { Organization } from './organization.entity';

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
  CREDIT = 'credit',
}

@Entity('invoices')
@Index(['organization_id', 'code'], { unique: true })
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ length: 50 })
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

  /** ID interno del comprobante en el PAC activo (Facturapi, SAT, etc.). Escalable para cualquier pack. */
  @Column({ length: 100, nullable: true })
  pack_invoice_id: string;

  @Column({ type: 'json', nullable: true })
  pack_invoice_response: Record<string, unknown> | null;

  @Column({ type: 'json', nullable: true })
  payload_send: Record<string, unknown> | null;

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

  @OneToMany(() => InvoicePayment, (payment) => payment.invoice)
  payments: InvoicePayment[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
