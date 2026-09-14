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
  OneToOne,
} from 'typeorm';
import { User } from './user.entity';
import { Plan } from './plan.entity';
import { Subscription } from './subscription.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  name: string;

  @Column({ length: 255, unique: true })
  slug: string;

  @Column({ default: true })
  status: boolean;

  @Column({ type: 'uuid', nullable: true })
  plan_id: string;

  @Column({ type: 'uuid', nullable: true })
  subscription_id: string;

  @Column({ length: 20, nullable: true })
  referrer_code: string;

  /**
   * País de la organización en ISO 3166-1 alpha-2. Determina qué packs de
   * certificación se ofrecen y con qué catálogos arranca (ver COUNTRIES).
   * Una organización pertenece a un solo país.
   */
  @Column({ length: 10, nullable: true })
  country: string;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @ManyToOne(() => Plan, { nullable: true })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @OneToOne(() => Subscription, { nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;

  @OneToMany(() => Subscription, (subscription) => subscription.organization)
  subscriptions: Subscription[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date;
}
