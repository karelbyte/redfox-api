import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Invoice } from '../models/invoice.entity';
import Facturapi from 'facturapi';
import {
  ICertificationPackService,
  CFDIResponse,
  CustomerData,
  CustomerResponse,
  GlobalInvoiceData,
  ProductData,
  ProductResponse,
  ReceiptData,
  ReceiptResponse,
  PaymentComplementData,
  PaymentComplementResponse,
} from '../interfaces/certification-pack.interface';

import { TenantContext } from './tenant-context.service';

@Injectable()
export class FacturaAPIService implements ICertificationPackService {
  constructor(
    private readonly configService: ConfigService,
    private readonly tenantContext: TenantContext,
  ) {}

  private getClient(): Facturapi {
    const pacConfig = this.tenantContext.getPacConfig();
    const apiKey =
      pacConfig?.api_key || this.configService.get<string>('FACTURAPI_API_KEY');

    if (!apiKey) {
      throw new BadRequestException('FacturaAPI API key not configured');
    }

    return new Facturapi(apiKey);
  }

  private getApiKey(): string {
    const pacConfig = this.tenantContext.getPacConfig();
    const apiKey =
      pacConfig?.api_key || this.configService.get<string>('FACTURAPI_API_KEY');

    if (!apiKey) {
      throw new BadRequestException('FacturaAPI API key not configured');
    }

    return apiKey;
  }

  async generateCFDI(invoice: Invoice, options?: any): Promise<CFDIResponse> {
    try {
      const client = this.getClient();
      const cfdiData = this.buildCFDIData(invoice);

      console.dir(cfdiData, { depth: null });

      const data = await client.invoices.create(cfdiData);

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
      const client = this.getClient();
      await client.invoices.cancel(uuid, {
        motive: reason as any,
      });
    } catch (error) {
      console.error('FacturaAPI Cancel Error:', error);
      throw new BadRequestException('Error canceling CFDI with FacturaAPI');
    }
  }

  async getCFDIStatus(uuid: string): Promise<any> {
    try {
      const client = this.getClient();
      return await client.invoices.retrieve(uuid);
    } catch (error) {
      console.error('FacturaAPI Status Error:', error);
      throw new BadRequestException(
        'Error getting CFDI status from FacturaAPI',
      );
    }
  }

  async generatePaymentComplement(
    data: PaymentComplementData,
  ): Promise<PaymentComplementResponse> {
    try {
      const client = this.getClient() as any;

      // Intentar recuperar usando pack_invoice_id si existe, si no por UUID
      const lookupId = data.pack_invoice_id || data.cfdi_uuid;

      if (!lookupId) {
        throw new BadRequestException('No se proporcionó un ID o UUID válido para la factura original');
      }


      const originalInvoice = await client.invoices.retrieve(lookupId);

      if (!originalInvoice || !originalInvoice.customer) {
        throw new BadRequestException(
          `Factura original o cliente no encontrado en Facturapi (ID: ${lookupId}). Verifica que la factura haya sido emitida con el mismo API Key.`,
        );
      }

      // --- Lógica de Impuestos Proporcionales para CFDI 4.0 ---
      const invoiceTotal = Number(originalInvoice.total || originalInvoice.total_amount || 0);
      const paymentAmount = Number(data.amount);
      const ratio = invoiceTotal > 0 ? paymentAmount / invoiceTotal : 1;

      // Agrupar impuestos de la factura original para calcular la parte proporcional del pago
      const taxesMap = new Map<string, any>();
      (originalInvoice.items || []).forEach((item: any) => {
        const itemQuantity = Number(item.quantity || 0);
        const itemPrice = Number(item.product?.price || 0);
        const itemBase = itemQuantity * itemPrice;

        const itemTaxes = item.product?.taxes || item.taxes || [];
        itemTaxes.forEach((tax: any) => {
          const key = `${tax.type}-${tax.rate}-${tax.factor}-${tax.withholding}`;
          if (!taxesMap.has(key)) {
            taxesMap.set(key, {
              type: tax.type,
              rate: tax.rate,
              factor: tax.factor || 'Tasa',
              withholding: !!tax.withholding,
              base: 0,
            });
          }
          const group = taxesMap.get(key);
          const proportionalBase = itemBase * ratio;
          group.base += proportionalBase;
        });
      });

      const proportionalTaxes = Array.from(taxesMap.values()).map(t => ({
        ...t,
        base: Math.round(t.base * 100) / 100,
      }));
      // --------------------------------------------------------

      const paymentPayload = {
        type: 'P', // Tipo Pago (REP)
        customer: (originalInvoice.customer as any).id || originalInvoice.customer,
        complements: [
          {
            type: 'pago',
            data: [
              {
                date: new Date(data.payment_date).toISOString(),
                payment_form: data.payment_form,
                currency: originalInvoice.currency || 'MXN',
                related_documents: [
                  {
                    uuid: originalInvoice.uuid || originalInvoice.cfdi_uuid || data.cfdi_uuid,
                    amount: data.amount,
                    last_balance: data.balance_before,
                    installment: data.payment_number,
                    currency: originalInvoice.currency || 'MXN',
                    taxes: proportionalTaxes,
                  },
                ],
              },
            ],
          },
        ],
      };

      const paymentResponse = await client.invoices.create(paymentPayload);

      return {
        id: paymentResponse.id,
        complement_uuid: paymentResponse.uuid,
        invoice_uuid: data.cfdi_uuid,
        pdf_url: paymentResponse.pdf_url,
        xml_url: paymentResponse.xml_url,
      };
    } catch (error: any) {
      console.error('FacturaAPI Payment Complement Error:', error);
      throw new BadRequestException(
        `Error generating payment complement: ${error.message}`,
      );
    }
  }

