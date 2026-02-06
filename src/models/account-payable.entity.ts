import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Provider } from './provider.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { AccountPayablePayment } from './account-payable-payment.entity';

export enum AccountPayableStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

@Entity('accounts_payable')
export class AccountPayable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
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
    enum: AccountPayableStatus,
    default: AccountPayableStatus.PENDING
  })
  status: AccountPayableStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Provider)
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @Column()
  providerId: string;

  @ManyToOne(() => PurchaseOrder, { nullable: true })
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder: PurchaseOrder;

  @Column({ nullable: true })
  purchaseOrderId: string;

  @OneToMany(() => AccountPayablePayment, payment => payment.accountPayable)
  payments: AccountPayablePayment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}