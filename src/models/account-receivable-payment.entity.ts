import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AccountReceivable } from './account-receivable.entity';
import { User } from './user.entity';

export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  CHECK = 'check',
  OTHER = 'other',
}

@Entity('account_receivable_payments')
export class AccountReceivablePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  paymentDate: Date;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  paymentMethod: PaymentMethod;

  @Column({ length: 100, nullable: true })
  reference: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(
    () => AccountReceivable,
    (accountReceivable) => accountReceivable.payments,
  )
  @JoinColumn({ name: 'accountReceivableId' })
  accountReceivable: AccountReceivable;

  @Column({ name: 'accountReceivableId', type: 'uuid' })
  accountReceivableId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  createdByUser: User;

  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
