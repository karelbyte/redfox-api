import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { BotProvider } from './bot-settings.entity';
import { BotConversation } from './bot-conversation.entity';

export enum BotMessageDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
}

@Entity('bot_messages')
@Index(['organization_id', 'conversation_id', 'created_at'])
export class BotMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversation_id: string;

  @ManyToOne(() => BotConversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: BotConversation;

  @Column({ type: 'varchar', length: 50 })
  provider: BotProvider;

  @Column({ type: 'varchar', length: 20 })
  direction: BotMessageDirection;

  @Column({ name: 'message_text', type: 'text' })
  message_text: string;

  @Column({ name: 'detected_intent', type: 'varchar', length: 50, nullable: true })
  detected_intent: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
