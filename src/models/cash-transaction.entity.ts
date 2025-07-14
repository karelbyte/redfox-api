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
import { CashRegister } from './cash-register.entity';

export enum CashTransactionType {
  SALE = 'sale',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
  WITHDRAWAL = 'withdrawal',
  DEPOSIT = 'deposit',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  MIXED = 'mixed',
}

@Entity('cash_transactions')
export class CashTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cash_register_id' })
  cashRegisterId: string;

  @Column({
    type: 'enum',
    enum: CashTransactionType,
  })
  type: CashTransactionType;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  amount: number;

  @Column({ length: 255 })
  description: string;

  @Column({ length: 100 })
  reference: string;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  paymentMethod: PaymentMethod;

  @Column({ name: 'sale_id', nullable: true })
  saleId: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @ManyToOne(() => CashRegister, (cashRegister) => cashRegister.transactions)
  @JoinColumn({ name: 'cash_register_id' })
  cashRegister: CashRegister;
} 