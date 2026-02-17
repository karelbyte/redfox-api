import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { WithdrawalDetail } from './withdrawal-detail.entity';
import { CashTransaction } from './cash-transaction.entity';
import { Invoice } from './invoice.entity';

export enum WithdrawalType {
  POS = 'POS',
  WITHDRAWAL = 'WITHDRAWAL',
}

export enum WithdrawalStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  RETURNED = 'RETURNED',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  CREDIT = 'credit',
}

@Entity('withdrawals')
export class Withdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 200 })
  destination: string;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({
    type: 'enum',
    enum: WithdrawalType,
    default: WithdrawalType.WITHDRAWAL,
  })
  type: WithdrawalType;

  @ManyToOne(() => CashTransaction, { nullable: true })
  @JoinColumn({ name: 'cash_transaction_id' })
  cashTransaction: CashTransaction;

  @Column({ name: 'cash_transaction_id', nullable: true })
  cashTransactionId: string;

  @Column({
    type: 'enum',
    enum: WithdrawalStatus,
    default: WithdrawalStatus.OPEN,
  })
  status: WithdrawalStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
    name: 'payment_method',
  })
  paymentMethod: PaymentMethod;

  @Column('varchar', { name: 'pack_receipt_id', length: 100, nullable: true })
  pack_receipt_id: string | null;

  @Column({ name: 'pack_receipt_response', type: 'json', nullable: true })
  pack_receipt_response: Record<string, unknown> | null;

  @ManyToOne(() => Invoice, { nullable: true })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice | null;

  @Column({ name: 'invoice_id', nullable: true })
  invoiceId: string | null;

  @OneToMany(() => WithdrawalDetail, (detail) => detail.withdrawal)
  details: WithdrawalDetail[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
