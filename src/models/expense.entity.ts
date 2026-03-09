import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ExpenseCategory } from './expense-category.entity';
import { User } from './user.entity';
import { Provider } from './provider.entity';
import { Organization } from './organization.entity';

export enum ExpenseStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum ExpenseRecurrence {
  NONE = 'none',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ length: 100 })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  expenseDate: Date;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: ExpenseStatus,
    default: ExpenseStatus.PENDING,
  })
  status: ExpenseStatus;

  @Column({
    type: 'enum',
    enum: ExpenseRecurrence,
    default: ExpenseRecurrence.NONE,
  })
  recurrence: ExpenseRecurrence;

  @Column({ length: 255, nullable: true })
  receiptPath: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Provider, { nullable: true })
  @JoinColumn({ name: 'providerId' })
  provider: Provider;

  @Column({ type: 'uuid', nullable: true })
  providerId: string;

  @Column({ length: 50, nullable: true })
  reference: string;

  @ManyToOne(() => ExpenseCategory, (category) => category.expenses)
  @JoinColumn({ name: 'categoryId' })
  category: ExpenseCategory;

  @Column({ type: 'uuid' })
  categoryId: string;

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
