/**
 * Extrae el Catálogo 25 de SUNAT (código de producto, basado en UNSPSC) desde
 * el libro CCNU_mod5.xlsm que publica el portal CPE, y lo deja como CSV
 * comprimido para que la siembra no dependa del archivo original.
 *
 * SUNAT actualiza el catálogo de vez en cuando. Para regenerarlo:
 *   node scripts/extract-sunat-catalog.mjs ~/Descargas/CCNU_mod5.xlsm
 *
 * El libro trae la columna de código corrupta ('1010151-'), así que el código
 * se toma del prefijo de la descripción, que sí viene completo
 * ('10101501-GATOS'). Se parte solo por el primer guion: hay 95 descripciones
 * que contienen guiones propios, como 'ACERO E24-2 O A37-2'.
 */
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';

const DEFAULT_TARGET = 'src/db/seeds/data/sunat-product-codes.csv.gz';

const sourceFile = process.argv[2];
const targetFile = process.argv[3] ?? DEFAULT_TARGET;

if (!sourceFile) {
  console.error('Uso: node scripts/extract-sunat-catalog.mjs <CCNU_mod5.xlsm> [destino]');
  process.exit(1);
}

const readSheet = (name) =>
  execFileSync('unzip', ['-p', sourceFile, `xl/worksheets/${name}`], {
    maxBuffer: 256 * 1024 * 1024,
  }).toString('utf8');

const sharedStrings = (() => {
  const xml = execFileSync('unzip', ['-p', sourceFile, 'xl/sharedStrings.xml'], {
    maxBuffer: 256 * 1024 * 1024,
  }).toString('utf8');

  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((entry) =>
    [...entry[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
      .map((text) => text[1])
      .join('')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'"),
  );
})();

/**
 * Una celda puede venir como <c .../> (vacía) o <c ...><v>…</v></c>. Con
 * t="s" el valor es un índice a la tabla de cadenas compartidas; si no, es
 * el valor literal.
 */
const cellValue = (cell) => {
  const value = cell.match(/<v>([\s\S]*?)<\/v>/);
  if (!value) return '';

  return /\st="s"/.test(cell) ? (sharedStrings[Number(value[1])] ?? '') : value[1];
};

const rows = (xml) =>
  [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((row) =>
    [...row[1].matchAll(/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g)].map((cell) =>
      cellValue(cell[0]),
    ),
  );

/** Hojas de jerarquía: cada descripción viene como '<código>-<texto>'. */
const describedBy = (sheet, column) => {
  const byCode = new Map();

  for (const row of rows(readSheet(sheet)).slice(1)) {
    const raw = (row[column] ?? '').trim();
    const match = raw.match(/^(\d+)-(.+)$/);
    if (match) byCode.set(match[1], match[2].trim());
  }

  return byCode;
};

const segments = describedBy('sheet2.xml', 1);
const classes = describedBy('sheet4.xml', 2);

const products = [];

for (const row of rows(readSheet('sheet5.xml')).slice(1)) {
  const raw = (row[2] ?? '').trim();
  const match = raw.match(/^(\d{8})-(.+)$/);
  if (!match) continue;

  const [, code, description] = match;

  products.push({
    code,
    description: description.trim(),
    segment: code.slice(0, 2),
    family: code.slice(0, 4),
    class: code.slice(0, 6),
    segmentDescription: segments.get(code.slice(0, 2)) ?? '',
    classDescription: classes.get(code.slice(0, 6)) ?? '',
  });
}

if (!products.length) {
  console.error('No se extrajo ningún producto: ¿cambió la estructura del libro?');
  process.exit(1);
}

const escapeCsv = (value) =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const csv = [
  'code,description,segment,family,class,segment_description,class_description',
  ...products.map((product) =>
    [
      product.code,
      product.description,
      product.segment,
      product.family,
      product.class,
      product.segmentDescription,
      product.classDescription,
    ]
      .map(escapeCsv)
      .join(','),
  ),
].join('\n');

writeFileSync(targetFile, gzipSync(Buffer.from(csv, 'utf8'), { level: 9 }));

console.log(`productos extraídos : ${products.length}`);
console.log(`segmentos           : ${segments.size}`);
console.log(`clases              : ${classes.size}`);
console.log(`CSV sin comprimir   : ${(csv.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`archivo escrito     : ${targetFile}`);
