import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Expense } from './expense.entity';
import { Organization } from './organization.entity';

@Entity('expense_categories')
@Index(['organization_id', 'name'], { unique: true })
export class ExpenseCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 7, default: '#6B7280' })
  color: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Expense, expense => expense.category)
  expenses: Expense[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}