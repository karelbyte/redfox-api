import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Invoice } from '../models/invoice.entity';
import {
  ICertificationPackService,
  CFDIResponse,
  CustomerData,
  CustomerResponse,
  ProductData,
  ProductResponse,
  ReceiptData,
  ReceiptResponse,
  MeasurementUnitSuggestion,
  ProductKeySuggestion,
} from '../interfaces/certification-pack.interface';
import { TenantContext } from './tenant-context.service';

@Injectable()
export class FacturaGreenService implements ICertificationPackService {
  constructor(
    private readonly configService: ConfigService,
    private readonly tenantContext: TenantContext,
  ) {}

  private getConfig() {
    const pacConfig = this.tenantContext.getPacConfig();
    
    return {
      baseUrl: this.configService.get<string>('FACTURA_GREEN_BASE_URL') || 'https://www',
      businessUuid: pacConfig?.business_uuid,
      accountUuid: pacConfig?.account_uuid || '0000',
      tenantId: pacConfig?.tenant_id || 'www',
    };
  }

  private getHeaders() {
    const config = this.getConfig();
    
    if (!config.businessUuid) {
      throw new BadRequestException('Factura Green business UUID not configured');
    }

    return {
      'Content-Type': 'application/json',
      'x-application-business-uuid': config.businessUuid,
      'x-application-account-uuid': config.accountUuid,
    };
  }

  private getBaseUrl(): string {
    const config = this.getConfig();
    return `https://${config.tenantId}`;
  }

  async generateCFDI(invoice: Invoice): Promise<CFDIResponse> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = this.getHeaders();

      if (!invoice.client?.pack_client_id) {
        throw new BadRequestException('Customer not synced with Factura Green');
      }

      // Factura Green requiere que los productos estén previamente sincronizados
      // y usa sus UUIDs. Por ahora, construimos items con datos del producto local
      const items = invoice.details.map(detail => {
        // Si el producto tiene pack_client_id (sincronizado), usarlo
        // Si no, necesitaremos sincronizar el producto primero
        const productPackId = (detail.product as any)?.pack_client_id;
        
        if (!productPackId) {
          throw new BadRequestException(
            `Product ${detail.product?.name || detail.product_id} not synced with Factura Green. Please sync products first.`
          );
        }

        return {
          uuid: productPackId,
          qty: detail.quantity,
        };
      });

      // Mapear payment_method a forma de pago SAT
      const paymentFormMap: Record<string, string> = {
        cash: '01',      // Efectivo
        card: '04',      // Tarjeta de crédito
        transfer: '03',  // Transferencia electrónica
        check: '02',     // Cheque nominativo
      };

      const payload = {
        cfdi: {
          customer: {
            uuid: invoice.client.pack_client_id,
          },
          payment: {
            form: {
              k: paymentFormMap[invoice.payment_method] || '99',
            },
            method: {
              k: 'PUE', // Pago en Una Exhibición (por defecto)
            },
          },
          items,
          observations: invoice.notes || '',
        },
      };

      const response = await fetch(`${baseUrl}/interop/cfdi/emmit`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const message = data.error?.message || 'Error generating CFDI with Factura Green';
        throw new BadRequestException(message);
      }

