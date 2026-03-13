import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { Tax } from './tax.entity';

@Entity('product_taxes')
export class ProductTax {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  product_id: string;

  @ManyToOne(() => Product, (product) => product.productTaxes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'tax_id', type: 'uuid' })
  tax_id: string;

  @ManyToOne(() => Tax, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tax_id' })
  tax: Tax;

  @CreateDateColumn()
  created_at: Date;
}
