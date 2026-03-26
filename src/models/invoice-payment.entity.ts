import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Invoice } from './invoice.entity';
import { Organization } from './organization.entity';

export enum InvoicePaymentStatus {
  PENDING = 'pending',
  STAMPED = 'stamped',
  CANCELLED = 'cancelled',
}

@Entity('invoice_payments')
@Index(['organization_id', 'invoice_id'])
export class InvoicePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'invoice_id', type: 'uuid' })
  invoice_id: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ type: 'integer' })
  payment_number: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  payment_date: Date;

  @Column({ length: 5 })
  payment_form: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balance_before: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balance_after: number;

  @Column({
    type: 'enum',
    enum: InvoicePaymentStatus,
    default: InvoicePaymentStatus.PENDING,
  })
  status: InvoicePaymentStatus;

  @Column({ length: 100, nullable: true })
  pack_complement_id: string;

  @Column({ length: 36, nullable: true })
  cfdi_complement_uuid: string;

  @Column({ type: 'json', nullable: true })
  pack_complement_response: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
