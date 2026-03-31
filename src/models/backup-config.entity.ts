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

@Entity('backup_configs')
@Index(['organization_id'])
export class BackupConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'is_auto_enabled', default: false })
  isAutoEnabled: boolean;

  @Column({ type: 'varchar', length: 10, default: 'daily' })
  frequency: string;

  @Column({
    name: 'scheduled_time',
    type: 'varchar',
    length: 5,
    default: '00:00',
  })
  scheduledTime: string;

  @Column({ name: 'retention_count', type: 'int', default: 7 })
  retentionCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
