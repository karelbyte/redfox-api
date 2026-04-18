import { Injectable, BadRequestException, Logger } from '@nestjs/common';
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
  PaymentComplementData,
  PaymentComplementResponse,
  GlobalInvoiceData,
} from '../interfaces/certification-pack.interface';
import { GenerateCFDIOptions } from '../interfaces/factura-green-options.interface';
import { TenantContext } from './tenant-context.service';
import { SatCatalogService } from './sat-catalog.service';
import { TranslationService } from './translation.service';

@Injectable()
export class FacturaGreenService implements ICertificationPackService {
  private readonly logger = new Logger(FacturaGreenService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly tenantContext: TenantContext,
    private readonly satCatalogService: SatCatalogService,
    private readonly translationService: TranslationService,
  ) {}

  private isValidUUID(uuid: string | null | undefined): boolean {
    if (!uuid || typeof uuid !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid.trim());
  }

  private getConfig() {
    const pacConfig = this.tenantContext.getPacConfig();

    return {
      baseUrl:
        this.configService.get<string>('FACTURA_GREEN_BASE_URL') ||
        'https://www',
      businessUuid: pacConfig?.business_uuid,
      accountUuid: pacConfig?.account_uuid || '0000',
      tenantId: pacConfig?.tenant_id || 'www',
    };
  }

  private async getHeaders() {
    const config = this.getConfig();
    const pacConfig = this.tenantContext.getPacConfig();

    if (!config.businessUuid) {
      const msg = await this.translationService.translate(
        'pack.business_uuid_not_configured',
        this.tenantContext.getUserId() ?? undefined,
      );
      throw new BadRequestException(msg);
    }

    if (!pacConfig?.api_key) {
      const msg = await this.translationService.translate(
        'pack.api_key_not_configured_fg',
        this.tenantContext.getUserId() ?? undefined,
      );
      throw new BadRequestException(msg);
    }

    return {
      'Content-Type': 'application/json',
      'x-application-key': pacConfig.api_key,
      'x-application-business-uuid': config.businessUuid,
      'x-application-account-uuid': config.accountUuid,
    };
  }

  private getBaseUrl(): string {
    const config = this.getConfig();
    // Limpieza estricta de espacios para evitar dobles 'https://'
    const tenantId = (config.tenantId || 'www').trim();
    if (tenantId.startsWith('http://') || tenantId.startsWith('https://')) {
      return tenantId;
    }
    return `https://${tenantId}`;
  }

  async generateCFDI(
    invoice: Invoice,
    options?: GenerateCFDIOptions,
  ): Promise<CFDIResponse> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = await this.getHeaders();

      if (!invoice.client?.pack_client_id) {
        const msg = await this.translationService.translate(
          'pack.customer_not_synced',
          this.tenantContext.getUserId() ?? undefined,
        );
        throw new BadRequestException(msg);
      }

      // Validar que todos los productos estén sincronizados antes de construir los items
      for (const detail of invoice.details) {
        const productPackId = (detail.product as any)?.product_pack_id;
        if (!productPackId) {
          const msg = await this.translationService.translate(
            'pack.product_not_synced',
            this.tenantContext.getUserId() ?? undefined,
            {
              name: detail.product?.name || detail.product_id,
            },
          );
          throw new BadRequestException(msg);
        }
      }

      // Construir items con soporte para casos especiales
      const items = invoice.details.map((detail) => {
        const productPackId = (detail.product as any)?.product_pack_id;

        const item: any = {
          uuid: productPackId,
          qty: detail.quantity,
          // Siempre enviar el precio para cubrir productos con price.type = 'dynamic' en Factura Green.
          // Para productos 'fixed', Factura Green acepta el precio como override sin problema.
          price: {
            amount:
              options?.itemPrices?.[detail.product_id] ?? Number(detail.price),
          },
        };

        // CASO 2: Descuentos (porcentaje o monto fijo)
        // Los descuentos se pasan a través de las opciones por producto
        if (
          options?.itemDiscounts &&
          options.itemDiscounts[detail.product_id]
        ) {
          const discount = options.itemDiscounts[detail.product_id];
          // Si el descuento es menor a 1, asumimos que es porcentaje (0.10 = 10%)
          if (discount < 1) {
            item.discount = `${(discount * 100).toFixed(2)}%`;
          } else {
            // Si es mayor o igual a 1, es monto fijo
            item.discount = discount;
          }
        }

        // CASO 3: Cambiar descripción del producto
        if (
          options?.itemDescriptions &&
          options.itemDescriptions[detail.product_id]
        ) {
          item.desc = options.itemDescriptions[detail.product_id];
        }

        // CASO 4: Productos IEDU (colegiaturas)
        if (options?.ieduData && options.ieduData[detail.product_id]) {
          item.extra = {
            student_name: options.ieduData[detail.product_id].student_name,
            student_popid: options.ieduData[detail.product_id].student_popid,
          };
        }

        return item;
      });

      // Mapear payment_method a forma de pago SAT (cómo se paga)
      const paymentFormMap: Record<string, string> = {
        cash: '01', // Efectivo
        card: '04', // Tarjeta de crédito
        transfer: '03', // Transferencia electrónica
        check: '02', // Cheque nominativo
        credit: '99', // Por definir (obligatorio en PPD)
      };

