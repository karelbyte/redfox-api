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

  @Column({ type: 'boolean', default: false })
  include_year: boolean;

  @Column({ type: 'varchar', length: 10, default: '-' })
  year_separator: string;

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
    
    if (this.include_year) {
      const currentYear = new Date().getFullYear();
      return `${this.prefix}${this.year_separator}${currentYear}${this.year_separator}${paddedNumber}`;
    }
    
    return `${this.prefix}${this.suffix}${paddedNumber}`;
  }

  // Método para incrementar el contador
  increment(): void {
    this.next_number += 1;
  }

  // Método para resetear el contador al cambio de año (si aplica)
  resetForNewYear(): void {
    if (this.include_year) {
      this.next_number = 1;
    }
  }
}