  async cancelPaymentComplement(
    complementPackId: string,
    reason: string,
  ): Promise<void> {
    try {
      const client = this.getClient() as any;
      await client.invoices.cancel(complementPackId, {
        motive: reason as any,
      });
    } catch (error: any) {
      console.error('FacturaAPI Cancel Payment Complement Error:', error);
      throw new BadRequestException(
        `Error canceling payment complement: ${error.message}`,
      );
    }
  }

  async downloadPDF(packInvoiceId: string): Promise<Buffer> {
    try {
      const client = this.getClient();
      const pdfBuffer = await client.invoices.downloadPdf(packInvoiceId);

      // (rest of the logic remains the same, assuming it uses pdfBuffer)

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
      const client = this.getClient();
      const xmlContent = await client.invoices.downloadXml(packInvoiceId);

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
      payment_method: invoice.payment_method === 'credit' ? 'PPD' : 'PUE',
      use: 'G01',
      type: 'I',
      folio_number: invoice.code,
      series: 'A',
      date: this.formatDateForFacturaAPI(invoice.date),
      currency: 'MXN',
    };
  }

  private buildCustomerData(client: any): any {
    // Obtener el tax_document del taxData (es un array, usar el primero o el marcado como main)
    const taxData = client.taxData && client.taxData.length > 0 
      ? client.taxData[0] 
      : null;
    
    const taxDocument = taxData?.tax_document || client.tax_document || '';
    const taxSystem = taxData?.tax_system || '616';

    return {
      legal_name: client.name,
      tax_id: taxDocument,
      email: client.email || '',
      tax_system: taxSystem,
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
      credit: '99',
    };
    return mapping[paymentMethod] || '01';
  }

