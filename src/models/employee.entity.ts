import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { Department } from './department.entity';
import { Position } from './position.entity';

@Entity('employees')
@Index(['organization_id', 'employee_code'], { unique: true })
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ length: 20 })
  employee_code: string;

  @Column({ length: 100 })
  first_name: string;

  @Column({ length: 100 })
  last_name: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ type: 'date', nullable: true })
  birth_date: Date;

  @Column({ length: 20, nullable: true })
  gender: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  department_id: string;

  @ManyToOne(() => Department, (dept) => dept.employees, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'position_id', type: 'uuid', nullable: true })
  position_id: string;

  @ManyToOne(() => Position, (pos) => pos.employees, { nullable: true })
  @JoinColumn({ name: 'position_id' })
  position: Position;

  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  manager_id: string;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager: Employee;

  @Column({ type: 'date' })
  hire_date: Date;

  @Column({ type: 'date', nullable: true })
  termination_date: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  salary: number;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  is_active: boolean;

  @Column({ length: 100, nullable: true })
  emergency_contact_name: string;

  @Column({ length: 20, nullable: true })
  emergency_contact_phone: string;

  @Column({ length: 255, nullable: true })
  emergency_contact_relation: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  user_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  get fullName(): string {
    return `${this.first_name} ${this.last_name}`;
  }

  get age(): number {
    if (!this.birth_date) return 0;
    const today = new Date();
    const birthDate = new Date(this.birth_date);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}
