import { MigrationInterface, QueryRunner } from 'typeorm';
import { gunzipSync } from 'node:zlib';

import { SUNAT_PRODUCT_CODES_GZIP_BASE64 } from './data/sunat-product-codes.data';

/**
 * Llena el Catálogo 25 de SUNAT: los 19.475 códigos de producto con los que
 * se clasifica cada ítem de un comprobante peruano.
 *
 * La migración 1789084800010 creó la tabla, pero cargarla quedó como una
 * siembra manual (`npm run catalog:sunat:seed`), y las siembras no se
 * ejecutan al desplegar: `start:prod` es solo `node dist/main`. El resultado
 * fue que en producción la tabla existía vacía y el buscador de código fiscal
 * no devolvía nada. Es dato que la aplicación necesita para funcionar, así
 * que pertenece a las migraciones, que sí corren solas.
 *
 * Los datos van embebidos en `data/sunat-product-codes.data.ts` y no se leen
 * de un archivo: `nest build` solo copia a `dist/` lo declarado en los
 * `assets` de nest-cli.json, y una migración que no encuentre su archivo
 * lanzaría al arrancar. Con `migrationsRun` activo eso dejaría la aplicación
 * sin levantar, que es bastante peor que un buscador vacío.
 */
const BATCH_SIZE = 1000;
const COLUMNS_PER_ROW = 5;

interface ProductCode {
  code: string;
  description: string;
}

/**
 * El segmento, la familia y la clase son los primeros 2, 4 y 6 dígitos del
 * código, así que se derivan en lugar de guardarse: son unos 60 KB menos en
 * un archivo que ya es incómodo de abrir.
 */
function readEmbeddedCatalog(): ProductCode[] {
  const content = gunzipSync(
    Buffer.from(SUNAT_PRODUCT_CODES_GZIP_BASE64, 'base64'),
  ).toString('utf8');

  return content
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      const separator = line.indexOf('\t');

      return {
        code: line.slice(0, separator),
        description: line.slice(separator + 1),
      };
    });
}

export class SeedSunatProductCodes1789084800011 implements MigrationInterface {
  name = 'SeedSunatProductCodes1789084800011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const catalog = readEmbeddedCatalog();

    for (let start = 0; start < catalog.length; start += BATCH_SIZE) {
      const batch = catalog.slice(start, start + BATCH_SIZE);

      const placeholders = batch
        .map((_, row) => {
          const base = row * COLUMNS_PER_ROW;
          const columns = Array.from(
            { length: COLUMNS_PER_ROW },
            (_unused, column) => `$${base + column + 1}`,
          );

          return `(${columns.join(', ')})`;
        })
        .join(', ');

      const parameters = batch.flatMap((item) => [
        item.code,
        item.description,
        item.code.slice(0, 2),
        item.code.slice(0, 4),
        item.code.slice(0, 6),
      ]);

      // Idempotente: si el catálogo ya estaba cargado —por la siembra manual
      // o por una ejecución previa— se actualizan las descripciones en vez de
      // fallar por clave repetida.
      await queryRunner.query(
        `INSERT INTO sunat_product_codes
           (code, description, segment, family, class)
         VALUES ${placeholders}
         ON CONFLICT (code) DO UPDATE SET
           description = EXCLUDED.description`,
        parameters,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Nada referencia esta tabla con clave foránea: `products.code` guarda el
    // código como texto suelto, así que vaciarla no deja productos colgando.
    await queryRunner.query('DELETE FROM sunat_product_codes');
  }
}
