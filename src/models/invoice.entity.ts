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
import { User } from './user.entity';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING_CFDI = 'PENDING_CFDI',
  SENT = 'SENT',
  FAILED_CFDI = 'FAILED_CFDI',
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

export enum CardType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

@Entity('invoices')
@Index(['organization_id', 'code'], { unique: true })
@Index(['organization_id', 'series', 'number'], { unique: true })
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id!: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ length: 50 })
  code!: string;

  @Column({ type: 'date' })
  date!: Date;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client!: Client;

  @ManyToOne(() => Withdrawal, { nullable: true })
  @JoinColumn({ name: 'withdrawal_id' })
  withdrawal?: Withdrawal;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax_amount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_amount!: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status!: InvoiceStatus;

  @Column({ type: 'varchar', length: 36, nullable: true })
  cfdi_uuid!: string | null;

  /** ID interno del comprobante en el PAC activo (Facturapi, SAT, etc.). Escalable para cualquier pack. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  pack_invoice_id!: string | null;

  @Column({ type: 'json', nullable: true })
  pack_invoice_response!: Record<string, unknown> | null;

  @Column({ type: 'json', nullable: true })
  payload_send!: Record<string, unknown> | null;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  payment_method!: PaymentMethod;

  @Column({
    type: 'enum',
    enum: CardType,
    nullable: true,
  })
  card_type!: CardType | null;

  @Column({ length: 100, nullable: true })
  payment_conditions!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  emitter_id!: string | null;

  /**
   * Comprobante SUNAT asignado a la factura (tipo, serie y correlativo).
   * Nulo para los packs que no numeran por serie, como el CFDI mexicano.
   * El correlativo se reserva en `document_series` y se conserva aquí para
   * que un reintento de emisión reutilice el mismo número en vez de dejar un
   * hueco en la numeración.
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  document_type!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  series!: string | null;

  @Column({ type: 'int', nullable: true })
  number!: number | null;

  /**
   * Moneda del comprobante en ISO 4217. Nulo deja que el pack aplique su
   * moneda por defecto.
   */
  @Column({ type: 'varchar', length: 3, nullable: true })
  currency_code!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  user: User | null;

  @OneToMany(() => InvoiceDetail, (detail) => detail.invoice)
  details!: InvoiceDetail[];

  @OneToMany(() => InvoicePayment, (payment) => payment.invoice)
  payments!: InvoicePayment[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @DeleteDateColumn()
  deleted_at!: Date;
}
