import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AccountPayable } from './account-payable.entity';
import { User } from './user.entity';
import { PaymentMethod } from './account-receivable-payment.entity';
import { Organization } from './organization.entity';

@Entity('account_payable_payments')
export class AccountPayablePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  paymentDate: Date;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  paymentMethod: PaymentMethod;

  @Column({ length: 100, nullable: true })
  reference: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => AccountPayable, (accountPayable) => accountPayable.payments)
  @JoinColumn({ name: 'accountPayableId' })
  accountPayable: AccountPayable;

  @Column({ name: 'accountPayableId', type: 'uuid' })
  accountPayableId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  createdByUser: User;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
