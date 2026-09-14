import { Invoice } from '../models/invoice.entity';

/**
 * Respuesta genérica al emitir CFDI en el PAC.
 * Escalable para cualquier pack (Facturapi, SAT, otro PAC).
 * - id: identificador interno del comprobante en el PAC → persistir como pack_invoice_id
 * - uuid: folio fiscal del SAT (CFDI) → persistir como cfdi_uuid
 */
export interface CFDIResponse {
  id: string;
  uuid: string | null;
  status: string;
  pdf_url?: string;
  xml_url?: string;
  message?: string;
  payload_send?: any;
  /** Datos adicionales del PAC que se fusionan en `pack_invoice_response` (ej. hash y CDR de SUNAT). */
  raw?: Record<string, unknown>;
}

export interface MeasurementUnitSuggestion {
  key: string;
  description: string;
  score?: number;
}

export interface ProductKeySuggestion {
  key: string;
  description: string;
  score?: number;
}

export interface CustomerData {
  legal_name: string;
  tax_id: string;
  tax_system?: string;
  email?: string;
  phone?: string;
  default_invoice_use?: string;
  address?: {
    street?: string;
    exterior?: string | number;
    interior?: string | number;
    neighborhood?: string;
    city?: string;
    municipality?: string;
    zip?: string | number;
    state?: string;
    country?: string;
  };
}

export interface CustomerResponse {
  id: string;
  created_at: string;
  livemode: boolean;
  legal_name: string;
  tax_id: string;
  tax_system?: string;
  email?: string;
  phone?: string;
  default_invoice_use?: string;
  address?: {
    street?: string;
    exterior?: string | number;
    interior?: string | number;
    neighborhood?: string;
    city?: string;
    municipality?: string;
    zip?: string | number;
    state?: string;
    country?: string;
  };
  payload_send?: any;
  [key: string]: any;
}

export interface ProductData {
  description: string;
  product_key: string | number;
  unit_key?: string;
  price: number;
  tax_included?: boolean;
  taxability?: string;
  taxes?: Array<{ type: string; rate: number }>;
  unit_name?: string;
  sku?: string;
  type?: string;
}

export interface ProductResponse {
  id: string;
  created_at: string;
  livemode: boolean;
  description: string;
  product_key: string | number;
  unit_key: string;
  price: number;
  tax_included: boolean;
  taxability?: string;
  taxes?: Array<{ type: string; rate: number }>;
  unit_name?: string;
  sku?: string;
  payload_send?: any;
  [key: string]: unknown;
}

export interface ReceiptItemProductData {
  description: string;
  product_key: string | number;
  price: number;
  tax_included?: boolean;
  taxability?: string;
  taxes?: Array<{ type: string; rate: number }>;
  local_taxes?: Array<{ type: string; rate: number }>;
  unit_key?: string;
  unit_name?: string;
  sku?: string;
}

export interface ReceiptItemData {
  quantity: number;
  discount?: number;
  product: ReceiptItemProductData;
}

export interface ReceiptData {
  items: ReceiptItemData[];
  payment_form: string;
  customer?: string | CustomerData;
  date?: string;
  folio_number?: number;
  currency?: string;
  exchange?: number;
  branch?: string;
  external_id?: string;
  idempotency_key?: string;
}

export interface ReceiptResponse {
  id: string;
  created_at: string;
  livemode: boolean;
  date: string;
  expires_at?: string;
  status: string;
  self_invoice_url?: string;
  total: number;
  invoice?: string;
  customer?: string | CustomerResponse;
  key?: string;
  items: ReceiptItemData[];
  external_id?: string;
  idempotency_key?: string;
  payment_form: string;
  folio_number?: number;
  currency?: string;
  exchange?: number;
  branch?: string;
  [key: string]: unknown;
}

/**
 * Datos para generar un complemento de pago (REP) en el PAC.
 * El control de parcialidad y saldo insoluto es responsabilidad de nuestro sistema.
 */
