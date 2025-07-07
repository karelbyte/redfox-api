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
import { WarehouseAdjustment } from './warehouse-adjustment.entity';
import { Product } from './product.entity';

@Entity('warehouse_adjustment_details')
export class WarehouseAdjustmentDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'warehouse_adjustment_id' })
  warehouseAdjustmentId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @ManyToOne(() => WarehouseAdjustment, (adjustment) => adjustment.details)
  @JoinColumn({ name: 'warehouse_adjustment_id' })
  warehouseAdjustment: WarehouseAdjustment;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
