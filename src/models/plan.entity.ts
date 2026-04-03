import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { Subscription } from './subscription.entity';

const featuresTransformer = {
  to: (value: string[]) => (value && value.length > 0 ? JSON.stringify(value) : null),
  from: (value: string | null) => {
    if (!value) return [];
    try { return JSON.parse(value); } catch { return []; }
  },
};
@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  version: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 3, default: 'MXN' })
  currency: string;

  @Column({ type: 'varchar', length: 50 })
  billing_period: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  stripe_product_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  stripe_price_id: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true, transformer: featuresTransformer })
  features: string[];

  @Column({ type: 'boolean', default: false })
  is_default: boolean;

  @Column({ type: 'boolean', default: true })
  is_public: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @OneToMany(() => Subscription, (subscription) => subscription.plan)
  subscriptions: Subscription[];
}
