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

export enum WithdrawalType {
  POS = 'POS',
  WITHDRAWAL = 'WITHDRAWAL',
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

  @Column({ default: true })
  status: boolean;

  @OneToMany(() => WithdrawalDetail, (detail) => detail.withdrawal)
  details: WithdrawalDetail[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
