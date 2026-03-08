import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { Client } from './client.entity';
import { Invoice } from './invoice.entity';
import { AccountReceivablePayment } from './account-receivable-payment.entity';
import { Organization } from './organization.entity';

export enum AccountReceivableStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

@Entity('accounts_receivable')
@Index(['organization_id', 'referenceNumber'], { unique: true })
export class AccountReceivable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ length: 50 })
  referenceNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  remainingAmount: number;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: AccountReceivableStatus,
    default: AccountReceivableStatus.PENDING
  })
  status: AccountReceivableStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column()
  clientId: string;

  @ManyToOne(() => Invoice, { nullable: true })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column({ nullable: true })
  invoiceId: string;

  @OneToMany(() => AccountReceivablePayment, payment => payment.accountReceivable)
  payments: AccountReceivablePayment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}