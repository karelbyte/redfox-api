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
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { Brand } from './brand.entity';
import { Category } from './category.entity';
import { Tax } from './tax.entity';
import { MeasurementUnit } from './measurement-unit.entity';
import { ProductPrice } from './product-price.entity';
import { ProductTax } from './product-tax.entity';
import { Organization } from './organization.entity';
import { Currency } from './currency.entity';

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

  @OneToMany(() => ProductTax, (productTax) => productTax.product, {
    cascade: true,
    eager: true,
  })
  productTaxes: ProductTax[];

  @ManyToMany(() => Tax, { cascade: true })
  @JoinTable({
    name: 'product_taxes',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tax_id', referencedColumnName: 'id' },
  })
  taxes: Tax[];

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

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_stock: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  min_stock: number;

  @OneToMany(() => ProductPrice, (price) => price.product, { cascade: true })
  prices: ProductPrice[];

  @Column({ type: 'text', nullable: true })
  images: string;

  @Column({ name: 'currency_id', type: 'uuid', nullable: true })
  currency_id: string | null;

  @ManyToOne(() => Currency, { nullable: true })
  @JoinColumn({ name: 'currency_id' })
  currency: Currency | null;

  @Column({ length: 255, nullable: true })
  product_pack_id: string;

  @Column({ name: 'pack_payload', type: 'jsonb', nullable: true })
  pack_payload: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