export interface PaymentComplementData {
  /** Folio fiscal SAT (cfdi_uuid) de la factura PPD original */
  cfdi_uuid: string;
  /** Número de parcialidad (1, 2, 3...) */
  payment_number: number;
  /** Fecha del pago en formato YYYY-MM-DD */
  payment_date: string;
  /** Monto del pago */
  amount: number;
  /** Saldo insoluto antes del pago */
  balance_before: number;
  /** Saldo insoluto después del pago */
  balance_after: number;
  /** Clave SAT de forma de pago (01=Efectivo, 03=Transferencia, 04=Tarjeta...) */
  payment_form: string;
  /** ID interno del comprobante en el PAC (opcional, ayuda a Facturapi) */
  pack_invoice_id?: string | null;
}

export interface PaymentComplementResponse {
  /** ID interno del complemento en el PAC */
  id: string;
  /** Folio fiscal SAT del complemento de pago generado */
  complement_uuid: string;
  /** Folio fiscal SAT de la factura original */
  invoice_uuid: string;
  pdf_url?: string;
  xml_url?: string;
}

/**
 * Capacidades opcionales de un pack de certificación.
 *
 * No todos los PAC funcionan igual: Facturapi y Factura Green mantienen un
 * catálogo propio de productos y clientes que hay que sincronizar antes de
 * poder timbrar, mientras que SUNAT recibe todos los datos dentro del propio
 * comprobante y no tiene catálogos que sincronizar.
 */
export interface PackCapabilities {
  /** El PAC mantiene un catálogo de productos que debe sincronizarse antes de emitir. */
  productCatalog: boolean;
  /** El PAC mantiene un catálogo de clientes que debe sincronizarse antes de emitir. */
  customerCatalog: boolean;
  /** El PAC numera los comprobantes por serie y correlativo (SUNAT). */
  documentSeries: boolean;
  /**
   * El PAC admite recibos de venta (el ticket mexicano que el cliente puede
   * autofacturar y que acaba agrupado en una factura global). En Perú no
   * existe esa figura: cada venta emite boleta o factura en el acto.
   */
  receipts: boolean;
  /** El PAC permite cancelar un comprobante ya emitido desde la API. */
  cancellation: boolean;
  /**
   * El PAC sirve el PDF y el XML a través de la API. Cuando es `false` los
   * documentos pueden llegar igualmente como URLs dentro de
   * `pack_invoice_response`.
   */
  documentDownload: boolean;
}

/**
 * Indica si un pack soporta una capacidad. Lo que un pack no declara se asume
 * soportado, de modo que los packs que no declaran nada (Facturapi, Factura
 * Green) conservan exactamente el comportamiento anterior.
 */
/**
 * Indica si un pack requiere una capacidad. Al revés que {@link packSupports}:
 * lo que no se declara se asume NO requerido, de forma que añadir una
 * capacidad nueva nunca cambia el comportamiento de los packs existentes.
 *
 * Regla para elegir entre las dos: `packSupports` es para comportamientos que
 * todos los packs ya tenían antes de existir este mecanismo; `packRequires`
 * es para comportamientos nuevos que solo algunos packs necesitan.
 */
export function packRequires(
  packService:
    | Pick<ICertificationPackService, 'capabilities'>
    | null
    | undefined,
  capability: keyof PackCapabilities,
): boolean {
  return packService?.capabilities?.[capability] === true;
}

export function packSupports(
  packService:
    | Pick<ICertificationPackService, 'capabilities'>
    | null
    | undefined,
  capability: keyof PackCapabilities,
): boolean {
  return packService?.capabilities?.[capability] !== false;
}

/**
 * Resuelve las capacidades efectivas de un pack a valores concretos, aplicando
 * el criterio por defecto de cada una: las capacidades históricas se asumen
 * soportadas y las nuevas se asumen no requeridas. Es la forma de exponerlas
 * fuera del backend sin que nadie tenga que replicar esas reglas.
 */
