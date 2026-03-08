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
import { ClientAddress } from './client-address.entity';
import { ClientTaxData } from './client-tax-data.entity';
import { ClientCredit } from './client-credit.entity';
import { Organization } from './organization.entity';

@Entity('clients')
@Index(['organization_id', 'code'], { unique: true })
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ length: 50 })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255 })
  description: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ default: true })
  status: boolean;

  @Column({ length: 255, nullable: true })
  pack_client_id: string;

  @Column({ type: 'json', nullable: true })
  pack_client_response: any;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @OneToMany(() => ClientAddress, (address) => address.client, { cascade: true })
  addresses: ClientAddress[];

  @OneToMany(() => ClientTaxData, (taxData) => taxData.client, { cascade: true })
  taxData: ClientTaxData[];

  @OneToOne(() => ClientCredit, (credit) => credit.client, { cascade: true })
  credit: ClientCredit;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
