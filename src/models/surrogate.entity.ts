import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('surrogates')
@Index('IDX_SURROGATES_CODE', ['code'])
export class Surrogate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 10 })
  prefix: string;

  @Column({ type: 'varchar', length: 10, default: '' })
  suffix: string;

  @Column({ type: 'integer', default: 1 })
  next_number: number;

  @Column({ type: 'integer', default: 4 })
  padding: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Método para generar el siguiente código
  generateNext(): string {
    const paddedNumber = this.next_number.toString().padStart(this.padding, '0');
    return `${this.prefix}${this.suffix}${paddedNumber}`;
  }

  // Método para incrementar el contador
  increment(): void {
    this.next_number += 1;
  }
}