import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CertificationPack } from './certification-pack.entity';

@Entity('certification_pack_emitters')
export class CertificationPackEmitter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  pack_id: string;

  @ManyToOne(() => CertificationPack, (pack) => pack.emitters)
  @JoinColumn({ name: 'pack_id' })
  pack: CertificationPack;

  @Column()
  emitter: string;

  @Column()
  name: string;

  @Column({ default: false })
  fav: boolean;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at?: Date;
}
