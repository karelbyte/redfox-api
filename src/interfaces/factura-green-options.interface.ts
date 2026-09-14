/**
 * Opciones para la generación de CFDI con Factura Green
 * Soporta todos los casos especiales de emisión de facturas
 */

export interface GenerateCFDIOptions {
  paymentMethod?: 'PUE' | 'PPD';

  itemPrices?: Record<string, number>;

  itemDescriptions?: Record<string, string>;

  itemDiscounts?: Record<string, number>;

  ieduData?: Record<string, IEDUStudentData>;

  businessAddress?: {
    street?: string;
    zip: string;
  };

  emmitDateOffset?: '-1d' | '-2d' | '-3d';

  paymentConditions?: string;

  donatarias?: DonatariasData;

  global?: GlobalInvoiceData;
}

export interface IEDUStudentData {
  student_name: string;
  student_popid: string;
}

export interface DonatariasData {
  auth_number: string;
  auth_date: string;
  legend?: string;
}

export interface GlobalInvoiceData {
  period: string;
  periodicity: string;
  year: string;
  enforceGlobal?: boolean;
}
