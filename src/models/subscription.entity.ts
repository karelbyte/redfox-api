import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Plan } from './plan.entity';
import { SubscriptionPayment } from './subscription-payment.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  plan_id: string;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'timestamp' })
  trial_start_date: Date;

  @Column({ type: 'timestamp' })
  trial_end_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  subscription_start_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  subscription_end_date: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  stripe_subscription_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  stripe_customer_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripe_payment_intent_id: string;

  @Column({ type: 'boolean', default: false })
  trial_reminder_sent: boolean;

  @Column({ type: 'boolean', default: false })
  renewal_reminder_sent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  current_period_start: Date;

  @Column({ type: 'timestamp', nullable: true })
  current_period_end: Date;

  @Column({ type: 'boolean', default: true })
  auto_renew: boolean;

  @Column({ type: 'timestamp', nullable: true })
  canceled_at: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  canceled_reason: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @ManyToOne(() => Organization, (organization) => organization.subscriptions)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Plan, (plan) => plan.subscriptions)
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @OneToMany(() => SubscriptionPayment, (payment) => payment.subscription)
  payments: SubscriptionPayment[];
}
