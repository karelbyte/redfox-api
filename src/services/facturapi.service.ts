import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Invoice } from '../models/invoice.entity';
import Facturapi from 'facturapi';

interface FacturaAPIResponse {
  id: string;
  uuid: string;
  status: string;
  pdf_url?: string;
  xml_url?: string;
  message?: string;
}

@Injectable()
export class FacturaAPIService {
  private readonly facturapi: Facturapi;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('FACTURAPI_API_KEY') || '';

    if (!this.apiKey) {
      throw new Error('FACTURAPI_API_KEY is required');
    }

    this.facturapi = new Facturapi(this.apiKey);
  }

  async generateCFDI(invoice: Invoice): Promise<FacturaAPIResponse> {
    try {
      const cfdiData = this.buildCFDIData(invoice);

      console.dir(cfdiData, { depth: null });

      const data = await this.facturapi.invoices.create(cfdiData);

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
      await this.facturapi.invoices.cancel(uuid, {
        motive: reason as any,
      });
    } catch (error) {
      console.error('FacturaAPI Cancel Error:', error);
      throw new BadRequestException('Error canceling CFDI with FacturaAPI');
    }
  }

  async getCFDIStatus(uuid: string): Promise<any> {
    try {
      return await this.facturapi.invoices.retrieve(uuid);
    } catch (error) {
      console.error('FacturaAPI Status Error:', error);
      throw new BadRequestException(
        'Error getting CFDI status from FacturaAPI',
      );
    }
  }

  async downloadPDF(uuid: string): Promise<Buffer> {
    try {
      const pdfBuffer = await this.facturapi.invoices.downloadPdf(uuid);

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

  async downloadXML(uuid: string): Promise<string> {
    try {
      const xmlContent = await this.facturapi.invoices.downloadXml(uuid);

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
      //  exchange_rate: 1,
      // total: invoice.total_amount,
      // subtotal: invoice.subtotal,
      // tax: invoice.tax_amount,
      // notes: invoice.notes || '',
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
      /*taxes:
        detail.tax_rate > 0
          ? [
              {
                type: 'IVA',
                rate: this.convertPercentageToDecimal(detail.tax_rate),
                factor: 'Tasa',
              },
            ]
          : [],*/
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
}
