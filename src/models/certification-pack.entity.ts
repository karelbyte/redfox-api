import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { CertificationPackType } from '../constants/certification-packs.constant';
import { Organization } from './organization.entity';
import { CertificationPackEmitter } from './certification-pack-emitter.entity';

@Entity('certification_packs')
export class CertificationPack {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'enum', enum: CertificationPackType })
  type: CertificationPackType;

  @Column({ type: 'json' })
  config: Record<string, any>;

  @Column({ default: false })
  is_active: boolean;

  @Column({ default: false })
  is_default: boolean;

  @OneToMany(() => CertificationPackEmitter, (emitter) => emitter.pack)
  emitters: CertificationPackEmitter[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
