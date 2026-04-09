import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';

export enum BotProvider {
  BAILEYS = 'baileys',
  WHATSAPP_CLOUD = 'whatsapp_cloud',
}

export enum BotConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  QR_READY = 'qr_ready',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export enum BotTone {
  PROFESSIONAL = 'professional',
  FRIENDLY = 'friendly',
  DIRECT = 'direct',
}

export interface CloudProviderConfig {
  appId?: string | null;
  businessAccountId?: string | null;
  phoneNumberId?: string | null;
  accessToken?: string | null;
  verifyToken?: string | null;
}

export interface BotConnectionMeta {
  phoneNumber?: string | null;
  jid?: string | null;
  displayName?: string | null;
  providerLabel?: string | null;
}

@Entity('bot_settings')
@Index(['organization_id'], { unique: true })
export class BotSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'varchar', length: 50, default: BotProvider.BAILEYS })
  provider: BotProvider;

  @Column({
    name: 'connection_status',
    type: 'varchar',
    length: 50,
    default: BotConnectionStatus.DISCONNECTED,
  })
  connection_status: BotConnectionStatus;

  @Column({ name: 'is_enabled', type: 'boolean', default: false })
  is_enabled: boolean;

  @Column({ name: 'auto_reply_enabled', type: 'boolean', default: true })
  auto_reply_enabled: boolean;

  @Column({ name: 'quotation_mode_enabled', type: 'boolean', default: true })
  quotation_mode_enabled: boolean;

  @Column({
    name: 'assistant_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  assistant_name: string | null;

  @Column({
    name: 'default_language',
    type: 'varchar',
    length: 10,
    default: 'es',
  })
  default_language: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: BotTone.PROFESSIONAL,
  })
  tone: BotTone;

  @Column({ name: 'welcome_message', type: 'text', nullable: true })
  welcome_message: string | null;

  @Column({ name: 'handoff_message', type: 'text', nullable: true })
  handoff_message: string | null;

  @Column({ name: 'quotation_prompt', type: 'text', nullable: true })
  quotation_prompt: string | null;

  @Column({ name: 'cloud_config', type: 'simple-json', nullable: true })
  cloud_config: CloudProviderConfig | null;

  @Column({ name: 'connection_meta', type: 'simple-json', nullable: true })
  connection_meta: BotConnectionMeta | null;

  @Column({ name: 'qr_code', type: 'text', nullable: true })
  qr_code: string | null;

  @Column({ name: 'qr_expires_at', type: 'timestamp', nullable: true })
  qr_expires_at: Date | null;

  @Column({ name: 'last_connected_at', type: 'timestamp', nullable: true })
  last_connected_at: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  last_error: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
