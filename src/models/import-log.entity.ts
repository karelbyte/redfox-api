import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

export enum ImportLogStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ImportLogType {
  CLIENT = 'client',
  PRODUCT = 'product',
  PROVIDER = 'provider',
}

@Entity('import_logs')
export class ImportLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'user_id', type: 'uuid' })
  user_id: string;

  @Column({ type: 'enum', enum: ImportLogType })
  type: ImportLogType;

  @Column({ type: 'enum', enum: ImportLogStatus, default: ImportLogStatus.PENDING })
  status: ImportLogStatus;

  @Column({ type: 'int', default: 0 })
  total_rows: number;

  @Column({ type: 'int', default: 0 })
  created_count: number;

  @Column({ type: 'int', default: 0 })
  skipped_count: number;

  @Column({ type: 'int', default: 0 })
  error_count: number;

  @Column({ type: 'int', default: 0 })
  pack_synced: number;

  @Column({ type: 'int', default: 0 })
  pack_failed: number;

  @Column({ type: 'text', nullable: true })
  summary: string;

  // JSON array de { row, code/sku, name, reason }
  @Column({ type: 'json', nullable: true })
  errors: any[];

  // JSON array de { code/sku, name, reason }
  @Column({ type: 'json', nullable: true })
  pack_warnings: any[];

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