  async validateTaxId(taxId: string): Promise<boolean> {
    try {
      const apiKey = this.getApiKey();
      const response = await fetch(
        `https://api.facturapi.io/v1/customers/tax-id/${taxId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
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
      const apiKey = this.getApiKey();
      const response = await fetch(
        'https://api.facturapi.io/v1/catalogs/tax-regimes',
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
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
      const apiKey = this.getApiKey();
      const response = await fetch(
        'https://api.facturapi.io/v1/catalogs/products',
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
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
      const apiKey = this.getApiKey();
      const response = await fetch(
        'https://api.facturapi.io/v1/catalogs/payment-forms',
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
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
      const apiKey = this.getApiKey();
      const response = await fetch(
        'https://api.facturapi.io/v1/catalogs/uses',
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
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
      const apiKey = this.getApiKey();
      const response = await fetch(
        `https://www.facturapi.io/v2/catalogs/units?q=${encodeURIComponent(term)}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
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
      const apiKey = this.getApiKey();
      const response = await fetch(
        `https://www.facturapi.io/v2/catalogs/products?q=${encodeURIComponent(term)}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
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
      const client = this.getClient();

      const payload: any = {
        legal_name: customerData.legal_name,
        tax_id: customerData.tax_id,
      };

      // ... (rest of logic) ...
      if (customerData.tax_system) payload.tax_system = customerData.tax_system;
      if (customerData.email) payload.email = customerData.email;
      if (customerData.phone) payload.phone = customerData.phone;
      if (customerData.default_invoice_use)
        payload.default_invoice_use = customerData.default_invoice_use;

      if (customerData.address) {
        const address: any = {};
        if (customerData.address.street)
          address.street = customerData.address.street;
        if (customerData.address.exterior !== undefined)
          address.exterior = customerData.address.exterior;
        if (customerData.address.interior !== undefined)
          address.interior = customerData.address.interior;
        if (customerData.address.neighborhood)
          address.neighborhood = customerData.address.neighborhood;
        if (customerData.address.city) address.city = customerData.address.city;
        if (customerData.address.municipality)
          address.municipality = customerData.address.municipality;
        if (customerData.address.zip !== undefined)
          address.zip = customerData.address.zip;
        if (customerData.address.state)
          address.state = customerData.address.state;
        if (customerData.address.country)
          address.country = customerData.address.country;

        if (Object.keys(address).length > 0) {
          payload.address = address;
        }
      }

      const customer = await client.customers.create(payload);
      // Convertir el objeto a CustomerResponse, asegurando que created_at sea string
      const customerAny = customer as any;
      const response: CustomerResponse = {
        ...customerAny,
        created_at:
          customerAny.created_at instanceof Date
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
      const client = this.getClient();

      const payload: any = {};
      // ... (rest of logic) ...
      if (customerData.legal_name) payload.legal_name = customerData.legal_name;
      if (customerData.tax_id) payload.tax_id = customerData.tax_id;
      if (customerData.tax_system) payload.tax_system = customerData.tax_system;
      if (customerData.email !== undefined) payload.email = customerData.email;
      if (customerData.phone !== undefined) payload.phone = customerData.phone;
      if (customerData.default_invoice_use)
        payload.default_invoice_use = customerData.default_invoice_use;

      if (customerData.address) {
        const address: any = {};
        if (customerData.address.street !== undefined)
          address.street = customerData.address.street;
        if (customerData.address.exterior !== undefined)
          address.exterior = customerData.address.exterior;
        if (customerData.address.interior !== undefined)
          address.interior = customerData.address.interior;
        if (customerData.address.neighborhood !== undefined)
          address.neighborhood = customerData.address.neighborhood;
        if (customerData.address.city !== undefined)
          address.city = customerData.address.city;
        if (customerData.address.municipality !== undefined)
          address.municipality = customerData.address.municipality;
        if (customerData.address.zip !== undefined)
          address.zip = customerData.address.zip;
        if (customerData.address.state !== undefined)
          address.state = customerData.address.state;
        if (customerData.address.country !== undefined)
          address.country = customerData.address.country;

        if (Object.keys(address).length > 0) {
          payload.address = address;
        }
      }

      const customer = await client.customers.update(customerId, payload);
      // Convertir el objeto a CustomerResponse, asegurando que created_at sea string
      const customerAny = customer as any;
      const response: CustomerResponse = {
        ...customerAny,
        created_at:
          customerAny.created_at instanceof Date
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
    const client = this.getClient();
    const apiKey = this.getApiKey();

    const all: CustomerResponse[] = [];
    const limit = 100;
    let page = 1;

    while (true) {
      // Preferir SDK si existe, si no usar HTTP directo
      let data: any;
      try {
        const sdk = (client as any)?.customers;
        if (sdk?.list) {
          data = await sdk.list({ page, limit });
        } else {
          const res = await fetch(
            `https://api.facturapi.io/v1/customers?page=${page}&limit=${limit}`,
            { headers: { Authorization: `Bearer ${apiKey}` } },
          );
          data = await res.json();
          if (!res.ok) {
            const message =
              data?.message ?? 'Error listing customers from FacturaAPI';
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
          ...customerAny,
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
    const client = this.getClient();
    const apiKey = this.getApiKey();

    try {
      const sdk = (client as any)?.customers;
      if (sdk?.del) {
        await sdk.del(customerId);
        return;
      }
      if (sdk?.remove) {
        await sdk.remove(customerId);
        return;
      }

      const res = await fetch(
        `https://api.facturapi.io/v1/customers/${customerId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      );

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
      const apiKey = this.getApiKey();
      const payload: Record<string, unknown> = {
        description: productData.description,
        product_key: productData.product_key,
        price: productData.price,
        unit_key: productData.unit_key ?? 'H87',
        unit_name: productData.unit_name ?? 'Elemento',
        tax_included: productData.tax_included ?? true,
      };
      if (productData.taxability) payload.taxability = productData.taxability;
      if (productData.taxes && productData.taxes.length > 0)
        payload.taxes = productData.taxes;
      if (productData.sku) payload.sku = productData.sku;

      const res = await fetch(this.getProductsBaseUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const message =
          data?.message ??
          data?.message ??
          'Error creating product in FacturaAPI';
        throw new BadRequestException(message);
      }

      const created = data as ProductResponse;
      return {
        ...created,
        created_at:
          typeof created.created_at === 'string'
            ? created.created_at
            : ((created.created_at as Date)?.toISOString?.() ??
              new Date().toISOString()),
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('FacturaAPI Create Product Error:', error);
      const message = error?.message ?? 'Error creating product in FacturaAPI';
      throw new BadRequestException(message);
    }
  }

  async findProductBySku(sku: string): Promise<ProductResponse | null> {
    try {
      const apiKey = this.getApiKey();
      const res = await fetch(
        `${this.getProductsBaseUrl()}?sku=${encodeURIComponent(sku)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      const data = await res.json();
      if (!res.ok) {
        const message =
          data?.message ?? 'Error finding product by SKU in FacturaAPI';
        throw new BadRequestException(message);
      }

      const products = data.data || [];
      if (products.length > 0) {
        const found = products[0] as ProductResponse;
        return {
          ...found,
          created_at:
            typeof found.created_at === 'string'
              ? found.created_at
              : ((found.created_at as Date)?.toISOString?.() ??
                new Date().toISOString()),
        };
      }

      return null;
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('FacturaAPI Find Product by SKU Error:', error);
      const message =
        error?.message ?? 'Error finding product by SKU in FacturaAPI';
      throw new BadRequestException(message);
    }
  }

  async updateProduct(
    productId: string,
    productData: Partial<ProductData>,
  ): Promise<ProductResponse> {
    try {
      const apiKey = this.getApiKey();
      const payload: Record<string, unknown> = {};
      if (productData.description !== undefined)
        payload.description = productData.description;
      if (productData.product_key !== undefined)
        payload.product_key = productData.product_key;
      if (productData.price !== undefined) payload.price = productData.price;
      if (productData.unit_key !== undefined)
        payload.unit_key = productData.unit_key;
      if (productData.unit_name !== undefined)
        payload.unit_name = productData.unit_name;
      if (productData.tax_included !== undefined)
        payload.tax_included = productData.tax_included;
      if (productData.taxability !== undefined)
        payload.taxability = productData.taxability;
      if (productData.taxes !== undefined) payload.taxes = productData.taxes;
      if (productData.sku !== undefined) payload.sku = productData.sku;

      const res = await fetch(`${this.getProductsBaseUrl()}/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const message =
          data?.message ??
          data?.message ??
          'Error updating product in FacturaAPI';
        throw new BadRequestException(message);
      }

      const updated = data as ProductResponse;
      return {
        ...updated,
        created_at:
          typeof updated.created_at === 'string'
            ? updated.created_at
            : ((updated.created_at as Date)?.toISOString?.() ??
              new Date().toISOString()),
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
      const client = this.getClient();

      const payload: any = {
        items: data.items,
        payment_form: data.payment_form,
      };

      // ... (rest of logic) ...
      if (data.customer !== undefined) payload.customer = data.customer;
      if (data.date !== undefined) payload.date = data.date;
      if (data.folio_number !== undefined)
        payload.folio_number = data.folio_number;
      if (data.currency !== undefined) payload.currency = data.currency;
      if (data.exchange !== undefined) payload.exchange = data.exchange;
      if (data.branch !== undefined) payload.branch = data.branch;
      if (data.external_id !== undefined)
        payload.external_id = data.external_id;
      if (data.idempotency_key !== undefined)
        payload.idempotency_key = data.idempotency_key;

      const receipt = await client.receipts.create(payload);
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

  async cancelReceipt(receiptId: string): Promise<void> {
    try {
      const client = this.getClient();
      await (client.receipts as any).cancel(receiptId);
    } catch (error: any) {
      console.error('FacturaAPI Cancel Receipt Error:', error);
      const message = error?.message ?? 'Error canceling receipt in FacturaAPI';
      throw new BadRequestException(message);
    }
  }

  /**
   * Lista TODOS los productos del pack (Facturapi).
   * Paginación basada en total_pages de la respuesta.
   */
  async listProducts(): Promise<ProductResponse[]> {
    const apiKey = this.getApiKey();
    const all: ProductResponse[] = [];
    const limit = 100;
    let page = 1;

    while (true) {
      let data: any;
      try {
        const res = await fetch(
          `${this.getProductsBaseUrl()}?page=${page}&limit=${limit}`,
          { headers: { Authorization: `Bearer ${apiKey}` } },
        );
        data = await res.json();
        if (!res.ok) {
          throw new BadRequestException(
            data?.message ?? 'Error listing products from FacturaAPI',
          );
        }
      } catch (error: any) {
        if (error instanceof BadRequestException) throw error;
        throw new BadRequestException(
          error?.message ?? 'Error listing products from FacturaAPI',
        );
      }

      const items: any[] = Array.isArray(data) ? data : data?.data || [];
      if (!items.length) break;

      for (const item of items) {
        all.push({
          ...item,
          created_at:
            item.created_at instanceof Date
              ? item.created_at.toISOString()
              : String(item.created_at || new Date().toISOString()),
        } as ProductResponse);
      }

      const hasMore =
        typeof data?.total_pages === 'number'
          ? page < data.total_pages
          : items.length === limit;

      if (!hasMore) break;
      page += 1;
    }

    return all;
  }

  async createGlobalInvoice(data: GlobalInvoiceData): Promise<CFDIResponse> {
    try {
      const client = this.getClient();
      const payload: Record<string, unknown> = {
        periodicity: data.periodicity,
      };
      if (data.from) payload.from = data.from;
      if (data.to) payload.to = data.to;
      if (data.months) payload.months = data.months;
      if (data.receipts?.length) payload.receipts = data.receipts;
      if (data.payment_form) payload.payment_form = data.payment_form;
      if (data.date) payload.date = data.date;
      if (data.folio_number !== undefined)
        payload.folio_number = data.folio_number;
      if (data.series) payload.series = data.series;

      const invoice = await client.receipts.createGlobalInvoice(
        payload as Record<string, any>,
      );
      const anyInv = invoice as any;
      return {
        id: anyInv.id,
        uuid: anyInv.uuid ?? '',
        status: anyInv.status ?? 'valid',
        pdf_url: anyInv.pdf_url,
        xml_url: anyInv.xml_url,
      };
    } catch (error: any) {
      console.error('FacturaAPI Create Global Invoice Error:', error);
      const message =
        error?.message ?? 'Error creating global invoice in FacturaAPI';
      throw new BadRequestException(message);
    }
  }
}
