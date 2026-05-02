import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

@Entity('email_configs')
export class EmailConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'varchar', length: 50, default: 'smtp' })
  provider: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  apiKey: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  host: string;

  @Column({ type: 'int', nullable: true })
  port: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string;

  @Column({ type: 'varchar', length: 255 })
  fromEmail: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fromName: string;

  @Column({ type: 'boolean', default: false })
  secure: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
