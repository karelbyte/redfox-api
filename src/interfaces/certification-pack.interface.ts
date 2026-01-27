import { Invoice } from '../models/invoice.entity';

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

export interface ICertificationPackService {
  generateCFDI(invoice: Invoice): Promise<CFDIResponse>;
  cancelCFDI(uuid: string, reason: string): Promise<void>;
  getCFDIStatus(uuid: string): Promise<any>;
  downloadPDF(uuid: string): Promise<Buffer>;
  downloadXML(uuid: string): Promise<string>;
  validateTaxId(taxId: string): Promise<boolean>;
  getTaxRegimes(): Promise<any[]>;
  getProductKeys(): Promise<any[]>;
  getPaymentForms(): Promise<any[]>;
  getUses(): Promise<any[]>;
  searchMeasurementUnits(term: string): Promise<MeasurementUnitSuggestion[]>;
  searchProductKeys(term: string): Promise<ProductKeySuggestion[]>;
  createCustomer(customerData: CustomerData): Promise<CustomerResponse>;
  updateCustomer(customerId: string, customerData: Partial<CustomerData>): Promise<CustomerResponse>;
}
