import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Un evento de Stripe que ya fue atendido. Existe solo para poder descartar
 * las entregas repetidas, que Stripe hace de forma rutinaria.
 */
@Entity('stripe_processed_events')
export class StripeProcessedEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  event_id: string;

  @Column({ type: 'varchar', length: 255 })
  event_type: string;

  @CreateDateColumn({ name: 'processed_at' })
  processed_at: Date;
}
