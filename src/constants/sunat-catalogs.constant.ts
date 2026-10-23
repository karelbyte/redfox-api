import { DocumentType } from '../models/document-series.entity';

/**
 * Catálogo 06 de SUNAT: tipo de documento de identidad del adquirente.
 */
export enum SunatIdentityDocument {
  SIN_DOCUMENTO = '0',
  DNI = '1',
  CARNET_EXTRANJERIA = '4',
  RUC = '6',
  PASAPORTE = '7',
}

/** Catálogo 01 de SUNAT: tipo de comprobante. */
export const SUNAT_DOCUMENT_CODE: Record<DocumentType, string> = {
  [DocumentType.FACTURA]: '01',
  [DocumentType.BOLETA]: '03',
  [DocumentType.NOTA_CREDITO]: '07',
  [DocumentType.NOTA_DEBITO]: '08',
};

/** Nombre del comprobante tal como lo espera el cuerpo de la petición. */
export const SUNAT_DOCUMENT_NAME: Record<DocumentType, string> = {
  [DocumentType.FACTURA]: 'factura',
  [DocumentType.BOLETA]: 'boleta',
  [DocumentType.NOTA_CREDITO]: 'nota_de_credito',
  [DocumentType.NOTA_DEBITO]: 'nota_de_debito',
};

/**
 * Relleno para una boleta sin documento de identidad, que SUNAT admite por
 * debajo de 700 PEN. Ocho ceros y no un guion porque el proveedor exige ese
 * largo mínimo; comprobado contra el sandbox, con el guion devuelve 422.
 */
export const NUMERO_SIN_DOCUMENTO = '00000000';

/**
 * Relleno de dirección. El proveedor la exige incluso en una boleta a
 * consumidor final, donde nadie pide el domicilio: un guion cumple el
 * requisito sin inventar datos del cliente.
 */
export const DIRECCION_NO_DECLARADA = '-';

const RUC_LENGTH = 11;
const DNI_LENGTH = 8;

export interface ResolvedCustomerDocument {
  /** Código del catálogo 06. */
  identityDocument: SunatIdentityDocument;
  /** Comprobante que corresponde emitir: con RUC, factura; si no, boleta. */
  documentType: DocumentType;
  /**
   * Número normalizado. Cuando no hay documento se envían ocho ceros: el
   * proveedor exige un mínimo de ocho caracteres y rechaza el guion con
   * "El campo cliente numero de documento debe tener al menos 8 caracteres".
   */
  number: string;
}

/**
 * Resuelve, a partir del documento fiscal del cliente, qué comprobante toca
 * emitir y con qué tipo de documento de identidad.
 *
 * Devuelve `null` cuando el formato no es reconocible, para que quien llama
 * decida el error: emitir con un tipo equivocado hace que SUNAT rechace el
 * comprobante, así que es preferible fallar antes de enviarlo.
 *
 * Carné de extranjería y pasaporte no se pueden deducir de forma fiable por
 * su formato: requieren que el tipo venga indicado explícitamente en el
 * cliente (pendiente).
 */
