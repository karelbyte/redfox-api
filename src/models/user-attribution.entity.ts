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
import { User } from './user.entity';

export enum AttributionType {
  WAREHOUSE = 'WAREHOUSE',
  STORE = 'STORE',
  CATEGORY = 'CATEGORY',
  CASH_REGISTER = 'CASH_REGISTER',
}

@Entity('user_attributions')
@Index(['userId', 'attributionType', 'resourceId'], { unique: true })
export class UserAttribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: AttributionType,
    name: 'attribution_type',
  })
  attributionType: AttributionType;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @Column({ name: 'resource_type', length: 50 })
  resourceType: string;

  @Column({ type: 'jsonb', nullable: true })
  permissions: Record<string, boolean>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
