import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Organization } from './organization.entity';

export enum WebhookEvent {
  SALE_CREATED = 'sale_created',
  INVOICE_CREATED = 'invoice_created',
  RECEPTION_CREATED = 'reception_created',
  PURCHASE_ORDER_APPROVED = 'purchase_order_approved',
  SHIPMENT_STATUS_CHANGED = 'shipment_status_changed',
  CLIENT_CREATED = 'client_created',
  PRODUCT_CREATED = 'product_created',
}

export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FAILED = 'failed',
}

@Entity('webhooks')
@Index(['organization_id', 'event'])
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'enum', enum: WebhookEvent })
  event: WebhookEvent;

  @Column({ type: 'enum', enum: WebhookStatus, default: WebhookStatus.ACTIVE })
  status: WebhookStatus;

  @Column({ type: 'json', nullable: true })
  headers: Record<string, string>;

  @Column({ type: 'int', default: 3 })
  retry_count: number;

  @Column({ type: 'int', default: 5000 })
  timeout_ms: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_triggered_at: Date;

  @Column({ type: 'int', default: 0 })
  failure_count: number;

  @Column({ type: 'text', nullable: true })
  last_error: string | null;
}