      return {
        id: data.data.uuid,
        uuid: data.data.folio_tax,
        status: 'valid',
        pdf_url: data.data.pdf_url,
        xml_url: data.data.xml_url,
        message: 'CFDI generated successfully',
      };
    } catch (error: any) {
      console.error('Factura Green Error:', error);
      throw new BadRequestException('Error generating CFDI with Factura Green');
    }
  }

  async cancelCFDI(uuid: string, reason: string): Promise<void> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = this.getHeaders();

      const payload = {
        cancel: {
          folio_tax: uuid,
          reason: reason || '01',
        },
      };

      const response = await fetch(`${baseUrl}/interop/cfdi/emmited/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const message = data.error?.message || 'Error canceling CFDI with Factura Green';
        throw new BadRequestException(message);
      }
    } catch (error: any) {
      console.error('Factura Green Cancel Error:', error);
      throw new BadRequestException('Error canceling CFDI with Factura Green');
    }
  }

  async getCFDIStatus(uuid: string): Promise<any> {
    try {
      return {
        uuid,
        status: 'valid',
        cancellation_status: 'none',
      };
    } catch (error: any) {
      console.error('Factura Green Status Error:', error);
      throw new BadRequestException('Error getting CFDI status from Factura Green');
    }
  }

  async downloadPDF(packInvoiceId: string): Promise<Buffer> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = this.getHeaders();

      const response = await fetch(`${baseUrl}/interop/cfdi/${packInvoiceId}/pdf`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new BadRequestException('Error downloading PDF from Factura Green');
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error: any) {
      console.error('PDF download error:', error);
      throw new BadRequestException('Error downloading PDF from Factura Green');
    }
  }

  async downloadXML(packInvoiceId: string): Promise<string> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = this.getHeaders();

      const response = await fetch(`${baseUrl}/interop/cfdi/${packInvoiceId}/xml`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new BadRequestException('Error downloading XML from Factura Green');
      }

      return await response.text();
    } catch (error: any) {
      console.error('XML download error:', error);
      throw new BadRequestException('Error downloading XML from Factura Green');
    }
  }

  async validateTaxId(taxId: string): Promise<boolean> {
    if (!taxId || taxId.length < 12 || taxId.length > 13) {
      return false;
    }
    return true;
  }

  async getTaxRegimes(): Promise<any[]> {
    return [
      { key: '601', description: 'General de Ley Personas Morales' },
      { key: '603', description: 'Personas Morales con Fines no Lucrativos' },
      { key: '605', description: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
      { key: '606', description: 'Arrendamiento' },
      { key: '607', description: 'Régimen de Enajenación o Adquisición de Bienes' },
      { key: '608', description: 'Demás ingresos' },
      { key: '610', description: 'Residentes en el Extranjero sin Establecimiento Permanente en México' },
      { key: '611', description: 'Ingresos por Dividendos (socios y accionistas)' },
      { key: '612', description: 'Personas Físicas con Actividades Empresariales y Profesionales' },
      { key: '614', description: 'Ingresos por intereses' },
      { key: '615', description: 'Régimen de los ingresos por obtención de premios' },
      { key: '616', description: 'Sin obligaciones fiscales' },
      { key: '620', description: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos' },
      { key: '621', description: 'Incorporación Fiscal' },
      { key: '622', description: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
      { key: '623', description: 'Opcional para Grupos de Sociedades' },
      { key: '624', description: 'Coordinados' },
      { key: '625', description: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
      { key: '626', description: 'Régimen Simplificado de Confianza' },
    ];
  }

  async getProductKeys(): Promise<any[]> {
    return [];
  }

  async getPaymentForms(): Promise<any[]> {
    return [
      { key: '01', description: 'Efectivo' },
      { key: '02', description: 'Cheque nominativo' },
      { key: '03', description: 'Transferencia electrónica de fondos' },
      { key: '04', description: 'Tarjeta de crédito' },
      { key: '05', description: 'Monedero electrónico' },
      { key: '06', description: 'Dinero electrónico' },
      { key: '08', description: 'Vales de despensa' },
      { key: '12', description: 'Dación en pago' },
      { key: '13', description: 'Pago por subrogación' },
      { key: '14', description: 'Pago por consignación' },
      { key: '15', description: 'Condonación' },
      { key: '17', description: 'Compensación' },
      { key: '23', description: 'Novación' },
      { key: '24', description: 'Confusión' },
      { key: '25', description: 'Remisión de deuda' },
      { key: '26', description: 'Prescripción o caducidad' },
      { key: '27', description: 'A satisfacción del acreedor' },
      { key: '28', description: 'Tarjeta de débito' },
      { key: '29', description: 'Tarjeta de servicios' },
      { key: '30', description: 'Aplicación de anticipos' },
      { key: '31', description: 'Intermediario pagos' },
      { key: '99', description: 'Por definir' },
    ];
  }

  async getUses(): Promise<any[]> {
    return [
      { key: 'G01', description: 'Adquisición de mercancías' },
      { key: 'G02', description: 'Devoluciones, descuentos o bonificaciones' },
      { key: 'G03', description: 'Gastos en general' },
      { key: 'I01', description: 'Construcciones' },
      { key: 'I02', description: 'Mobiliario y equipo de oficina por inversiones' },
      { key: 'I03', description: 'Equipo de transporte' },
      { key: 'I04', description: 'Equipo de cómputo y accesorios' },
      { key: 'I05', description: 'Dados, troqueles, moldes, matrices y herramental' },
      { key: 'I06', description: 'Comunicaciones telefónicas' },
      { key: 'I07', description: 'Comunicaciones satelitales' },
      { key: 'I08', description: 'Otra maquinaria y equipo' },
      { key: 'D01', description: 'Honorarios médicos, dentales y gastos hospitalarios' },
      { key: 'D02', description: 'Gastos médicos por incapacidad o discapacidad' },
      { key: 'D03', description: 'Gastos funerales' },
      { key: 'D04', description: 'Donativos' },
      { key: 'D05', description: 'Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)' },
      { key: 'D06', description: 'Aportaciones voluntarias al SAR' },
      { key: 'D07', description: 'Primas por seguros de gastos médicos' },
      { key: 'D08', description: 'Gastos de transportación escolar obligatoria' },
      { key: 'D09', description: 'Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones' },
      { key: 'D10', description: 'Pagos por servicios educativos (colegiaturas)' },
      { key: 'P01', description: 'Por definir' },
      { key: 'S01', description: 'Sin efectos fiscales' },
      { key: 'CP01', description: 'Pagos' },
      { key: 'CN01', description: 'Nómina' },
    ];
  }

  async searchMeasurementUnits(term: string): Promise<MeasurementUnitSuggestion[]> {
    try {
      // Factura Green no tiene endpoint de búsqueda de catálogos
      // Usamos el endpoint público de FacturaAPI que tiene los catálogos oficiales del SAT
      const response = await fetch(
        `https://www.facturapi.io/v2/catalogs/units?q=${encodeURIComponent(term)}&limit=20`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        // Fallback a catálogo estático
        return this.getStaticMeasurementUnits(term);
      }

      const data = await response.json();
      return (data.data || []).map((item: any) => ({
        key: item.key,
        description: item.name || item.description,
      }));
    } catch (error) {
      console.error('Measurement units search error:', error);
      return this.getStaticMeasurementUnits(term);
    }
  }

  private getStaticMeasurementUnits(term: string): MeasurementUnitSuggestion[] {
    const units = [
      { key: 'H87', description: 'Pieza' },
      { key: 'E48', description: 'Unidad de servicio' },
      { key: 'ACT', description: 'Actividad' },
      { key: 'KGM', description: 'Kilogramo' },
      { key: 'E51', description: 'Trabajo' },
      { key: 'A9', description: 'Tarifa' },
      { key: 'MTR', description: 'Metro' },
      { key: 'AB', description: 'Paquete a granel' },
      { key: 'BB', description: 'Caja base' },
      { key: 'KT', description: 'Kit' },
      { key: 'SET', description: 'Conjunto' },
      { key: 'LTR', description: 'Litro' },
      { key: 'XBX', description: 'Caja' },
      { key: 'MON', description: 'Mes' },
      { key: 'HUR', description: 'Hora' },
      { key: 'MTK', description: 'Metro cuadrado' },
      { key: 'MTQ', description: 'Metro cúbico' },
      { key: 'GRM', description: 'Gramo' },
      { key: 'PR', description: 'Par' },
      { key: 'DPC', description: 'Docenas de piezas' },
      { key: 'xun', description: 'Unidad' },
    ];

    if (!term) return units;

    const lowerTerm = term.toLowerCase();
    return units.filter(
      u =>
        u.key.toLowerCase().includes(lowerTerm) ||
        u.description.toLowerCase().includes(lowerTerm),
    );
  }

  async searchProductKeys(term: string): Promise<ProductKeySuggestion[]> {
    try {
      // Factura Green no tiene endpoint de búsqueda de catálogos
      // Usamos el endpoint público de FacturaAPI que tiene los catálogos oficiales del SAT
      const response = await fetch(
        `https://www.facturapi.io/v2/catalogs/products?q=${encodeURIComponent(term)}&limit=20`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        // Fallback a catálogo estático
        return this.getStaticProductKeys(term);
      }

      const data = await response.json();
      return (data.data || []).map((item: any) => ({
        key: item.key,
        description: item.name || item.description,
        score: item.score,
      }));
    } catch (error) {
      console.error('Product keys search error:', error);
      return this.getStaticProductKeys(term);
    }
  }

  private getStaticProductKeys(term: string): ProductKeySuggestion[] {
    const products = [
      { key: '01010101', description: 'No existe en el catálogo' },
      { key: '80141600', description: 'Servicios de consultoría' },
      { key: '80141601', description: 'Servicios de consultoría de negocios y administración corporativa' },
      { key: '80141602', description: 'Servicios de consultoría de mercadotecnia' },
      { key: '80141603', description: 'Servicios de consultoría de administración de recursos humanos' },
      { key: '80141604', description: 'Servicios de consultoría de producción' },
      { key: '80141605', description: 'Servicios de consultoría de administración de cadena de suministros' },
      { key: '81112000', description: 'Servicios de desarrollo de software' },
      { key: '81112001', description: 'Servicios de desarrollo de software de aplicación' },
      { key: '81112002', description: 'Servicios de desarrollo de software de sistemas y aplicaciones de usuario' },
      { key: '81161500', description: 'Servicios de diseño gráfico' },
      { key: '43230000', description: 'Computadoras' },
      { key: '43211500', description: 'Computadoras portátiles' },
      { key: '84111506', description: 'Servicios de facturación' },
      { key: '84101600', description: 'Financiación de ayudas' },
    ];

    if (!term) return products.slice(0, 10);

    const lowerTerm = term.toLowerCase();
    return products
      .filter(
        p =>
          p.key.includes(term) ||
          p.description.toLowerCase().includes(lowerTerm),
      )
      .slice(0, 20);
  }

  async createCustomer(customerData: CustomerData): Promise<CustomerResponse> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = this.getHeaders();

      const payload = {
        customer: {
          name: customerData.legal_name,
          taxId: customerData.tax_id,
          email: customerData.email || '',
          zipCode: customerData.address?.zip?.toString() || '',
          taxRegime: {
            k: customerData.tax_system || '601',
          },
          cfdiUse: {
            k: customerData.default_invoice_use || 'G03',
          },
        },
      };

      const response = await fetch(`${baseUrl}/interop/customer/add`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const message = data.error?.message || 'Error creating customer in Factura Green';
        throw new BadRequestException(message);
      }

      return {
        id: data.data.uuid,
        created_at: data.data.createdAt || new Date().toISOString(),
        livemode: true,
        legal_name: customerData.legal_name,
        tax_id: customerData.tax_id,
        tax_system: customerData.tax_system,
        email: customerData.email,
        phone: customerData.phone,
        default_invoice_use: customerData.default_invoice_use,
        address: customerData.address,
      };
    } catch (error: any) {
      console.error('Factura Green Create Customer Error:', error);
      const message = error?.message ?? 'Error creating customer in Factura Green';
      throw new BadRequestException(message);
    }
  }

  async updateCustomer(
    customerId: string,
    customerData: Partial<CustomerData>,
  ): Promise<CustomerResponse> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = this.getHeaders();

      const payload: any = {
        customer: {
          uuid: customerId,
        },
      };

      if (customerData.legal_name) payload.customer.name = customerData.legal_name;
      if (customerData.email) payload.customer.email = customerData.email;
      if (customerData.address?.zip) payload.customer.zipCode = customerData.address.zip.toString();
      if (customerData.tax_system) payload.customer.taxRegime = { k: customerData.tax_system };
      if (customerData.default_invoice_use) payload.customer.cfdiUse = { k: customerData.default_invoice_use };

      const response = await fetch(`${baseUrl}/interop/customer/update`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const message = data.error?.message || 'Error updating customer in Factura Green';
        throw new BadRequestException(message);
      }

      return {
        id: customerId,
        created_at: new Date().toISOString(),
        livemode: true,
        legal_name: customerData.legal_name || '',
        tax_id: customerData.tax_id || '',
        tax_system: customerData.tax_system,
        email: customerData.email,
        phone: customerData.phone,
        default_invoice_use: customerData.default_invoice_use,
        address: customerData.address,
      };
    } catch (error: any) {
      console.error('Factura Green Update Customer Error:', error);
      const message = error?.message ?? 'Error updating customer in Factura Green';
      throw new BadRequestException(message);
    }
  }

  async listCustomers(): Promise<CustomerResponse[]> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = this.getHeaders();

      const response = await fetch(`${baseUrl}/interop/customer/all`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return [];
      }

      return (data.data || []).map((customer: any) => ({
        id: customer.uuid,
        created_at: customer.createdAt || new Date().toISOString(),
        livemode: true,
        legal_name: customer.name,
        tax_id: customer.taxId,
        tax_system: customer.taxRegime?.k,
        email: customer.email,
        phone: customer.phone,
        default_invoice_use: customer.cfdiUse?.k,
        address: {
          zip: customer.zipCode,
        },
      }));
    } catch (error: any) {
      console.error('Factura Green List Customers Error:', error);
      return [];
    }
  }

  async deleteCustomer(customerId: string): Promise<void> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = this.getHeaders();

      const payload = {
        customer: {
          uuid: customerId,
        },
      };

      const response = await fetch(`${baseUrl}/interop/customer/delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const message = data.error?.message || 'Error deleting customer in Factura Green';
        throw new BadRequestException(message);
      }
    } catch (error: any) {
      console.error('Factura Green Delete Customer Error:', error);
      const message = error?.message ?? 'Error deleting customer in Factura Green';
      throw new BadRequestException(message);
    }
  }

  async createProduct(productData: ProductData): Promise<ProductResponse> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = this.getHeaders();

      const taxes = {
        transferred: productData.taxes?.map(tax => ({
          type: tax.type === 'IVA' ? '002' : tax.type,
          rate: tax.rate,
          factor: 'Tasa',
        })) || [],
      };

      const payload = {
        product: {
          id: productData.sku || `PROD-${Date.now()}`,
          name: productData.description,
          satKey: {
            k: productData.product_key.toString(),
          },
          unit: {
            k: productData.unit_key || 'E48',
          },
          price: {
            type: 'fixed',
            amount: productData.price,
          },
          taxes,
        },
      };

      const response = await fetch(`${baseUrl}/interop/product/add`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const message = data.error?.message || 'Error creating product in Factura Green';
        throw new BadRequestException(message);
      }

      return {
        id: data.data.uuid,
        created_at: data.data.createdAt || new Date().toISOString(),
        livemode: true,
        description: productData.description,
        product_key: productData.product_key,
        unit_key: productData.unit_key || 'E48',
        price: productData.price,
        tax_included: productData.tax_included || false,
        taxability: productData.taxability,
        taxes: productData.taxes,
        unit_name: productData.unit_name,
        sku: productData.sku,
      };
    } catch (error: any) {
      console.error('Factura Green Create Product Error:', error);
      const message = error?.message ?? 'Error creating product in Factura Green';
      throw new BadRequestException(message);
    }
  }

  async findProductBySku(sku: string): Promise<ProductResponse | null> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = this.getHeaders();

      const payload = {
        product: {
          id: sku,
        },
      };

      const response = await fetch(`${baseUrl}/interop/product/get`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return null;
      }

      const product = data.data;
      return {
        id: product.uuid,
        created_at: product.createdAt || new Date().toISOString(),
        livemode: true,
        description: product.name,
        product_key: product.satKey?.k || '01010101',
        unit_key: product.unit?.k || 'E48',
        price: product.price?.amount || 0,
        tax_included: false,
        sku: product.id,
      };
    } catch (error: any) {
      console.error('Factura Green Find Product by SKU Error:', error);
      return null;
    }
  }

  async updateProduct(
    productId: string,
    productData: Partial<ProductData>,
  ): Promise<ProductResponse> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = this.getHeaders();

      const payload: any = {
        product: {
          uuid: productId,
        },
      };

      if (productData.description) payload.product.name = productData.description;
      if (productData.product_key) payload.product.satKey = { k: productData.product_key.toString() };
      if (productData.unit_key) payload.product.unit = { k: productData.unit_key };
      if (productData.price !== undefined) {
        payload.product.price = {
          type: 'fixed',
          amount: productData.price,
        };
      }
      if (productData.taxes) {
        payload.product.taxes = {
          transferred: productData.taxes.map(tax => ({
            type: tax.type === 'IVA' ? '002' : tax.type,
            rate: tax.rate,
            factor: 'Tasa',
          })),
        };
      }

      const response = await fetch(`${baseUrl}/interop/product/update`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const message = data.error?.message || 'Error updating product in Factura Green';
        throw new BadRequestException(message);
      }

      return {
        id: productId,
        created_at: new Date().toISOString(),
        livemode: true,
        description: productData.description || '',
        product_key: productData.product_key || '01010101',
        unit_key: productData.unit_key || 'E48',
        price: productData.price || 0,
        tax_included: productData.tax_included || false,
        taxability: productData.taxability,
        taxes: productData.taxes,
        unit_name: productData.unit_name,
        sku: productData.sku,
      };
    } catch (error: any) {
      console.error('Factura Green Update Product Error:', error);
      const message = error?.message ?? 'Error updating product in Factura Green';
      throw new BadRequestException(message);
    }
  }

  async createReceipt(data: ReceiptData): Promise<ReceiptResponse> {
    throw new BadRequestException('Receipts not supported by Factura Green. Use generateCFDI instead.');
  }

  async cancelReceipt(receiptId: string): Promise<void> {
    throw new BadRequestException('Receipts not supported by Factura Green');
  }
}
