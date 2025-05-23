import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Withdrawal } from './withdrawal.entity';
import { Product } from './product.entity';

@Entity('withdrawal_details')
export class WithdrawalDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Withdrawal, (withdrawal) => withdrawal.details)
  @JoinColumn({ name: 'withdrawal_id' })
  withdrawal: Withdrawal;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  quantity: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
} 