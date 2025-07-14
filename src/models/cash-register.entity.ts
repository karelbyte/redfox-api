import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { CashTransaction } from './cash-transaction.entity';

export enum CashRegisterStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('cash_registers')
export class CashRegister {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    name: 'initial_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  initialAmount: number;

  @Column({
    name: 'current_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  currentAmount: number;

  @Column({
    type: 'enum',
    enum: CashRegisterStatus,
    default: CashRegisterStatus.CLOSED,
  })
  status: CashRegisterStatus;

  @Column({ name: 'opened_at', nullable: true })
  openedAt: Date;

  @Column({ name: 'closed_at', nullable: true })
  closedAt: Date;

  @Column({ name: 'opened_by' })
  openedBy: string;

  @Column({ name: 'closed_by', nullable: true })
  closedBy: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @OneToMany(() => CashTransaction, (transaction) => transaction.cashRegister)
  transactions: CashTransaction[];
} 