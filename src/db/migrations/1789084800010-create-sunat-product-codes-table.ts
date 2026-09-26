import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Catálogo 25 de SUNAT: el código de producto que clasifica cada ítem de un
 * comprobante peruano. Son 19.475 códigos de ocho dígitos tomados de UNSPSC
 * v14_0801, que es el estándar sobre el que SUNAT construyó su catálogo.
 *
 * Se guarda en la base en lugar de consultarse a un servicio externo, como
 * hace hoy el catálogo mexicano: es un dato de referencia que cambia una vez
 * al año, y depender de un tercero para dar de alta un producto deja el alta
 * a merced de que ese tercero esté en pie.
 *
 * El índice de trigramas es lo que hace viable buscar por texto dentro de
 * esas 19.475 filas sin recorrerlas todas. `unaccent` se envuelve en una
 * función inmutable porque la original no lo es y Postgres no admite en un
 * índice una expresión que pueda cambiar de resultado.
 */
export class CreateSunatProductCodesTable1789084800010
  implements MigrationInterface
{
  name = 'CreateSunatProductCodesTable1789084800010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS unaccent');

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION immutable_unaccent(text)
      RETURNS text AS $$
        SELECT public.unaccent('public.unaccent', $1)
      $$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sunat_product_codes (
        code                varchar(8) PRIMARY KEY,
        description         text NOT NULL,
        segment             varchar(2) NOT NULL,
        family              varchar(4) NOT NULL,
        class               varchar(6) NOT NULL,
        segment_description text,
        class_description   text,
        /* Anexos 25.1, 25.2 y 25.3: bienes controlados cuyo código es
           obligatorio desde el 1 de agosto de 2026. Llegan en un documento
           aparte del libro CCNU, así que quedan vacíos hasta cargarlo. */
        annex               varchar(8),
        is_restricted       boolean NOT NULL DEFAULT false
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sunat_product_codes_description_trgm
      ON sunat_product_codes
      USING gin (immutable_unaccent(lower(description)) gin_trgm_ops)
    `);

    // Buscar por código es un prefijo, no un trigrama: 'varchar_pattern_ops'
    // es lo que permite que un LIKE 'x%' use el índice.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sunat_product_codes_code_prefix
      ON sunat_product_codes (code varchar_pattern_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sunat_product_codes_restricted
      ON sunat_product_codes (is_restricted) WHERE is_restricted
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS sunat_product_codes');
    await queryRunner.query('DROP FUNCTION IF EXISTS immutable_unaccent(text)');
  }
}
