import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Warehouse } from './warehouse.entity';
import { WarehouseAdjustmentDetail } from './warehouse-adjustment-detail.entity';
import { Organization } from './organization.entity';

@Entity('warehouse_adjustments')
@Index(['organization_id', 'code'], { unique: true })
export class WarehouseAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ length: 50 })
  code: string;

  @Column({ name: 'source_warehouse_id' })
  sourceWarehouseId: string;

  @Column({ name: 'target_warehouse_id' })
  targetWarehouseId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  status: boolean;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'source_warehouse_id' })
  sourceWarehouse: Warehouse;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'target_warehouse_id' })
  targetWarehouse: Warehouse;

  @OneToMany(
    () => WarehouseAdjustmentDetail,
    (detail) => detail.warehouseAdjustment,
  )
  details: WarehouseAdjustmentDetail[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
