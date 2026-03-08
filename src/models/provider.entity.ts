import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Reception } from './reception.entity';
import { ProviderAddress } from './provider-address.entity';
import { ProviderTaxData } from './provider-tax-data.entity';
import { ProviderCredit } from './provider-credit.entity';
import { Organization } from './organization.entity';

@Entity('providers')
@Index(['organization_id', 'code'], { unique: true })
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ length: 50 })
  code: string;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({ length: 100, nullable: true })
  name: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ default: true })
  status: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @OneToMany(() => Reception, (reception) => reception.provider)
  receptions: Reception[];

  @OneToMany(() => ProviderAddress, (address) => address.provider, { cascade: true })
  addresses: ProviderAddress[];

  @OneToMany(() => ProviderTaxData, (tax) => tax.provider, { cascade: true })
  taxData: ProviderTaxData[];

  @OneToOne(() => ProviderCredit, (credit) => credit.provider, { cascade: true })
  credit: ProviderCredit;
}