      // Derivar método de pago SAT (cuándo se paga): PPD para crédito, PUE para el resto
      const isCredit = (invoice.payment_method as string) === 'credit';
      const satPaymentMethod = isCredit ? 'PPD' : 'PUE';
      // Cuando es PPD, la forma de pago DEBE ser '99' (regla SAT CFDI 4.0)
      const satPaymentForm = isCredit
        ? '99'
        : paymentFormMap[invoice.payment_method as string] || '01';

      const payload: any = {
        cfdi: {
          customer: {
            uuid: invoice.client.pack_client_id,
            ...(process.env.NODE_ENV === 'development' && {
              email: 'karelpuerto78@gmail.com',
            }),
          },
          payment: {
            form: {
              k: satPaymentForm,
            },
            method: {
              k: satPaymentMethod,
            },
          },
          items,
          observations: invoice.notes || '',
        },
      };

      // CASO 5: Cambiar dirección del emisor (sucursales)
      if (options?.businessAddress) {
        payload.cfdi.business = {
          address: {
            street: options.businessAddress.street,
            zip: options.businessAddress.zip,
          },
        };
      }

      // CASO 6: Condiciones de pago personalizadas
      if (options?.paymentConditions) {
        payload.cfdi.paymentConditions = options.paymentConditions;
      }

      // CASO 7: Complemento de donatarias
      if (options?.donatarias) {
        payload.cfdi.accessories = {
          '#donat11': {
            auth_number: options.donatarias.auth_number,
            auth_date: options.donatarias.auth_date,
            legend: options.donatarias.legend,
          },
        };
      }

      // CASO 8: Facturas globales (Público en General)
      if (options?.global) {
        payload.cfdi.global = {
          period: {
            k: options.global.period,
          },
          periodicity: {
            k: options.global.periodicity,
          },
          year: {
            k: options.global.year,
          },
        };
      }

      // CASO 9: Configuraciones especiales
      const config: any = {};

      // Modificar fecha de emisión (hasta 72 horas atrás)
      if (options?.emmitDateOffset) {
        config['override.emmitDateOffset'] = options.emmitDateOffset;
      }

      // Override de condiciones de pago
      if (options?.paymentConditions) {
        config['override.paymentConditions'] = true;
      }

      // Configuración para facturas globales
      if (options?.global && options.global.enforceGlobal === false) {
        config['enforce.cfdiGlobal'] = false;
      }

      // Agregar config si tiene valores
      if (Object.keys(config).length > 0) {
        payload['@config'] = config;
      }

      this.logger.log('[FacturaGreen] createInvoice → REQUEST');
      this.logger.log('[FacturaGreen]   url: ' + `${baseUrl}/interop/cfdi/emmit`);
      this.logger.debug('[FacturaGreen]   payload: ' + JSON.stringify(payload, null, 2));

      const response = await fetch(`${baseUrl}/interop/cfdi/emmit`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      this.logger.log(
        `[FacturaGreen] createInvoice → HTTP status ${response.status} ${response.statusText} ok=${response.ok}`,
      );
      this.logger.debug('[FacturaGreen] createInvoice → RESPONSE BODY ' + JSON.stringify(data, null, 2));

      if (!response.ok || data.response !== 'success') {
        const message =
          data.message ||
          data.error?.message ||
          'Error generating CFDI with Factura Green';
        this.logger.error('[FacturaGreen] createInvoice → ERROR RESPONSE ' + JSON.stringify(data, null, 2));
        throw new BadRequestException(message);
      }

      this.logger.log('[FacturaGreen] createInvoice → RESPONSE');
      this.logger.debug('[FacturaGreen]   data.data: ' + JSON.stringify(data.data, null, 2));
      this.logger.log('[FacturaGreen]   folio_tax: ' + (data.data.cfdi?.folio_tax || data.data.folio_tax));
      this.logger.log('[FacturaGreen]   data.data.uuid: ' + data.data.uuid);

      const folioTax = data.data.cfdi?.folio_tax || data.data.folio_tax;
      const dataUuid = data.data.uuid;

      // Estrategia de fallback para UUID:
      // 1. Usar folio_tax si es válido
      // 2. Usar data.data.uuid si folio_tax no es válido pero data.data.uuid sí lo es
      // 3. Usar null si ninguno es válido (pero el CFDI se generó correctamente)
      let uuid = null;
      if (this.isValidUUID(folioTax)) {
        uuid = folioTax;
      } else if (this.isValidUUID(dataUuid)) {
        uuid = dataUuid;
        console.log('[FacturaGreen] Using data.data.uuid as fallback UUID:', uuid);
      } else {
        console.warn('[FacturaGreen] No valid UUID found in response, but CFDI was generated successfully');
      }

      return {
        id: data.data.uuid,
        uuid: uuid,
        status: 'valid',
        pdf_url: data.data.pdf_url,
        xml_url: data.data.xml_url,
        message: 'CFDI generated successfully',
        payload_send: payload,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('Factura Green Error:', error);
      throw new BadRequestException(
        error.message ||
          (await this.translationService.translate(
            'pack.error_generating_cfdi',
            this.tenantContext.getUserId() ?? undefined,
          )),
      );
    }
  }