export function resolveCustomerDocument(
  taxDocument?: string | null,
): ResolvedCustomerDocument | null {
  const value = (taxDocument ?? '').trim();

  if (!value) {
    return {
      identityDocument: SunatIdentityDocument.SIN_DOCUMENTO,
      documentType: DocumentType.BOLETA,
      number: NUMERO_SIN_DOCUMENTO,
    };
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  if (value.length === RUC_LENGTH) {
    return {
      identityDocument: SunatIdentityDocument.RUC,
      documentType: DocumentType.FACTURA,
      number: value,
    };
  }

  if (value.length === DNI_LENGTH) {
    return {
      identityDocument: SunatIdentityDocument.DNI,
      documentType: DocumentType.BOLETA,
      number: value,
    };
  }

  return null;
}

/**
 * Catálogo 03 de SUNAT: unidad de medida. Usa los códigos de la
 * Recomendación 20 de UN/ECE. Subconjunto con las unidades de uso corriente.
 */
export const SUNAT_MEASUREMENT_UNITS = new Set([
  'NIU', // Unidad (bienes)
  'ZZ', // Unidad (servicios)
  'KGM', // Kilogramo
  'GRM', // Gramo
  'MGM', // Miligramo
  'TNE', // Tonelada
  'LBR', // Libra
  'ONZ', // Onza
  'LTR', // Litro
  'MLT', // Mililitro
  'GLL', // Galón
  'BLL', // Barril
  'MTR', // Metro
  'CMT', // Centímetro
  'MMT', // Milímetro
  'KTM', // Kilómetro
  'FOT', // Pie
  'INH', // Pulgada
  'YRD', // Yarda
  'MTK', // Metro cuadrado
  'MTQ', // Metro cúbico
  'BX', // Caja
  'PK', // Paquete
  'BG', // Bolsa
  'SA', // Saco
  'BO', // Botella
  'BJ', // Balde
  'CT', // Cartón
  'SET', // Conjunto
  'DZN', // Docena
  'CEN', // Ciento
  'PR', // Par
  'HUR', // Hora
  'DAY', // Día
  'MON', // Mes
  'ANN', // Año
  'KWH', // Kilovatio hora
]);

/** Unidad por defecto cuando no se puede determinar: unidad de bienes. */
export const DEFAULT_MEASUREMENT_UNIT = 'NIU';

/**
 * Equivalencias hacia el catálogo 03 desde los códigos y nombres que usa el
 * sistema (las unidades sembradas por defecto son UNIT, KG, L, M2...) y desde
 * los códigos del SAT mexicano, que conviven en la misma tabla.
 */
const MEASUREMENT_UNIT_ALIASES: Record<string, string> = {
  UNIT: 'NIU',
  UNIDAD: 'NIU',
  UND: 'NIU',
  UN: 'NIU',
  U: 'NIU',
  PZ: 'NIU',
  PZA: 'NIU',
  PIEZA: 'NIU',
  H87: 'NIU',
  C62: 'NIU',
  SERVICIO: 'ZZ',
  SERVICE: 'ZZ',
  SERV: 'ZZ',
  E48: 'ZZ',
  KG: 'KGM',
  KILO: 'KGM',
  KILOGRAMO: 'KGM',
  G: 'GRM',
  GR: 'GRM',
  GRAMO: 'GRM',
  MG: 'MGM',
  MILIGRAMO: 'MGM',
  T: 'TNE',
  TON: 'TNE',
  TONELADA: 'TNE',
  LB: 'LBR',
  LIBRA: 'LBR',
  OZ: 'ONZ',
  ONZA: 'ONZ',
  L: 'LTR',
  LT: 'LTR',
  LITRO: 'LTR',
  ML: 'MLT',
  MILILITRO: 'MLT',
  GAL: 'GLL',
  GALON: 'GLL',
  BARRIL: 'BLL',
  M: 'MTR',
  MT: 'MTR',
  METRO: 'MTR',
  CM: 'CMT',
  CENTIMETRO: 'CMT',
  MM: 'MMT',
  MILIMETRO: 'MMT',
  KM: 'KTM',
  KILOMETRO: 'KTM',
  PIE: 'FOT',
  PULGADA: 'INH',
  YARDA: 'YRD',
  M2: 'MTK',
  METROCUADRADO: 'MTK',
  M3: 'MTQ',
  METROCUBICO: 'MTQ',
  CAJA: 'BX',
  BOX: 'BX',
  PAQUETE: 'PK',
  PAQ: 'PK',
  BOLSA: 'BG',
  SACO: 'SA',
  BOTELLA: 'BO',
  BALDE: 'BJ',
  CARTON: 'CT',
  CONJUNTO: 'SET',
  JUEGO: 'SET',
  KIT: 'SET',
  DOCENA: 'DZN',
  DOC: 'DZN',
  CIENTO: 'CEN',
  PAR: 'PR',
  HORA: 'HUR',
  HR: 'HUR',
  H: 'HUR',
  DIA: 'DAY',
  MES: 'MON',
  ANIO: 'ANN',
  ANO: 'ANN',
  KWH: 'KWH',
};

function normalize(value?: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
}

/**
 * Traduce la unidad de medida del producto al catálogo 03. Acepta un código
 * que ya sea válido, un alias conocido o el nombre de la unidad; si nada
 * encaja devuelve NIU, que es la unidad genérica de bienes.
 */
export function resolveMeasurementUnit(
  code?: string | null,
  description?: string | null,
): string {
  for (const candidate of [code, description]) {
    const normalized = normalize(candidate);

    if (!normalized) {
      continue;
    }

    if (SUNAT_MEASUREMENT_UNITS.has(normalized)) {
      return normalized;
    }

    if (MEASUREMENT_UNIT_ALIASES[normalized]) {
      return MEASUREMENT_UNIT_ALIASES[normalized];
    }
  }

  return DEFAULT_MEASUREMENT_UNIT;
}

/** Catálogo 07 de SUNAT: tipo de afectación del IGV. */
export enum SunatIgvAffectation {
  GRAVADO = '10',
  EXONERADO = '20',
  INAFECTO = '30',
}

/** Nombre del tributo que corresponde a cada afectación. */
export const SUNAT_TAX_NAME: Record<SunatIgvAffectation, string> = {
  [SunatIgvAffectation.GRAVADO]: 'IGV',
  [SunatIgvAffectation.EXONERADO]: 'EXO',
  [SunatIgvAffectation.INAFECTO]: 'INA',
};

/**
 * Determina la afectación del IGV de una línea.
 *
 * El código del impuesto manda cuando dice algo reconocible (el código del
 * catálogo 07, o IGV/EXO/INA). Si no, se deduce de la tasa: con tasa se grava
 * y sin tasa se considera exonerado, que es el caso habitual en el comercio
 * de bienes. Un producto inafecto debe declararse con `tax.code` = 30 o INA.
 */
export function resolveIgvAffectation(
  taxRate: number,
  taxCode?: string | null,
): SunatIgvAffectation {
  const normalized = normalize(taxCode);

  if (normalized) {
    const byCode = Object.values(SunatIgvAffectation).find(
      (value) => String(value) === normalized,
    );

    if (byCode) {
      return byCode;
    }

    if (normalized.includes('EXO')) {
      return SunatIgvAffectation.EXONERADO;
    }

    if (normalized.includes('INA')) {
      return SunatIgvAffectation.INAFECTO;
    }

    if (normalized.includes('IGV')) {
      return SunatIgvAffectation.GRAVADO;
    }
  }

  return taxRate > 0
    ? SunatIgvAffectation.GRAVADO
    : SunatIgvAffectation.EXONERADO;
}
