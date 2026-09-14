import { TaxType } from '../models/tax.entity';
import { CertificationPackType } from './certification-packs.constant';

/**
 * Perfil fiscal de un país.
 *
 * Todo lo que cambia de un país a otro vive aquí como dato, no como código:
 * añadir un país nuevo es añadir una entrada a este registro y, si su
 * facturación electrónica no está cubierta, una implementación de
 * `ICertificationPackService`. Lo que el PAC sabe hacer se declara en sus
 * capacidades, no aquí: este registro solo decide qué se ofrece y con qué
 * datos arranca una organización.
 */
/**
 * Identificador fiscal del adquirente y campos que pide cada país.
 *
 * Se describe con datos genéricos (longitudes admitidas, si es numérico) para
 * que añadir un país no obligue a tocar el formulario: solo los países que
 * usen un identificador de una forma nueva necesitan trabajo en el cliente.
 */
export interface CustomerTaxFields {
  document: {
    /** Identificador del país: RFC en México, RUC o DNI en Perú. */
    kind: string;
    allowedLengths: number[];
    numericOnly: boolean;
  };
  /** Aplica el régimen fiscal (catálogo del SAT). */
  taxSystem: boolean;
  /** Aplica el uso del comprobante (catálogo del SAT). */
  invoiceUse: boolean;
}

export interface CountryProfile {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: string;
  /** Moneda local en ISO 4217. */
  currency: string;
  /** Packs de certificación que tienen sentido en el país. */
  packs: CertificationPackType[];
  currencies: Array<{ code: string; name: string }>;
  taxes: Array<{ code: string; name: string; value: number; type: TaxType }>;
  measurementUnits: Array<{ code: string; description: string }>;
  customerTaxFields: CustomerTaxFields;
}

/** País de las organizaciones que se crearon antes de existir este registro. */
export const DEFAULT_COUNTRY = 'MX';

export const COUNTRIES: Record<string, CountryProfile> = {
  MX: {
    code: 'MX',
    name: 'México',
    currency: 'MXN',
    packs: [
      CertificationPackType.FACTURAAPI,
      CertificationPackType.FACTURA_GREEN,
    ],
    currencies: [
      { code: 'MXN', name: 'Peso Mexicano' },
      { code: 'USD', name: 'Dólar Estadounidense' },
    ],
    taxes: [
      { code: 'IVA', name: 'IVA 16%', value: 16, type: TaxType.PERCENTAGE },
      { code: 'IVA', name: 'IVA 0%', value: 0, type: TaxType.PERCENTAGE },
    ],
    // Claves del catálogo de unidades del SAT
    measurementUnits: [
      { code: 'E48', description: 'Unidad de servicio' },
      { code: 'H87', description: 'Pieza' },
      { code: 'ACT', description: 'Actividad' },
      { code: 'HUR', description: 'Hora' },
      { code: 'XPK', description: 'Paquete' },
      { code: 'SET', description: 'Conjunto' },
      { code: 'KGM', description: 'Kilogramo' },
      { code: 'LTR', description: 'Litro' },
      { code: 'MTR', description: 'Metro' },
      { code: 'MTK', description: 'Metro cuadrado' },
      { code: 'XBX', description: 'Caja' },
      { code: 'E51', description: 'Trabajo' },
    ],
    customerTaxFields: {
      document: { kind: 'RFC', allowedLengths: [12, 13], numericOnly: false },
      taxSystem: true,
      invoiceUse: true,
    },
  },
  PE: {
    code: 'PE',
    name: 'Perú',
    currency: 'PEN',
    packs: [CertificationPackType.FACTURA_SUNAT],
    currencies: [
      { code: 'PEN', name: 'Sol Peruano' },
      { code: 'USD', name: 'Dólar Estadounidense' },
    ],
    // Los códigos coinciden con el catálogo 07 de SUNAT, de modo que la
    // afectación del IGV de cada línea se deduce del impuesto del producto.
    taxes: [
      { code: 'IGV', name: 'IGV 18%', value: 18, type: TaxType.PERCENTAGE },
      { code: 'EXO', name: 'Exonerado', value: 0, type: TaxType.PERCENTAGE },
      { code: 'INA', name: 'Inafecto', value: 0, type: TaxType.PERCENTAGE },
    ],
    // Códigos del catálogo 03 de SUNAT
    measurementUnits: [
      { code: 'NIU', description: 'Unidad' },
      { code: 'ZZ', description: 'Servicio' },
      { code: 'KGM', description: 'Kilogramo' },
      { code: 'GRM', description: 'Gramo' },
      { code: 'LTR', description: 'Litro' },
      { code: 'MLT', description: 'Mililitro' },
      { code: 'MTR', description: 'Metro' },
      { code: 'MTK', description: 'Metro cuadrado' },
      { code: 'MTQ', description: 'Metro cúbico' },
      { code: 'BX', description: 'Caja' },
      { code: 'PK', description: 'Paquete' },
      { code: 'BG', description: 'Bolsa' },
      { code: 'DZN', description: 'Docena' },
      { code: 'HUR', description: 'Hora' },
      { code: 'SET', description: 'Conjunto' },
    ],
    customerTaxFields: {
      // RUC de 11 dígitos emite factura; DNI de 8, boleta.
      document: { kind: 'RUC_DNI', allowedLengths: [8, 11], numericOnly: true },
      taxSystem: false,
      invoiceUse: false,
    },
  },
};

export const SUPPORTED_COUNTRIES = Object.keys(COUNTRIES);

export function isSupportedCountry(code?: string | null): boolean {
  return !!code && SUPPORTED_COUNTRIES.includes(code.toUpperCase());
}

/** Perfil del país indicado; si no se reconoce, el del país por defecto. */
export function getCountryProfile(code?: string | null): CountryProfile {
  return COUNTRIES[(code || '').toUpperCase()] ?? COUNTRIES[DEFAULT_COUNTRY];
}