  async cancelCFDI(uuid: string, reason: string): Promise<void> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = await this.getHeaders();

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

      if (!response.ok || data.response !== 'success') {
        const fallbackMsg = await this.translationService.translate(
          'pack.error_cancelling_cfdi',
          this.tenantContext.getUserId() ?? undefined,
        );
        const message = data.error?.message || fallbackMsg;
        throw new BadRequestException(message);
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('Factura Green Cancel Error:', error);
      throw new BadRequestException(
        await this.translationService.translate(
          'pack.error_cancelling_cfdi',
          this.tenantContext.getUserId() ?? undefined,
        ),
      );
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
      if (error instanceof BadRequestException) throw error;
      console.error('Factura Green Status Error:', error);
      throw new BadRequestException(
        'Error getting CFDI status from Factura Green',
      );
    }
  }

  async downloadPDF(packInvoiceId: string): Promise<Buffer> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = await this.getHeaders();

      const response = await fetch(
        `${baseUrl}/interop/cfdi/${packInvoiceId}/pdf`,
        {
          method: 'GET',
          headers,
        },
      );

      if (!response.ok) {
        throw new BadRequestException(
          'Error downloading PDF from Factura Green',
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('PDF download error:', error);
      throw new BadRequestException(
        await this.translationService.translate(
          'pack.error_downloading_pdf',
          this.tenantContext.getUserId() ?? undefined,
        ),
      );
    }
  }

  async downloadXML(packInvoiceId: string): Promise<string> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = await this.getHeaders();

      const response = await fetch(
        `${baseUrl}/interop/cfdi/${packInvoiceId}/xml`,
        {
          method: 'GET',
          headers,
        },
      );

      if (!response.ok) {
        throw new BadRequestException(
          'Error downloading XML from Factura Green',
        );
      }

      return await response.text();
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('XML download error:', error);
      throw new BadRequestException(
        await this.translationService.translate(
          'pack.error_downloading_xml',
          this.tenantContext.getUserId() ?? undefined,
        ),
      );
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
      {
        key: '605',
        description: 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
      },
      { key: '606', description: 'Arrendamiento' },
      {
        key: '607',
        description: 'Régimen de Enajenación o Adquisición de Bienes',
      },
      { key: '608', description: 'Demás ingresos' },
      {
        key: '610',
        description:
          'Residentes en el Extranjero sin Establecimiento Permanente en México',
      },
      {
        key: '611',
        description: 'Ingresos por Dividendos (socios y accionistas)',
      },
      {
        key: '612',
        description:
          'Personas Físicas con Actividades Empresariales y Profesionales',
      },
      { key: '614', description: 'Ingresos por intereses' },
      {
        key: '615',
        description: 'Régimen de los ingresos por obtención de premios',
      },
      { key: '616', description: 'Sin obligaciones fiscales' },
      {
        key: '620',
        description:
          'Sociedades Cooperativas de Producción que optan por diferir sus ingresos',
      },
      { key: '621', description: 'Incorporación Fiscal' },
      {
        key: '622',
        description: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
      },
      { key: '623', description: 'Opcional para Grupos de Sociedades' },
      { key: '624', description: 'Coordinados' },
      {
        key: '625',
        description:
          'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
      },
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
      {
        key: 'I02',
        description: 'Mobiliario y equipo de oficina por inversiones',
      },
      { key: 'I03', description: 'Equipo de transporte' },
      { key: 'I04', description: 'Equipo de cómputo y accesorios' },
      {
        key: 'I05',
        description: 'Dados, troqueles, moldes, matrices y herramental',
      },
      { key: 'I06', description: 'Comunicaciones telefónicas' },
      { key: 'I07', description: 'Comunicaciones satelitales' },
      { key: 'I08', description: 'Otra maquinaria y equipo' },
      {
        key: 'D01',
        description: 'Honorarios médicos, dentales y gastos hospitalarios',
      },
      {
        key: 'D02',
        description: 'Gastos médicos por incapacidad o discapacidad',
      },
      { key: 'D03', description: 'Gastos funerales' },
      { key: 'D04', description: 'Donativos' },
      {
        key: 'D05',
        description:
          'Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)',
      },
      { key: 'D06', description: 'Aportaciones voluntarias al SAR' },
      { key: 'D07', description: 'Primas por seguros de gastos médicos' },
      {
        key: 'D08',
        description: 'Gastos de transportación escolar obligatoria',
      },
      {
        key: 'D09',
        description:
          'Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones',
      },
      {
        key: 'D10',
        description: 'Pagos por servicios educativos (colegiaturas)',
      },
      { key: 'P01', description: 'Por definir' },
      { key: 'S01', description: 'Sin efectos fiscales' },
      { key: 'CP01', description: 'Pagos' },
      { key: 'CN01', description: 'Nómina' },
    ];
  }

  async searchMeasurementUnits(
    term: string,
  ): Promise<MeasurementUnitSuggestion[]> {
    return this.satCatalogService.searchMeasurementUnits(term);
  }

  async searchProductKeys(term: string): Promise<ProductKeySuggestion[]> {
    return this.satCatalogService.searchProductKeys(term);
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
      (u) =>
        u.key.toLowerCase().includes(lowerTerm) ||
        u.description.toLowerCase().includes(lowerTerm),
    );
  }

  private getStaticProductKeys(term: string): ProductKeySuggestion[] {
    const products = [
      { key: '01010101', description: 'No existe en el catálogo' },
      { key: '80141600', description: 'Servicios de consultoría' },
      {
        key: '80141601',
        description:
          'Servicios de consultoría de negocios y administración corporativa',
      },
      {
        key: '80141602',
        description: 'Servicios de consultoría de mercadotecnia',
      },
      {
        key: '80141603',
        description:
          'Servicios de consultoría de administración de recursos humanos',
      },
      {
        key: '80141604',
        description: 'Servicios de consultoría de producción',
      },
      {
        key: '80141605',
        description:
          'Servicios de consultoría de administración de cadena de suministros',
      },
      { key: '81112000', description: 'Servicios de desarrollo de software' },
      {
        key: '81112001',
        description: 'Servicios de desarrollo de software de aplicación',
      },
      {
        key: '81112002',
        description:
          'Servicios de desarrollo de software de sistemas y aplicaciones de usuario',
      },
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
        (p) =>
          p.key.includes(term) ||
          p.description.toLowerCase().includes(lowerTerm),
      )
      .slice(0, 20);
  }

  async createCustomer(customerData: CustomerData): Promise<CustomerResponse> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = await this.getHeaders();
      const url = `${baseUrl}/interop/customer/add`;

      const payload = {
        customer: {
          name: customerData.legal_name?.trim(),
          taxid: customerData.tax_id,
          email: customerData.email || '',
          taxregime: {
            k: customerData.tax_system || '601',
          },
          invoiceuse: {
            k: customerData.default_invoice_use || 'G03',
          },
          address: {
            main: {
              zip: customerData.address?.zip?.toString() || '',
              street: customerData.address?.street || undefined,
            },
          },
        },
      };

      console.log('[FacturaGreen] createCustomer → REQUEST');
      console.log('[FacturaGreen]   URL:', url);
      console.log(
        '[FacturaGreen]   Payload:',
        JSON.stringify(payload, null, 2),
      );

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log(
        '[FacturaGreen] createCustomer → RESPONSE status:',
        response.status,
      );
      console.log('[FacturaGreen]   Body:', JSON.stringify(data, null, 2));

      if (!response.ok || data.response !== 'success') {
        const fallbackMsg = await this.translationService.translate(
          'pack.error_creating_customer',
          this.tenantContext.getUserId() ?? undefined,
        );
        const message = data.message || fallbackMsg;
        console.error('[FacturaGreen] createCustomer → FAILED:', message);
        throw new BadRequestException(message);
      }

      console.log('[FacturaGreen] createCustomer → OK — uuid:', data.data.uuid);

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
        payload_send: payload,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('[FacturaGreen] createCustomer - Error:', error);
      const fallbackMsg = await this.translationService.translate(
        'pack.error_creating_customer',
        this.tenantContext.getUserId() ?? undefined,
      );
      const message = error?.message ?? fallbackMsg;
      throw new BadRequestException(message);
    }
  }

  async updateCustomer(
    customerId: string,
    customerData: Partial<CustomerData>,
  ): Promise<CustomerResponse> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = await this.getHeaders();
      const url = `${baseUrl}/interop/customer/update`;

      // Factura Green requiere TODOS los campos en el update, no es parcial
      const payload = {
        customer: {
          uuid: customerId,
          name: customerData.legal_name?.trim() || '',
          taxid: customerData.tax_id || '',
          email: customerData.email || '',
          phone: customerData.phone || undefined,
          taxregime: {
            k: customerData.tax_system || '601',
          },
          invoiceuse: {
            k: customerData.default_invoice_use || 'G03',
          },
          address: {
            main: {
              zip: customerData.address?.zip?.toString() || '',
              street: customerData.address?.street || undefined,
            },
          },
        },
      };

      console.log('[FacturaGreen] updateCustomer → REQUEST');
      console.log('[FacturaGreen]   URL:', url);
      console.log('[FacturaGreen]   customerId:', customerId);
      console.log(
        '[FacturaGreen]   Payload:',
        JSON.stringify(payload, null, 2),
      );

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log(
        '[FacturaGreen] updateCustomer → RESPONSE status:',
        response.status,
      );
      console.log('[FacturaGreen]   Body:', JSON.stringify(data, null, 2));

      if (!response.ok || data.response !== 'success') {
        const fallbackMsg = await this.translationService.translate(
          'pack.error_updating_customer',
          this.tenantContext.getUserId() ?? undefined,
        );
        const message = data.message || fallbackMsg;
        console.error('[FacturaGreen] updateCustomer → FAILED:', message);
        throw new BadRequestException(message);
      }

      console.log('[FacturaGreen] updateCustomer → OK — uuid:', customerId);

      return {
        id: customerId,
        created_at: new Date().toISOString(),
        livemode: true,
        legal_name: customerData.legal_name?.trim() || '',
        tax_id: customerData.tax_id || '',
        tax_system: customerData.tax_system,
        email: customerData.email,
        phone: customerData.phone,
        default_invoice_use: customerData.default_invoice_use,
        address: customerData.address,
        payload_send: payload,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('[FacturaGreen] updateCustomer - Error:', error);
      const fallbackMsg = await this.translationService.translate(
        'pack.error_updating_customer',
        this.tenantContext.getUserId() ?? undefined,
      );
      const message = error?.message ?? fallbackMsg;
      throw new BadRequestException(message);
    }
  }

  async listCustomers(): Promise<CustomerResponse[]> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = await this.getHeaders();
      const url = `${baseUrl}/interop/customer/all`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });

      const data = await response.json();

      // Factura Green usa "response": "success" en lugar de "success": true
      if (!response.ok || data.response !== 'success') {
        return [];
      }

      // Los clientes están en data.data.customers, no en data.data directamente
      const customersArray = data.data?.customers || [];
      const customers = customersArray.map((customer: any) => ({
        id: customer.uuid,
        created_at: new Date(customer.cd).toISOString(),
        livemode: true,
        legal_name: customer.name,
        tax_id: customer.taxid,
        tax_system: customer.taxregime?.k,
        email: customer.email,
        phone: customer.phone,
        default_invoice_use: customer.invoiceuse?.k,
        address: {
          zip: customer.zipCode,
        },
      }));

      return customers;
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('Factura Green List Customers Error:', error);
      // 🔥 Forzamos la excepción global para que envíe el Email de Error alertando al Admin 🔥
      throw new BadRequestException(
        error.message ||
          (await this.translationService.translate(
            'pack.error_listing_customers',
            this.tenantContext.getUserId() ?? undefined,
          )),
      );
    }
  }

  async deleteCustomer(customerId: string): Promise<void> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = await this.getHeaders();

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

      if (!response.ok || data.response !== 'success') {
        const fallbackMsg = await this.translationService.translate(
          'pack.error_deleting_customer',
          this.tenantContext.getUserId() ?? undefined,
        );
        const message = data.error?.message || fallbackMsg;
        throw new BadRequestException(message);
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('Factura Green Delete Customer Error:', error);
      const fallbackMsg = await this.translationService.translate(
        'pack.error_deleting_customer',
        this.tenantContext.getUserId() ?? undefined,
      );
      const message = error?.message ?? fallbackMsg;
      throw new BadRequestException(message);
    }
  }


  /**
   * Factura Green NO soporta búsqueda de productos por SKU de forma nativa.
   * El endpoint /interop/product/get solo acepta búsqueda por UUID.
   * Por tanto, este método siempre retorna null para indicar "no encontrado por SKU".
   *
   * La sincronización en Factura Green depende exclusivamente del `product_pack_id`
   * (UUID del PAC) que se persiste en el producto tras la primera creación.
   */
  async findProductBySku(_sku: string): Promise<ProductResponse | null> {
    return null;
  }

  async createProduct(productData: ProductData): Promise<ProductResponse> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = await this.getHeaders();

      // Construir objeto de impuestos en formato Factura Green
      const taxes: any = {
        iva_ta: false,
        iva_ra: false,
        isr_ra: false,
        ieps_ta: false,
        ieps_ra: false,
      };

      // Mapear impuestos de nuestro formato al formato de Factura Green
      for (const tax of productData.taxes || []) {
        const rate = (tax.rate * 100).toFixed(2); // Convertir a porcentaje string

        if (tax.type === 'IVA' && !tax.type.includes('RET')) {
          taxes.iva_ta = true;
          taxes.iva_tr = rate;
        } else if (
          tax.type === 'IVA_RET' ||
          (tax.type === 'IVA' && tax.type.includes('RET'))
        ) {
          taxes.iva_ra = true;
          taxes.iva_rr = rate;
        } else if (tax.type === 'ISR' || tax.type.includes('ISR')) {
          taxes.isr_ra = true;
          taxes.isr_rr = rate;
        } else if (tax.type === 'IEPS' && !tax.type.includes('RET')) {
          taxes.ieps_ta = true;
          taxes.ieps_tr = rate;
        } else if (
          tax.type === 'IEPS_RET' ||
          (tax.type === 'IEPS' && tax.type.includes('RET'))
        ) {
          taxes.ieps_ra = true;
          taxes.ieps_rr = rate;
        }
      }

      const payload = {
        product: {
          id: productData.sku || `PROD-${Date.now()}`,
          sku: productData.sku || `PROD-${Date.now()}`,
          type: productData.type || 'S', // S = Servicio, P = Producto
          desc: productData.description,
          sat_class: {
            k: productData.product_key.toString(), // Enviar como string
          },
          sat_unit: {
            k: productData.unit_key || 'E48',
          },
          price: {
            type: 'dynamic',
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

      if (!response.ok || data.response !== 'success') {
        const message =
          data.message ||
          data.error?.message ||
          'Error creating product in Factura Green';
        throw new BadRequestException(message);
      }

      return {
        id: data.data.uuid,
        created_at: data.data.cd || new Date().toISOString(),
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
        payload_send: payload,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('[FacturaGreen] createProduct - Error:', error);
      const fallbackMsg = await this.translationService.translate(
        'pack.error_creating_product',
        this.tenantContext.getUserId() ?? undefined,
      );
      const message = error?.message ?? fallbackMsg;
      throw new BadRequestException(message);
    }
  }

  async updateProduct(
    productId: string,
    productData: Partial<ProductData>,
  ): Promise<ProductResponse> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = await this.getHeaders();

      const payload: any = {
        product: {
          uuid: productId,
        },
      };

      if (productData.description)
        payload.product.desc = productData.description;
      if (productData.product_key)
        payload.product.sat_class = { k: productData.product_key.toString() };
      if (productData.unit_key)
        payload.product.sat_unit = { k: productData.unit_key };
      if (productData.price !== undefined) {
        payload.product.price = {
          type: 'dynamic',
          amount: productData.price,
        };
      }
      if (productData.taxes) {
        const taxes: any = {
          iva_ta: false,
          iva_ra: false,
          isr_ra: false,
          ieps_ta: false,
          ieps_ra: false,
        };
        for (const tax of productData.taxes) {
          const rate = (tax.rate * 100).toFixed(2);
          if (tax.type === 'IVA' && !tax.type.includes('RET')) {
            taxes.iva_ta = true;
            taxes.iva_tr = rate;
          } else if (
            tax.type === 'IVA_RET' ||
            (tax.type === 'IVA' && tax.type.includes('RET'))
          ) {
            taxes.iva_ra = true;
            taxes.iva_rr = rate;
          } else if (tax.type === 'ISR' || tax.type.includes('ISR')) {
            taxes.isr_ra = true;
            taxes.isr_rr = rate;
          } else if (tax.type === 'IEPS' && !tax.type.includes('RET')) {
            taxes.ieps_ta = true;
            taxes.ieps_tr = rate;
          } else if (
            tax.type === 'IEPS_RET' ||
            (tax.type === 'IEPS' && tax.type.includes('RET'))
          ) {
            taxes.ieps_ra = true;
            taxes.ieps_rr = rate;
          }
        }
        payload.product.taxes = taxes;
      }

      const response = await fetch(`${baseUrl}/interop/product/update`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.response !== 'success') {
        const fallbackMsg = await this.translationService.translate(
          'pack.error_updating_product',
          this.tenantContext.getUserId() ?? undefined,
        );
        const message =
          data.error?.message || data.error?.message || fallbackMsg;
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
        payload_send: payload,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('Factura Green Update Product Error:', error);
      const fallbackMsg = await this.translationService.translate(
        'pack.error_updating_product',
        this.tenantContext.getUserId() ?? undefined,
      );
      const message = error?.message ?? fallbackMsg;
      throw new BadRequestException(message);
    }
  }

  async createReceipt(data: ReceiptData): Promise<ReceiptResponse> {
    throw new BadRequestException(
      'Receipts not supported by Factura Green. Use generateCFDI instead.',
    );
  }

  async cancelReceipt(receiptId: string): Promise<void> {
    throw new BadRequestException('Receipts not supported by Factura Green');
  }

  async listProducts(): Promise<ProductResponse[]> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = await this.getHeaders();
      const url = `${baseUrl}/interop/product/all`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok || data.response !== 'success') {
        const fallbackMsg = await this.translationService.translate(
          'pack.error_listing_products',
          this.tenantContext.getUserId() ?? undefined,
        );
        const message = data.message || fallbackMsg;
        throw new BadRequestException(message);
      }

      // Mapear los productos de Factura Green al formato ProductResponse
      const products = data.data?.products || [];

      return products.map((product: any) => ({
        id: product.uuid,
        created_at: new Date().toISOString(),
        livemode: true,
        description: product.name || '',
        product_key: product.s,
        unit_key: product.u,
        unit_name: product.u_str,
        price: product.dp ?? product.p ?? 0,
        tax_included: false,
        sku: product.sku || product.id || '',
        taxes: this.mapFacturaGreenTaxes(product.t),
      }));
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('[FacturaGreen] listProducts - Error:', error);
      const fallbackMsg = await this.translationService.translate(
        'pack.error_listing_products',
        this.tenantContext.getUserId() ?? undefined,
      );
      const message = error?.message ?? fallbackMsg;
      throw new BadRequestException(message);
    }
  }

  private mapFacturaGreenTaxes(taxesObj: any): any[] {
    if (!taxesObj) return [];

    const taxes: any[] = [];

    // IVA Trasladado (cobrado al cliente)
    if (taxesObj.iva_ta && taxesObj.iva_tr && taxesObj.iva_tr.v) {
      const rate = parseFloat(taxesObj.iva_tr.v);
      if (!isNaN(rate) && rate > 0) {
        taxes.push({
          type: 'IVA',
          rate: rate / 100, // Convertir de porcentaje a decimal (16 -> 0.16)
          factor: 'Tasa',
        });
      }
    }

    // IVA Retenido
    if (taxesObj.iva_ra && taxesObj.iva_rr) {
      const rate = parseFloat(taxesObj.iva_rr);
      if (!isNaN(rate) && rate > 0) {
        taxes.push({
          type: 'IVA_RET',
          rate: rate / 100,
          factor: 'Tasa',
        });
      }
    }

    // ISR Retenido
    if (taxesObj.isr_ra && taxesObj.isr_rr) {
      const rate = parseFloat(taxesObj.isr_rr);
      if (!isNaN(rate) && rate > 0) {
        taxes.push({
          type: 'ISR',
          rate: rate / 100,
          factor: 'Tasa',
        });
      }
    }

    // IEPS Trasladado
    if (taxesObj.ieps_ta && taxesObj.ieps_tr) {
      const rate = parseFloat(taxesObj.ieps_tr);
      if (!isNaN(rate) && rate > 0) {
        taxes.push({
          type: 'IEPS',
          rate: rate / 100,
          factor: 'Tasa',
        });
      }
    }

    // IEPS Retenido
    if (taxesObj.ieps_ra && taxesObj.ieps_rr) {
      const rate = parseFloat(taxesObj.ieps_rr);
      if (!isNaN(rate) && rate > 0) {
        taxes.push({
          type: 'IEPS_RET',
          rate: rate / 100,
          factor: 'Tasa',
        });
      }
    }

    return taxes;
  }

  async createGlobalInvoice(data: GlobalInvoiceData): Promise<CFDIResponse> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = await this.getHeaders();

      // Mapeo de periodicidad frontend → clave SAT c_Periodicidad
      const periodicityMap: Record<string, string> = {
        day: '01', // Diario
        week: '02', // Semanal
        fortnight: '03', // Quincenal
        month: '04', // Mensual
        two_months: '05', // Bimestral
      };

      const periodicitySAT = periodicityMap[data.periodicity];
      if (!periodicitySAT) {
        throw new BadRequestException(
          `Periodicidad no válida: "${data.periodicity}". Valores permitidos: day, week, fortnight, month, two_months`,
        );
      }

      // Determinar el período (mes) y año desde la fecha "from"
      // Para periodicidad mensual: period = mes (01-12), year = año
      const fromDate = data.from ? new Date(data.from) : new Date();
      const month = String(fromDate.getMonth() + 1).padStart(2, '0'); // 01-12
      const year = String(fromDate.getFullYear());

      // Buscar el cliente XAXX010101000 (Público en General) en el PAC
      let publicCustomerUuid: string | null = null;
      try {
        const customers = (await this.listCustomers?.()) ?? [];
        const publicCustomer = customers.find(
          (c) =>
            c.tax_id === 'XAXX010101000' ||
            c.legal_name?.toUpperCase().includes('PUBLICO EN GENERAL'),
        );
        if (publicCustomer) {
          publicCustomerUuid = publicCustomer.id;
        }
      } catch {
        // Si falla la búsqueda, continuamos — el PAC puede tener el cliente por defecto
      }

      if (!publicCustomerUuid) {
        throw new BadRequestException(
          'No se encontró el cliente "PÚBLICO EN GENERAL" (XAXX010101000) en Factura Green. ' +
            'Verifica que el cliente esté registrado en el PAC.',
        );
      }

      // Calcular el total de las ventas del período (viene en data.receipts como monto total)
      // Si no viene monto, usamos 0 — el caller debe pasar el total
      const totalAmount = (data as any).totalAmount ?? 0;

      if (totalAmount <= 0) {
        throw new BadRequestException(
          'El monto total de las ventas del período debe ser mayor a cero.',
        );
      }

      // Producto genérico "VENTA" — Factura Green aplica las reglas SAT automáticamente
      // (clave 01010101, descripción VENTA) cuando enforce.cfdiGlobal = true (default)
      // Necesitamos un producto registrado en el PAC — buscamos uno con clave 01010101
      let ventaProductUuid: string | null = null;
      try {
        const products = (await this.listProducts?.()) ?? [];
        const ventaProduct = products.find(
          (p) => String(p.product_key) === '01010101',
        );
        if (ventaProduct) {
          ventaProductUuid = ventaProduct.id;
        }
      } catch {
        // Continuar
      }

      if (!ventaProductUuid) {
        throw new BadRequestException(
          'No se encontró un producto con clave SAT "01010101" (VENTA) en Factura Green. ' +
            'Crea un producto con esa clave en el PAC para poder emitir facturas globales.',
        );
      }

      const payload: any = {
        cfdi: {
          customer: {
            uuid: publicCustomerUuid,
          },
          payment: {
            form: { k: '01' }, // Efectivo — forma de pago de mostrador
            method: { k: 'PUE' },
          },
          global: {
            period: { k: month },
            periodicity: { k: periodicitySAT },
            year: { k: year },
          },
          items: [
            {
              uuid: ventaProductUuid,
              qty: 1,
              price: { amount: totalAmount },
            },
          ],
          observations: `Factura global ${data.from ?? ''} - ${data.to ?? ''}`,
        },
      };

      this.logger.log('[FacturaGreen] createGlobalInvoice → REQUEST');
      this.logger.log('[FacturaGreen]   url: ' + `${baseUrl}/interop/cfdi/emmit`);
      this.logger.debug('[FacturaGreen]   payload: ' + JSON.stringify(payload, null, 2));
      console.log('[FacturaGreen] createGlobalInvoice → REQUEST PAYLOAD', JSON.stringify(payload, null, 2));

      const response = await fetch(`${baseUrl}/interop/cfdi/emmit`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('[FacturaGreen] createGlobalInvoice → RESPONSE RAW', JSON.stringify(result, null, 2));

      this.logger.log(
        `[FacturaGreen] createGlobalInvoice → HTTP status ${response.status} ${response.statusText} ok=${response.ok}`,
      );
      this.logger.debug('[FacturaGreen] createGlobalInvoice → RESPONSE BODY ' + JSON.stringify(result, null, 2));

      if (!response.ok || result.response !== 'success') {
        const message =
          result.message ||
          result.error?.message ||
          'Error al emitir la factura global en Factura Green';
        this.logger.error('[FacturaGreen] createGlobalInvoice → ERROR RESPONSE ' + JSON.stringify(result, null, 2));
        throw new BadRequestException(message);
      }

      this.logger.log('[FacturaGreen] createGlobalInvoice → RESPONSE');
      this.logger.debug('[FacturaGreen]   result.data: ' + JSON.stringify(result.data, null, 2));
      this.logger.log('[FacturaGreen]   folio_tax: ' + (result.data.cfdi?.folio_tax || result.data.folio_tax));
      this.logger.log('[FacturaGreen]   result.data.uuid: ' + result.data.uuid);

      const folioTax = result.data.cfdi?.folio_tax || result.data.folio_tax;
      const dataUuid = result.data.uuid;

      // Estrategia de fallback para UUID:
      // 1. Usar folio_tax si es válido
      // 2. Usar result.data.uuid si folio_tax no es válido pero result.data.uuid sí lo es
      // 3. Usar null si ninguno es válido (pero el CFDI se generó correctamente)
      let uuid = null;
      if (this.isValidUUID(folioTax)) {
        uuid = folioTax;
      } else if (this.isValidUUID(dataUuid)) {
        uuid = dataUuid;
        console.log('[FacturaGreen] Using result.data.uuid as fallback UUID:', uuid);
      } else {
        console.warn('[FacturaGreen] No valid UUID found in global invoice response, but CFDI was generated successfully');
      }

      return {
        id: result.data.uuid,
        uuid: uuid,
        status: 'valid',
        pdf_url: result.data.pdf_url,
        xml_url: result.data.xml_url,
        message: 'Factura global emitida exitosamente',
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('Factura Green Global Invoice Error:', error);
      throw new BadRequestException(
        error.message ||
          (await this.translationService.translate(
            'pack.error_global_invoice',
            this.tenantContext.getUserId() ?? undefined,
          )),
      );
    }
  }

  async generatePaymentComplement(
    data: PaymentComplementData,
  ): Promise<PaymentComplementResponse> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = await this.getHeaders();

      const payload = {
        cfdi: {
          uuid: data.cfdi_uuid,
          // delete
          customer: {
            ...(process.env.NODE_ENV === 'development' && {
              email: 'karelpuerto78@gmail.com',
            }),
          },
        },
        payment: {
          number: data.payment_number,
          date: data.payment_date,
          amount: data.amount,
          balance: {
            before: data.balance_before,
            after: data.balance_after,
          },
          form: {
            k: data.payment_form,
          },
          method: {
            k: 'PUE', // El REP siempre es PUE — ya se pagó
          },
        },
      };

      const response = await fetch(`${baseUrl}/interop/cfdi/emmited/payment`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.response !== 'success') {
        const fallbackMsg = await this.translationService.translate(
          'pack.error_payment_complement',
          this.tenantContext.getUserId() ?? undefined,
        );
        const message = result.message || fallbackMsg;
        throw new BadRequestException(message);
      }

      return {
        id: result.data?.payment?.uuid || result.data?.uuid,
        complement_uuid: result.data?.payment?.uuid,
        invoice_uuid: result.data?.uuid,
        pdf_url: result.data?.pdf_url,
        xml_url: result.data?.xml_url,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('Factura Green Payment Complement Error:', error);
      throw new BadRequestException(
        error.message ||
          (await this.translationService.translate(
            'pack.error_payment_complement',
            this.tenantContext.getUserId() ?? undefined,
          )),
      );
    }
  }

  async cancelPaymentComplement(
    complementPackId: string,
    reason: string,
  ): Promise<void> {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = await this.getHeaders();

      const payload = {
        cancel: {
          folio_tax: complementPackId,
          reason: reason || '01',
        },
      };

      const response = await fetch(`${baseUrl}/interop/cfdi/emmited/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.response !== 'success') {
        const fallbackMsg = await this.translationService.translate(
          'pack.error_canceling_payment_complement',
          this.tenantContext.getUserId() ?? undefined,
        );
        const message = data.error?.message || fallbackMsg;
        throw new BadRequestException(message);
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      console.error('Factura Green Cancel Complement Error:', error);
      throw new BadRequestException(
        error.message ||
          (await this.translationService.translate(
            'pack.error_canceling_payment_complement',
            this.tenantContext.getUserId() ?? undefined,
          )),
      );
    }
  }
}
