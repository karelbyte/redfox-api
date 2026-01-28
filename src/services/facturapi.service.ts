import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Invoice } from '../models/invoice.entity';
import Facturapi from 'facturapi';
import {
  ICertificationPackService,
  CFDIResponse,
  CustomerData,
  CustomerResponse,
  ProductData,
  ProductResponse,
  ReceiptData,
  ReceiptResponse,
} from '../interfaces/certification-pack.interface';

@Injectable()
export class FacturaAPIService implements ICertificationPackService {
  private facturapi: Facturapi | null = null;
  private apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('FACTURAPI_API_KEY') || '';
    if (this.apiKey) {
      this.facturapi = new Facturapi(this.apiKey);
    }
  }

  updateApiKey(apiKey: string): void {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.facturapi = new Facturapi(apiKey);
  }

  private ensureInitialized(): void {
    if (!this.facturapi) {
      if (!this.apiKey) {
        throw new BadRequestException('FacturaAPI API key not configured');
      }
      this.facturapi = new Facturapi(this.apiKey);
    }
  }

  async generateCFDI(invoice: Invoice): Promise<CFDIResponse> {
    try {
      this.ensureInitialized();
      const cfdiData = this.buildCFDIData(invoice);

      console.dir(cfdiData, { depth: null });

      const data = await this.facturapi!.invoices.create(cfdiData);

      return {
        id: data.id,
        uuid: data.uuid,
        status: data.status,
        pdf_url: (data as any).pdf_url,
        xml_url: (data as any).xml_url,
      };
    } catch (error) {
      console.error('FacturaAPI Error:', error);
      throw new BadRequestException('Error generating CFDI with FacturaAPI');
    }
  }

  async cancelCFDI(uuid: string, reason: string): Promise<void> {
    try {
      this.ensureInitialized();
      await this.facturapi!.invoices.cancel(uuid, {
        motive: reason as any,
      });
    } catch (error) {
      console.error('FacturaAPI Cancel Error:', error);
      throw new BadRequestException('Error canceling CFDI with FacturaAPI');
    }
  }

  async getCFDIStatus(uuid: string): Promise<any> {
    try {
      this.ensureInitialized();
      return await this.facturapi!.invoices.retrieve(uuid);
    } catch (error) {
      console.error('FacturaAPI Status Error:', error);
      throw new BadRequestException(
        'Error getting CFDI status from FacturaAPI',
      );
    }
  }

  async downloadPDF(packInvoiceId: string): Promise<Buffer> {
    try {
      this.ensureInitialized();
      const pdfBuffer = await this.facturapi!.invoices.downloadPdf(packInvoiceId);

      // Manejar diferentes tipos de respuesta
      if (pdfBuffer instanceof Buffer) {
        return pdfBuffer;
      } else if (pdfBuffer instanceof Blob) {
        const arrayBuffer = await pdfBuffer.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } else if (pdfBuffer && typeof pdfBuffer.pipe === 'function') {
        // Es un Readable stream de Node.js
        return new Promise((resolve, reject) => {
          const chunks: Buffer[] = [];

          pdfBuffer.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });

          pdfBuffer.on('end', () => {
            resolve(Buffer.concat(chunks));
          });

          pdfBuffer.on('error', (error: Error) => {
            reject(error);
          });
        });
      } else if (pdfBuffer instanceof ReadableStream) {
        const reader = pdfBuffer.getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        const totalLength = chunks.reduce(
          (acc, chunk) => acc + chunk.length,
          0,
        );
        const result = new Uint8Array(totalLength);
        let offset = 0;

        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }

        return Buffer.from(result);
      } else {
        // Fallback: convertir a string y luego a Buffer
        return Buffer.from(pdfBuffer as any);
      }
    } catch (error) {
      console.error('PDF download error:', error);
      throw new BadRequestException('Error downloading PDF from FacturaAPI');
    }
  }

  async downloadXML(packInvoiceId: string): Promise<string> {
    try {
      this.ensureInitialized();
      const xmlContent = await this.facturapi!.invoices.downloadXml(packInvoiceId);

      // Manejar diferentes tipos de respuesta
      if (typeof xmlContent === 'string') {
        return xmlContent;
      } else if (xmlContent instanceof Blob) {
        return await xmlContent.text();
      } else if (xmlContent && typeof xmlContent.pipe === 'function') {
        // Es un Readable stream de Node.js
        return new Promise((resolve, reject) => {
          const chunks: Buffer[] = [];

          xmlContent.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });

          xmlContent.on('end', () => {
            resolve(Buffer.concat(chunks).toString('utf-8'));
          });

          xmlContent.on('error', (error: Error) => {
            reject(error);
          });
        });
      } else if (xmlContent instanceof ReadableStream) {
        const reader = xmlContent.getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        const totalLength = chunks.reduce(
          (acc, chunk) => acc + chunk.length,
          0,
        );
        const result = new Uint8Array(totalLength);
        let offset = 0;

        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }

        return Buffer.from(result).toString('utf-8');
      } else {
        // Fallback: convertir a string
        return String(xmlContent);
      }
    } catch (error) {
      console.error('XML download error:', error);
      throw new BadRequestException('Error downloading XML from FacturaAPI');
    }
  }

  private buildCFDIData(invoice: Invoice): any {
    const customerData = this.buildCustomerData(invoice.client);
    const itemsData = this.buildItemsData(invoice.details);

    return {
      customer: customerData,
      items: itemsData,
      payment_form: this.mapPaymentMethod(invoice.payment_method),
      use: 'G01',
      type: 'I',
      folio_number: invoice.code,
      series: 'A',
      date: this.formatDateForFacturaAPI(invoice.date),
      currency: 'MXN',
    };
  }

  private buildCustomerData(client: any): any {
    return {
      legal_name: client.name,
      tax_id: client.tax_document,
      email: client.email || '',
      tax_system: '616',
      address: {
        zip: '85900',
        street: client.address || '',
        exterior: '',
        interior: '',
        neighborhood: '',
        city: '',
        municipality: '',
        state: '',
        country: 'MEX',
      },
    };
  }

  private buildItemsData(details: any[]): any[] {
    return details.map((detail) => ({
      quantity: Number(detail.quantity),
      product: {
        description: detail.product.description,
        product_key: this.cleanSKU(detail.product?.code),
        price: detail.price,
        tax_included: false,
        unit_key: detail.product.measurement_unit?.code || 'H87',
        unit_name: detail.product.measurement_unit?.description || 'Pieza',
      },
    }));
  }

  private cleanSKU(sku: string | null | undefined): string {
    if (!sku || typeof sku !== 'string') {
      return '00000000';
    }

    const cleanedSKU = sku.replace(/[^a-zA-Z0-9]/g, '');

    if (cleanedSKU.length === 0) {
      return '00000000';
    }

    let finalSKU: string;
    if (cleanedSKU.length < 8) {
      finalSKU = cleanedSKU.padEnd(8, '0');
    } else if (cleanedSKU.length > 8) {
      finalSKU = cleanedSKU.substring(0, 8);
    } else {
      finalSKU = cleanedSKU;
    }

    return finalSKU;
  }

  private convertPercentageToDecimal(percentage: number): number {
    // Convierte porcentaje (16) a decimal (0.16)
    // Validar que sea un número válido
    if (typeof percentage !== 'number' || isNaN(percentage)) {
      return 0;
    }
    return percentage / 100;
  }

  private formatDateForFacturaAPI(
    date: Date | string | null | undefined,
  ): string {
    if (!date) {
      return new Date().toISOString().split('T')[0];
    }

    // Si es un string en formato 'YYYY-MM-DD', devolverlo tal como está
    if (typeof date === 'string') {
      return date;
    }

    // Si es un objeto Date, convertir a formato 'YYYY-MM-DD'
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }

    // Fallback: usar fecha actual
    return new Date().toISOString().split('T')[0];
  }

  private mapPaymentMethod(paymentMethod: string): string {
    const mapping: Record<string, string> = {
      cash: '01',
      card: '28',
      transfer: '03',
      check: '02',
    };
    return mapping[paymentMethod] || '01';
  }

  async validateTaxId(taxId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.facturapi.io/v1/customers/tax-id/${taxId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.valid || false;
    } catch (error) {
      console.error('Tax ID validation error:', error);
      return false;
    }
  }

  async getTaxRegimes(): Promise<any[]> {
    try {
      const response = await fetch(
        'https://api.facturapi.io/v1/catalogs/tax-regimes',
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Tax regimes error:', error);
      return [];
    }
  }

  async getProductKeys(): Promise<any[]> {
    try {
      const response = await fetch(
        'https://api.facturapi.io/v1/catalogs/products',
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Product keys error:', error);
      return [];
    }
  }

  async getPaymentForms(): Promise<any[]> {
    try {
      const response = await fetch(
        'https://api.facturapi.io/v1/catalogs/payment-forms',
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Payment forms error:', error);
      return [];
    }
  }

  async getUses(): Promise<any[]> {
    try {
      const response = await fetch(
        'https://api.facturapi.io/v1/catalogs/uses',
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Uses error:', error);
      return [];
    }
  }

  async searchMeasurementUnits(term: string): Promise<any[]> {
    try {
      this.ensureInitialized();
      const response = await fetch(
        `https://www.facturapi.io/v2/catalogs/units?q=${encodeURIComponent(term)}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Measurement units search error:', error);
      return [];
    }
  }

  async searchProductKeys(term: string): Promise<any[]> {
    try {
      this.ensureInitialized();
      const response = await fetch(
        `https://www.facturapi.io/v2/catalogs/products?q=${encodeURIComponent(term)}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Product keys search error:', error);
      return [];
    }
  }

  async createCustomer(customerData: CustomerData): Promise<CustomerResponse> {
    try {
      this.ensureInitialized();
      
      const payload: any = {
        legal_name: customerData.legal_name,
        tax_id: customerData.tax_id,
      };

      if (customerData.tax_system) {
        payload.tax_system = customerData.tax_system;
      }

      if (customerData.email) {
        payload.email = customerData.email;
      }

      if (customerData.phone) {
        payload.phone = customerData.phone;
      }

      if (customerData.default_invoice_use) {
        payload.default_invoice_use = customerData.default_invoice_use;
      }

      if (customerData.address) {
        const address: any = {};
        
        if (customerData.address.street) address.street = customerData.address.street;
        if (customerData.address.exterior !== undefined) address.exterior = customerData.address.exterior;
        if (customerData.address.interior !== undefined) address.interior = customerData.address.interior;
        if (customerData.address.neighborhood) address.neighborhood = customerData.address.neighborhood;
        if (customerData.address.city) address.city = customerData.address.city;
        if (customerData.address.municipality) address.municipality = customerData.address.municipality;
        if (customerData.address.zip !== undefined) address.zip = customerData.address.zip;
        if (customerData.address.state) address.state = customerData.address.state;
        if (customerData.address.country) address.country = customerData.address.country;

        if (Object.keys(address).length > 0) {
          payload.address = address;
        }
      }

      const customer = await this.facturapi!.customers.create(payload);
      // Convertir el objeto a CustomerResponse, asegurando que created_at sea string
      const customerAny = customer as any;
      const response: CustomerResponse = {
        ...customerAny,
        created_at: customerAny.created_at instanceof Date 
          ? customerAny.created_at.toISOString() 
          : String(customerAny.created_at || new Date().toISOString()),
      };
      return response;
    } catch (error: any) {
      console.error('FacturaAPI Create Customer Error:', error);
      const message = error?.message ?? 'Error creating customer in FacturaAPI';
      throw new BadRequestException(message);
    }
  }

  async updateCustomer(
    customerId: string,
    customerData: Partial<CustomerData>,
  ): Promise<CustomerResponse> {
    try {
      this.ensureInitialized();
      
      const payload: any = {};

      if (customerData.legal_name) {
        payload.legal_name = customerData.legal_name;
      }

      if (customerData.tax_id) {
        payload.tax_id = customerData.tax_id;
      }

      if (customerData.tax_system) {
        payload.tax_system = customerData.tax_system;
      }

      if (customerData.email !== undefined) {
        payload.email = customerData.email;
      }

      if (customerData.phone !== undefined) {
        payload.phone = customerData.phone;
      }

      if (customerData.default_invoice_use) {
        payload.default_invoice_use = customerData.default_invoice_use;
      }

      if (customerData.address) {
        const address: any = {};
        
        if (customerData.address.street !== undefined) address.street = customerData.address.street;
        if (customerData.address.exterior !== undefined) address.exterior = customerData.address.exterior;
        if (customerData.address.interior !== undefined) address.interior = customerData.address.interior;
        if (customerData.address.neighborhood !== undefined) address.neighborhood = customerData.address.neighborhood;
        if (customerData.address.city !== undefined) address.city = customerData.address.city;
        if (customerData.address.municipality !== undefined) address.municipality = customerData.address.municipality;
        if (customerData.address.zip !== undefined) address.zip = customerData.address.zip;
        if (customerData.address.state !== undefined) address.state = customerData.address.state;
        if (customerData.address.country !== undefined) address.country = customerData.address.country;

        if (Object.keys(address).length > 0) {
          payload.address = address;
        }
      }

      const customer = await this.facturapi!.customers.update(customerId, payload);
      // Convertir el objeto a CustomerResponse, asegurando que created_at sea string
      const customerAny = customer as any;
      const response: CustomerResponse = {
        ...customerAny,
        created_at: customerAny.created_at instanceof Date 
          ? customerAny.created_at.toISOString() 
          : String(customerAny.created_at || new Date().toISOString()),
      };
      return response;
    } catch (error: any) {
      console.error('FacturaAPI Update Customer Error:', error);
      const message = error?.message ?? 'Error updating customer in FacturaAPI';
      throw new BadRequestException(message);
    }
  }

  /**
   * Lista TODOS los customers del pack (Facturapi).
   * Implementación paginada para no depender del tamaño de la cuenta.
   */
  async listCustomers(): Promise<CustomerResponse[]> {
    this.ensureInitialized();

    const all: CustomerResponse[] = [];
    const limit = 100;
    let page = 1;

    while (true) {
      // Preferir SDK si existe, si no usar HTTP directo
      let data: any;
      try {
        const sdk = (this.facturapi as any)?.customers;
        if (sdk?.list) {
          data = await sdk.list({ page, limit });
        } else {
          const res = await fetch(
            `https://api.facturapi.io/v1/customers?page=${page}&limit=${limit}`,
            { headers: { Authorization: `Bearer ${this.apiKey}` } },
          );
          data = await res.json();
          if (!res.ok) {
            const message =
              (data as any)?.message ??
              'Error listing customers from FacturaAPI';
            throw new BadRequestException(message);
          }
        }
      } catch (error: any) {
        if (error instanceof BadRequestException) throw error;
        throw new BadRequestException(
          error?.message ?? 'Error listing customers from FacturaAPI',
        );
      }

      const items: any[] = Array.isArray(data) ? data : data?.data || [];
      if (!items.length) break;

      for (const customerAny of items) {
        all.push({
          ...(customerAny as any),
          created_at:
            customerAny?.created_at instanceof Date
              ? customerAny.created_at.toISOString()
              : String(customerAny?.created_at || new Date().toISOString()),
        } as CustomerResponse);
      }

      // Heurísticas: si viene `has_more` o `total_pages`, respetarlo; si no, cortar cuando < limit
      const hasMore =
        typeof data?.has_more === 'boolean'
          ? data.has_more
          : typeof data?.total_pages === 'number'
            ? page < data.total_pages
            : items.length === limit;

      if (!hasMore) break;
      page += 1;
    }

    return all;
  }

  /**
   * Elimina customer en Facturapi.
   */
  async deleteCustomer(customerId: string): Promise<void> {
    this.ensureInitialized();

    try {
      const sdk = (this.facturapi as any)?.customers;
      if (sdk?.del) {
        await sdk.del(customerId);
        return;
      }
      if (sdk?.remove) {
        await sdk.remove(customerId);
        return;
      }

      const res = await fetch(`https://api.facturapi.io/v1/customers/${customerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      if (res.status === 404) return;
      if (!res.ok) {
        let data: any = null;
        try {
          data = await res.json();
        } catch {}
        const message =
          data?.message ?? 'Error deleting customer in FacturaAPI';
        throw new BadRequestException(message);
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        error?.message ?? 'Error deleting customer in FacturaAPI',
      );
    }
  }

  private getProductsBaseUrl(): string {
    return 'https://www.facturapi.io/v2/products';
  }

  async createProduct(productData: ProductData): Promise<ProductResponse> {
    try {
      this.ensureInitialized();
      const payload: Record<string, unknown> = {
        description: productData.description,
        product_key: productData.product_key,
        price: productData.price,
        unit_key: productData.unit_key ?? 'H87',
        unit_name: productData.unit_name ?? 'Elemento',
        tax_included: productData.tax_included ?? true,
      };
      if (productData.taxability) payload.taxability = productData.taxability;
      if (productData.taxes && productData.taxes.length > 0) payload.taxes = productData.taxes;
      if (productData.sku) payload.sku = productData.sku;

      const res = await fetch(this.getProductsBaseUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const message = (data as any)?.message ?? data?.message ?? 'Error creating product in FacturaAPI';
        throw new BadRequestException(message);
      }

      const created = data as ProductResponse;
      return {
        ...created,
        created_at: typeof created.created_at === 'string' ? created.created_at : (created.created_at as Date)?.toISOString?.() ?? new Date().toISOString(),
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('FacturaAPI Create Product Error:', error);
      const message = error?.message ?? 'Error creating product in FacturaAPI';
      throw new BadRequestException(message);
    }
  }

  async updateProduct(
    productId: string,
    productData: Partial<ProductData>,
  ): Promise<ProductResponse> {
    try {
      this.ensureInitialized();
      const payload: Record<string, unknown> = {};
      if (productData.description !== undefined) payload.description = productData.description;
      if (productData.product_key !== undefined) payload.product_key = productData.product_key;
      if (productData.price !== undefined) payload.price = productData.price;
      if (productData.unit_key !== undefined) payload.unit_key = productData.unit_key;
      if (productData.unit_name !== undefined) payload.unit_name = productData.unit_name;
      if (productData.tax_included !== undefined) payload.tax_included = productData.tax_included;
      if (productData.taxability !== undefined) payload.taxability = productData.taxability;
      if (productData.taxes !== undefined) payload.taxes = productData.taxes;
      if (productData.sku !== undefined) payload.sku = productData.sku;

      const res = await fetch(`${this.getProductsBaseUrl()}/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const message = (data as any)?.message ?? data?.message ?? 'Error updating product in FacturaAPI';
        throw new BadRequestException(message);
      }

      const updated = data as ProductResponse;
      return {
        ...updated,
        created_at: typeof updated.created_at === 'string' ? updated.created_at : (updated.created_at as Date)?.toISOString?.() ?? new Date().toISOString(),
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('FacturaAPI Update Product Error:', error);
      const message = error?.message ?? 'Error updating product in FacturaAPI';
      throw new BadRequestException(message);
    }
  }

  async createReceipt(data: ReceiptData): Promise<ReceiptResponse> {
    try {
      this.ensureInitialized();

      const payload: any = {
        items: data.items,
        payment_form: data.payment_form,
      };

      if (data.customer !== undefined) {
        payload.customer = data.customer;
      }
      if (data.date !== undefined) {
        payload.date = data.date;
      }
      if (data.folio_number !== undefined) {
        payload.folio_number = data.folio_number;
      }
      if (data.currency !== undefined) {
        payload.currency = data.currency;
      }
      if (data.exchange !== undefined) {
        payload.exchange = data.exchange;
      }
      if (data.branch !== undefined) {
        payload.branch = data.branch;
      }
      if (data.external_id !== undefined) {
        payload.external_id = data.external_id;
      }
      if (data.idempotency_key !== undefined) {
        payload.idempotency_key = data.idempotency_key;
      }

      const receipt = await this.facturapi!.receipts.create(payload);
      const anyReceipt: any = receipt;

      const createdAt =
        anyReceipt.created_at instanceof Date
          ? anyReceipt.created_at.toISOString()
          : String(anyReceipt.created_at || new Date().toISOString());

      const response: ReceiptResponse = {
        ...anyReceipt,
        created_at: createdAt,
      };

      return response;
    } catch (error: any) {
      console.error('FacturaAPI Create Receipt Error:', error);
      const message = error?.message ?? 'Error creating receipt in FacturaAPI';
      throw new BadRequestException(message);
    }
  }
}
