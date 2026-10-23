import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';

/**
 * Tipo de comprobante. Los códigos del catálogo 01 de SUNAT se resuelven a
 * partir de aquí (factura = 01, boleta = 03, etc.).
 */
export enum DocumentType {
  FACTURA = 'FACTURA',
  BOLETA = 'BOLETA',
  NOTA_CREDITO = 'NOTA_CREDITO',
  NOTA_DEBITO = 'NOTA_DEBITO',
}

/**
 * Serie de comprobantes con su correlativo.
 *
 * SUNAT exige numeración correlativa, sin huecos ni repeticiones, e
 * independiente por serie: F001 y B001 llevan contadores separados. Por eso el
 * correlativo vive aquí y no se deriva de `invoices.code`, que es un texto
 * libre que define quien crea la factura.
 */
@Entity('document_series')
@Index(['organization_id', 'document_type'])
@Index(['organization_id', 'series'], { unique: true })
export class DocumentSeries {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'enum', enum: DocumentType })
  document_type: DocumentType;

  /** Código de la serie tal como lo exige SUNAT: F001, B001, FC01... */
  @Column({ length: 10 })
  series: string;

  /**
   * Último correlativo entregado. El siguiente comprobante usa
   * `current_number + 1`; arranca en 0 para que el primero sea el 1.
   */
  @Column({ type: 'int', default: 0 })
  current_number: number;

  /**
   * Emisor al que pertenece la serie, cuando la organización tiene varios
   * (ver `certification_pack_emitters`). Informativo por ahora: la unicidad
   * de la serie se aplica a nivel de organización.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  emitter_id: string | null;

  @Column({ default: true })
  is_active: boolean;

  /** Serie elegida cuando se pide un correlativo sin indicar cuál usar. */
  @Column({ default: false })
  is_default: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
