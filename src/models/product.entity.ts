import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Brand } from './brand.entity';
import { Category } from './category.entity';
import { Tax } from './tax.entity';
import { MeasurementUnit } from './measurement-unit.entity';
import { ProductPrice } from './product-price.entity';
import { Organization } from './organization.entity';

export enum ProductType {
  DIGITAL = 'digital',
  SERVICE = 'service',
  TANGIBLE = 'tangible',
}

export enum InventoryStrategy {
  FIFO = 'fifo',
  FEFO = 'fefo',
  AVERAGE = 'average',
}

@Entity('products')
@Index(['organization_id', 'slug'], { unique: true })
@Index(['organization_id', 'sku'], { unique: true })
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100 })
  slug: string;

  @Column({ length: 255 })
  description: string;

  @Column({ length: 50 })
  sku: string;

  @Column({ length: 20 })
  code: string;

  @Column({ length: 100, nullable: true })
  barcode: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  weight: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  width: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  height: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  length: number;

  @ManyToOne(() => Brand, { nullable: true })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => Tax, { nullable: true })
  @JoinColumn({ name: 'tax_id' })
  tax: Tax;

  @ManyToOne(() => MeasurementUnit, { nullable: false })
  @JoinColumn({ name: 'measurement_unit_id' })
  measurement_unit: MeasurementUnit;

  @Column({ default: true })
  is_active: boolean;

  @Column({
    type: 'enum',
    enum: ProductType,
    default: ProductType.TANGIBLE,
  })
  type: ProductType;

  @Column({
    type: 'enum',
    enum: InventoryStrategy,
    default: InventoryStrategy.AVERAGE,
  })
  inventory_strategy: InventoryStrategy;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  base_price: number;

  @OneToMany(() => ProductPrice, (price) => price.product, { cascade: true })
  prices: ProductPrice[];

  @Column({ type: 'text', nullable: true })
  images: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
