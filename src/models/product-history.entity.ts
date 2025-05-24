import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { Warehouse } from './warehouse.entity';

export enum OperationType {
  ENTRY = 'ENTRY',
  WITHDRAWAL = 'WITHDRAWAL',
}

@Entity('product_history')
export class ProductHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Warehouse, { nullable: false })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({
    type: 'varchar',
    length: 20,
    enum: OperationType,
  })
  operation_type: OperationType;

  @Column()
  operation_id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  current_stock: number;

  @CreateDateColumn()
  created_at: Date;
} 