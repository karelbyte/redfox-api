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
import { Brand } from './brand.entity';
import { Category } from './category.entity';
import { Tax } from './tax.entity';
import { MeasurementUnit } from './measurement-unit.entity';

export enum ProductType {
  DIGITAL = 'digital',
  SERVICE = 'service',
  TANGIBLE = 'tangible',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ length: 255 })
  description: string;

  @Column({ length: 50, unique: true })
  sku: string;

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

  @Column({ type: 'text', nullable: true })
  images: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
