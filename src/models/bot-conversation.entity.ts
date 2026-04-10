import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { BotProvider } from './bot-settings.entity';
import { Client } from './client.entity';
import { Quotation } from './quotation.entity';
import { BotMessage } from './bot-message.entity';

export enum BotConversationStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  HANDOFF = 'handoff',
  EXPIRED = 'expired',
}

export enum BotConversationStep {
  CAPTURE_CLIENT_NAME = 'capture_client_name',
  CAPTURE_CLIENT_EMAIL = 'capture_client_email',
  CAPTURE_PRODUCT_QUERY = 'capture_product_query',
  SELECT_PRODUCT = 'select_product',
  CAPTURE_QUANTITY = 'capture_quantity',
  REVIEW = 'review',
  COMPLETED = 'completed',
}

export interface BotConversationCandidateProduct {
  id: string;
  name: string;
  code: string;
  sku?: string | null;
  price: number;
  stock: number;
}

export interface BotConversationDraftItem {
  productId: string;
  name: string;
  code: string;
  sku?: string | null;
  quantity: number;
  price: number;
  stock: number;
}

export interface BotConversationContext {
  clientName?: string | null;
  pendingProductQuery?: string | null;
  selectedCandidates?: BotConversationCandidateProduct[] | null;
  selectedProduct?: BotConversationCandidateProduct | null;
  items: BotConversationDraftItem[];
}

@Entity('bot_conversations')
@Index(['organization_id', 'provider', 'customer_phone', 'status'])
export class BotConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'varchar', length: 50 })
  provider: BotProvider;

  @Column({ type: 'varchar', length: 50, default: 'whatsapp' })
  channel: string;

  @Column({ name: 'customer_phone', type: 'varchar', length: 40 })
  customer_phone: string;

  @Column({
    name: 'customer_jid',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  customer_jid: string | null;

  @Column({
    name: 'customer_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  customer_name: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: BotConversationStatus.ACTIVE,
  })
  status: BotConversationStatus;

  @Column({
    name: 'current_step',
    type: 'varchar',
    length: 50,
    default: BotConversationStep.CAPTURE_PRODUCT_QUERY,
  })
  current_step: BotConversationStep;

  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  client_id: string | null;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'client_id' })
  client: Client | null;

  @Column({ name: 'quotation_id', type: 'uuid', nullable: true })
  quotation_id: string | null;

  @ManyToOne(() => Quotation, { nullable: true })
  @JoinColumn({ name: 'quotation_id' })
  quotation: Quotation | null;

  @Column({ name: 'context_json', type: 'simple-json', nullable: true })
  context_json: BotConversationContext | null;

  @Column({ name: 'last_message_at', type: 'timestamp', nullable: true })
  last_message_at: Date | null;

  @OneToMany(() => BotMessage, (message) => message.conversation)
  messages: BotMessage[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
