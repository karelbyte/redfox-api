import { Invoice } from '../models/invoice.entity';

/**
 * Respuesta genérica al emitir CFDI en el PAC.
 * Escalable para cualquier pack (Facturapi, SAT, otro PAC).
 * - id: identificador interno del comprobante en el PAC → persistir como pack_invoice_id
 * - uuid: folio fiscal del SAT (CFDI) → persistir como cfdi_uuid
 */
export interface CFDIResponse {
  id: string;
  uuid: string;
  status: string;
  pdf_url?: string;
  xml_url?: string;
  message?: string;
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
  [key: string]: any;
}

/** Datos para crear/actualizar producto en el pack (Facturapi). Ver https://docs.facturapi.io/api/#tag/product */
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

export interface ICertificationPackService {
  generateCFDI(invoice: Invoice): Promise<CFDIResponse>;
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
  updateCustomer(customerId: string, customerData: Partial<CustomerData>): Promise<CustomerResponse>;
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
  createProduct(productData: ProductData): Promise<ProductResponse>;
  updateProduct(productId: string, productData: Partial<ProductData>): Promise<ProductResponse>;
  createReceipt(data: ReceiptData): Promise<ReceiptResponse>;
}
