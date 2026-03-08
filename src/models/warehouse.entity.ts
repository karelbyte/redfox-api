import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Inventory } from './inventory.entity';
import { Currency } from './currency.entity';
import { Organization } from './organization.entity';

@Entity('warehouses')
@Index(['organization_id', 'code'], { unique: true })
export class Warehouse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ length: 50 })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 200 })
  address: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ default: true })
  status: boolean;

  @Column({ name: 'is_open', default: true })
  isOpen: boolean;

  @Column({ name: 'currency_id' })
  currencyId: string;

  @ManyToOne(() => Currency)
  @JoinColumn({ name: 'currency_id' })
  currency: Currency;

  @OneToMany(() => Inventory, (inventory) => inventory.warehouse)
  inventory: Inventory[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
