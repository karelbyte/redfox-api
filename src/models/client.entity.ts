import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100 })
  tax_document: string;

  @Column({ length: 255 })
  description: string;

  @Column({ length: 200, nullable: true })
  address_street: string;

  @Column({ length: 20, nullable: true })
  address_exterior: string;

  @Column({ length: 20, nullable: true })
  address_interior: string;

  @Column({ length: 100, nullable: true })
  address_neighborhood: string;

  @Column({ length: 100, nullable: true })
  address_city: string;

  @Column({ length: 100, nullable: true })
  address_municipality: string;

  @Column({ length: 10, nullable: true })
  address_zip: string;

  @Column({ length: 100, nullable: true })
  address_state: string;

  @Column({ length: 3, nullable: true, default: 'MEX' })
  address_country: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ length: 10, nullable: true })
  tax_system: string;

  @Column({ length: 10, nullable: true })
  default_invoice_use: string;

  @Column({ default: true })
  status: boolean;

  @Column({ length: 255, nullable: true })
  pack_client_id: string;

  @Column({ type: 'json', nullable: true })
  pack_client_response: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
