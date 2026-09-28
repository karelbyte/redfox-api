import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { DataSource } from 'typeorm';

/**
 * Carga el Catálogo 25 de SUNAT desde el CSV comprimido que vive en el repo.
 *
 * El archivo se genera con `scripts/extract-sunat-catalog.mjs` a partir del
 * libro CCNU_mod5.xlsm del portal CPE. Se versiona ya extraído para que la
 * siembra no dependa de tener ese libro a mano, ni de leer un .xlsm.
 *
 * Es idempotente: vuelve a correr sin duplicar, y actualiza las descripciones
 * si SUNAT las cambió. No borra códigos que ya no estén en el archivo nuevo,
 * porque puede haber comprobantes emitidos que los referencien.
 */
const CSV_PATH = join(__dirname, 'data', 'sunat-product-codes.csv.gz');
const BATCH_SIZE = 1000;
const COLUMNS_PER_ROW = 7;

interface CatalogRow {
  code: string;
  description: string;
  segment: string;
  family: string;
  class: string;
  segment_description: string;
  class_description: string;
}

/** Divide una línea CSV respetando las comillas dobles. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  fields.push(current);

  return fields;
}

export function readCatalog(): CatalogRow[] {
  const csv = gunzipSync(readFileSync(CSV_PATH)).toString('utf8');
  const lines = csv.split('\n');
  const header = splitCsvLine(lines[0]);

  return lines
    .slice(1)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = splitCsvLine(line);
      const row: Record<string, string> = {};

      header.forEach((column, index) => {
        row[column] = values[index] ?? '';
      });

      return row as unknown as CatalogRow;
    });
}

export async function seedSunatProductCodes(
  dataSource: DataSource,
): Promise<{ total: number }> {
  const catalog = readCatalog();

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

    const parameters = batch.flatMap((row) => [
      row.code,
      row.description,
      row.segment,
      row.family,
      row.class,
      row.segment_description || null,
      row.class_description || null,
    ]);

    await dataSource.query(
      `INSERT INTO sunat_product_codes
         (code, description, segment, family, class, segment_description, class_description)
       VALUES ${placeholders}
       ON CONFLICT (code) DO UPDATE SET
         description = EXCLUDED.description,
         segment_description = EXCLUDED.segment_description,
         class_description = EXCLUDED.class_description`,
      parameters,
    );
  }

  return { total: catalog.length };
}
