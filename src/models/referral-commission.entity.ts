import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Referrer } from './referrer.entity';
import { Organization } from './organization.entity';

@Entity('referral_commissions')
export class ReferralCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  referrer_id: string;

  @ManyToOne(() => Referrer, (r) => r.commissions)
  @JoinColumn({ name: 'referrer_id' })
  referrer: Referrer;

  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'uuid', nullable: true })
  subscription_payment_id: string;

  @Column({ length: 255, nullable: true })
  plan_name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  plan_price: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  commission_rate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commission_amount: number;

  @Column({ type: 'enum', enum: ['pending', 'approved', 'paid'], default: 'pending' })
  status: 'pending' | 'approved' | 'paid';

  @Column({ type: 'timestamp', nullable: true })
  paid_at: Date;

  @Column({ type: 'text', nullable: true })
  payment_notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
