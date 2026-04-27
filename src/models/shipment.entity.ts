import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Withdrawal } from './withdrawal.entity';
import { ClientAddress } from './client-address.entity';
import { User } from './user.entity';

export enum ShipmentStatus {
  PENDING = 'PENDING',
  PACKING = 'PACKING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
  FAILED = 'FAILED',
}

@Entity('shipments')
@Index(['organization_id'])
@Index(['withdrawal_id'])
@Index(['status'])
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'withdrawal_id', type: 'uuid' })
  withdrawal_id: string;

  @ManyToOne(() => Withdrawal, (withdrawal) => withdrawal.shipments)
  @JoinColumn({ name: 'withdrawal_id' })
  withdrawal: Withdrawal;

  @Column({ name: 'shipping_address_id', type: 'uuid', nullable: true })
  shipping_address_id: string;

  @ManyToOne(() => ClientAddress, { nullable: true })
  @JoinColumn({ name: 'shipping_address_id' })
  shippingAddress: ClientAddress;

  @Column({ length: 100 })
  carrier: string;

  @Column({ length: 100, nullable: true })
  tracking_number: string;

  @Column({ length: 500, nullable: true })
  tracking_url: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  shipping_cost: number;

  @Column({
    type: 'enum',
    enum: ShipmentStatus,
    default: ShipmentStatus.PENDING,
  })
  status: ShipmentStatus;

  @Column({ type: 'timestamp', nullable: true })
  estimated_delivery_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  shipped_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  delivered_at: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  user: User | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