export function resolvePackCapabilities(
  packService:
    | Pick<ICertificationPackService, 'capabilities'>
    | null
    | undefined,
): PackCapabilities {
  return {
    productCatalog: packSupports(packService, 'productCatalog'),
    customerCatalog: packSupports(packService, 'customerCatalog'),
    receipts: packSupports(packService, 'receipts'),
    cancellation: packSupports(packService, 'cancellation'),
    documentDownload: packSupports(packService, 'documentDownload'),
    documentSeries: packRequires(packService, 'documentSeries'),
  };
}

export interface ICertificationPackService {
  /** Capacidades declaradas por el pack. Ver {@link packSupports}. */
  readonly capabilities?: Partial<PackCapabilities>;
  generateCFDI(invoice: Invoice, options?: any, emitterId?: string): Promise<CFDIResponse>;
  cancelCFDI(uuid: string, reason: string): Promise<void>;
  getCFDIStatus(uuid: string): Promise<any>;
  /** @param packInvoiceId ID interno del comprobante en el PAC (ej. Facturapi id), no el UUID del SAT */
  downloadPDF(packInvoiceId: string): Promise<Buffer>;
  /** @param packInvoiceId ID interno del comprobante en el PAC (ej. Facturapi id), no el UUID del SAT */
  downloadXML(packInvoiceId: string): Promise<string>;
  validateTaxId(taxId: string): Promise<boolean>;
  getTaxRegimes(): Promise<any[]>;
  getProductKeys(): Promise<any[]>;
  getPaymentForms(): Promise<any[]>;
  getUses(): Promise<any[]>;
  searchMeasurementUnits(term: string): Promise<MeasurementUnitSuggestion[]>;
  searchProductKeys(term: string): Promise<ProductKeySuggestion[]>;
  createCustomer(customerData: CustomerData): Promise<CustomerResponse>;
  updateCustomer(
    customerId: string,
    customerData: Partial<CustomerData>,
  ): Promise<CustomerResponse>;
  /**
   * Lista clientes (customers) del pack activo.
   * Opcional: no todos los packs soportan listar clientes.
   * Se usa para importación "inversa" (pack -> nuestra DB).
   */
  listCustomers?: () => Promise<CustomerResponse[]>;
  /**
   * Elimina un cliente (customer) en el pack por su ID del pack.
   * Opcional: no todos los packs soportan eliminación.
   */
  deleteCustomer?: (customerId: string) => Promise<void>;
  /**
   * Lista productos del pack activo.
   * Opcional: no todos los packs soportan listar productos.
   * Se usa para importación "inversa" (pack -> nuestra DB).
   */
  listProducts?: () => Promise<ProductResponse[]>;
  createProduct(productData: ProductData): Promise<ProductResponse>;
  findProductBySku(sku: string): Promise<ProductResponse | null>;
  updateProduct(
    productId: string,
    productData: Partial<ProductData>,
  ): Promise<ProductResponse>;
  createReceipt(data: ReceiptData): Promise<ReceiptResponse>;
  cancelReceipt(receiptId: string): Promise<void>;
  /**
   * Crea una factura global en el PAC que agrupa recibos (notas) no facturados.
   * FacturaAPI: POST /v2/receipts/global-invoice
   */
  createGlobalInvoice?(data: GlobalInvoiceData): Promise<CFDIResponse>;
  /**
   * Genera un complemento de pago (REP) para una factura PPD.
   * Opcional: no todos los packs soportan complementos de pago.
   */
  generatePaymentComplement?(
    data: PaymentComplementData,
  ): Promise<PaymentComplementResponse>;
  /**
   * Cancela un complemento de pago en el PAC.
   * Opcional: no todos los packs soportan cancelación de complementos.
   */
  cancelPaymentComplement?(
    complementPackId: string,
    reason: string,
  ): Promise<void>;
}

/** Datos para crear factura global en el PAC (ej. FacturaAPI). */
export interface GlobalInvoiceData {
  from?: string;
  to?: string;
  periodicity: 'day' | 'week' | 'fortnight' | 'month' | 'two_months';
  months?: string;
  receipts?: string[];
  payment_form?: string;
  date?: string;
  folio_number?: number;
  series?: string;
  /** Monto total de las ventas del período (requerido para Factura Green) */
  totalAmount?: number;
}
