import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Un código del Catálogo 25 de SUNAT (código de producto, basado en UNSPSC).
 * Es dato de referencia: se siembra desde el catálogo oficial y nadie lo
 * edita desde la aplicación.
 */
@Entity('sunat_product_codes')
export class SunatProductCode {
  @PrimaryColumn({ type: 'varchar', length: 8 })
  code: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 2 })
  segment: string;

  @Column({ type: 'varchar', length: 4 })
  family: string;

  @Column({ type: 'varchar', length: 6 })
  class: string;

  @Column({ type: 'text', nullable: true })
  segment_description: string | null;

  @Column({ type: 'text', nullable: true })
  class_description: string | null;

  /** Anexo 25.1, 25.2 o 25.3 cuando el bien está controlado. */
  @Column({ type: 'varchar', length: 8, nullable: true })
  annex: string | null;

  /**
   * Bien cuyo código es obligatorio desde el 1 de agosto de 2026: sin él, o
   * con uno incorrecto, SUNAT rechaza el comprobante automáticamente.
   */
  @Column({ type: 'boolean', default: false })
  is_restricted: boolean;
}
