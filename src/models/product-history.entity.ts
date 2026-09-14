import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Product } from './product.entity';
import { Warehouse } from './warehouse.entity';
import { Organization } from './organization.entity';

export enum OperationType {
  WAREHOUSE_OPENING = 'WAREHOUSE_OPENING',
  RECEPTION = 'RECEPTION',
  PURCHASE = 'PURCHASE',
  TRANSFER_IN = 'TRANSFER_IN',
  ADJUSTMENT_IN = 'ADJUSTMENT_IN',
  RETURN_IN = 'RETURN_IN',

  SALE = 'SALE',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSFER_OUT = 'TRANSFER_OUT',
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
  DETERIORATION = 'DETERIORATION',
  RETURN_OUT = 'RETURN_OUT',
  DAMAGE = 'DAMAGE',
}

@Entity('product_history')
@Index(['organization_id', 'created_at'])
@Index(['organization_id', 'product_id'])
export class ProductHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'product_id' })
  product_id: string;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'warehouse_id', nullable: true })
  warehouse_id: string | null;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse | null;

  @Column({
    type: 'enum',
    enum: OperationType,
  })
  operation_type: OperationType;

  @Column()
  operation_id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  current_stock: number;

  @Column({ nullable: true })
  batch_number: string;

  @Column({ type: 'date', nullable: true })
  expiration_date: Date;

  @CreateDateColumn()
  created_at: Date;

  isInbound(): boolean {
    return [
      OperationType.WAREHOUSE_OPENING,
      OperationType.RECEPTION,
      OperationType.PURCHASE,
      OperationType.TRANSFER_IN,
      OperationType.ADJUSTMENT_IN,
      OperationType.RETURN_IN,
    ].includes(this.operation_type);
  }

  isOutbound(): boolean {
    return [
      OperationType.SALE,
      OperationType.WITHDRAWAL,
      OperationType.TRANSFER_OUT,
      OperationType.ADJUSTMENT_OUT,
      OperationType.DETERIORATION,
      OperationType.RETURN_OUT,
      OperationType.DAMAGE,
    ].includes(this.operation_type);
  }
}
