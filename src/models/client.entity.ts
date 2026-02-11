import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ClientAddress } from './client-address.entity';
import { ClientTaxData } from './client-tax-data.entity';
import { ClientCredit } from './client-credit.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
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
