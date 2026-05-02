import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';

@Entity('backup_logs')
@Index(['organization_id'])
export class BackupLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'varchar' })
  filename: string;

  @Column({ name: 'file_size', type: 'varchar', nullable: true })
  fileSize: string;

  @Column({ type: 'boolean', default: true })
  status: boolean;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'trigger_type', type: 'varchar', default: 'manual' })
  triggerType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
