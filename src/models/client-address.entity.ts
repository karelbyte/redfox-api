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
import { Client } from './client.entity';

export enum AddressType {
  FISCAL = 'FISCAL',
  SHIPPING = 'SHIPPING',
  BILLING = 'BILLING',
  OTHER = 'OTHER',
}

@Entity('client_addresses')
export class ClientAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  client_id: string;

  @ManyToOne(() => Client, (client) => client.addresses)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({
    type: 'varchar',
    length: 20,
    default: AddressType.OTHER,
  })
  type: AddressType;

  @Column({ length: 200, nullable: true })
  street: string;

  @Column({ length: 20, nullable: true })
  exterior_number: string;

  @Column({ length: 20, nullable: true })
  interior_number: string;

  @Column({ length: 100, nullable: true })
  neighborhood: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  municipality: string;

  @Column({ length: 10, nullable: true })
  zip_code: string;

  @Column({ length: 100, nullable: true })
  state: string;

  @Column({ length: 3, nullable: true, default: 'MEX' })
  country: string;

  @Column({ default: false })
  is_main: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
