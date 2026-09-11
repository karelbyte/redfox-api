import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotImplementedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  CFDIResponse,
  ICertificationPackService,
  PackCapabilities,
  ProductResponse,
} from '../interfaces/certification-pack.interface';
import { Invoice, InvoiceStatus } from '../models/invoice.entity';
import { InvoiceDetail } from '../models/invoice-detail.entity';
import { Client } from '../models/client.entity';
import { Product } from '../models/product.entity';
import {
  PRODUCT_REPOSITORY,
  SUNAT_API_SERVICE,
} from '../constants/inject-tokens';
import { IProductRepository } from '../interfaces/product-repository.interface';
import {
  ICreateInvoice,
  IItemSunat,
} from '../interfaces/create-invoice-payload.interface';
import {
  ISunatApiService,
  ISunatRequestConfig,
} from '../interfaces/sunat-service.interface';
import { SunatEstado } from '../interfaces/sunat-response.interface';
import { DocumentType } from '../models/document-series.entity';
import {
  resolveCustomerDocument,
  resolveIgvAffectation,
  resolveMeasurementUnit,
  SunatIdentityDocument,
  SunatIgvAffectation,
  SUNAT_DOCUMENT_NAME,
  SUNAT_TAX_NAME,
} from '../constants/sunat-catalogs.constant';
import { DocumentSeriesService } from './document-series.service';
import { TenantContext } from './tenant-context.service';
import { TranslationService } from './translation.service';

/**
 * Valores que la configuración del pack puede ajustar por organización
 * (`certification_packs.config.defaults`), con el comportamiento estándar
 * peruano como respaldo.
 */
const SUNAT_FALLBACKS = {
  /** Moneda del comprobante cuando ni la factura ni el pack la indican. */
  CURRENCY: 'PEN',
  /** Catálogo 51: venta interna. */
  OPERATION_TYPE: '0101',
  /** Tasa de IGV vigente, usada cuando la línea no trae tasa propia. */
  IGV_PERCENTAGE: 18,
} as const;

interface SunatCustomerData {
  name: string;
  documentNumber: string;
  /** Código del catálogo 06 de SUNAT. */
  identityDocument: SunatIdentityDocument;
  /** Comprobante que corresponde al documento del cliente. */
  documentType: DocumentType;
  address: string;
}

@Injectable()
export class FacturaApisunatService implements ICertificationPackService {
  private readonly logger = new Logger(FacturaApisunatService.name);

  /**
   * SUNAT no tiene catálogos de productos ni de clientes —todos los datos
   * viajan dentro del comprobante— ni recibos de venta: cada venta emite
   * boleta o factura numerada por serie.
   */
  public readonly capabilities: Partial<PackCapabilities> = {
    productCatalog: false,
    customerCatalog: false,
    documentSeries: true,
    receipts: false,
    // El PDF y el XML llegan como URLs en la respuesta de SUNAT, no por la API.
    cancellation: false,
    documentDownload: false,
  };

  constructor(
    @Inject(SUNAT_API_SERVICE)
    private readonly sunatApi: ISunatApiService,
    private readonly configService: ConfigService,
    private readonly tenantContext: TenantContext,
    private readonly translationService: TranslationService,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository<Product>,
  ) {}

  public async generateCFDI(invoice: Invoice): Promise<CFDIResponse> {
    const requestConfig = this.getRequestConfig();
    const requestBody = await this.createRequestBody(invoice);

    this.logger.log(
      `[SUNAT] Emitiendo ${requestBody.documento} ${requestBody.serie}-${requestBody.numero} para la factura ${invoice.code}`,
    );
    this.logger.debug(`[SUNAT] payload: ${JSON.stringify(requestBody)}`);

    const { success, message, payload } = await this.sunatApi.createInvoice(
      requestBody,
      requestConfig,
    );

    this.logger.log(
      `[SUNAT] Respuesta para ${requestBody.serie}-${requestBody.numero}: estado=${payload?.estado} success=${success}`,
    );

    return {
      // Identificador del comprobante en SUNAT. El hash se conserva en
      // `pack_invoice_response`; como identificador se usa serie-número, que
      // es lo que permite recuperar el documento más adelante.
      id: DocumentSeriesService.format(requestBody.serie, requestBody.numero),
      // SUNAT no emite un folio fiscal tipo UUID (eso es del CFDI mexicano).
      uuid: null,
      status: this.mapEstadoToInvoiceStatus(payload?.estado),
      pdf_url: payload?.pdf?.a4,
      xml_url: payload?.xml,
      message,
      payload_send: requestBody,
      // El hash y el CDR son la constancia de recepción de SUNAT: se
      // conservan en `pack_invoice_response`.
      raw: {
        estado: payload?.estado,
        hash: payload?.hash,
        cdr: payload?.cdr,
        pdf_ticket_url: payload?.pdf?.ticket,
      },
    };
  }

  private getRequestConfig(): ISunatRequestConfig {
    const packConfig = this.tenantContext.getPacConfig();

    if (!packConfig?.sunat_api_key) {
      throw new InternalServerErrorException(
        'SUNAT config not found for the current tenant',
      );
    }

    // TODO(base_url): debe poder resolverse por tenant desde
    // `certification_packs.config` para permitir sandbox y producción a la vez.
    const baseUrl = this.configService.get<string>('SAND_BOX_SUNAT');

    if (!baseUrl) {
      throw new InternalServerErrorException(
        'SAND_BOX_SUNAT is not configured',
      );
    }

    return {
      url: `${baseUrl.replace(/\/+$/, '')}/api/v3/documents`,
      headers: {
        Authorization: `Bearer ${packConfig.sunat_api_key}`,
      },
    };
  }

  private async createRequestBody(invoice: Invoice): Promise<ICreateInvoice> {
    const customer = await this.resolveCustomer(invoice.client);
    const document = await this.resolveDocument(invoice, customer);
    const defaults = this.getConfiguredDefaults();

    return {
      documento: SUNAT_DOCUMENT_NAME[document.documentType],
      serie: document.series,
      numero: document.number,
      fecha_de_emision: this.formatIssueDate(invoice.date),
      moneda: invoice.currency_code?.toUpperCase() || defaults.currency,
      tipo_operacion: defaults.operationType,
      cliente_tipo_de_documento: customer.identityDocument,
      cliente_numero_de_documento: customer.documentNumber,
      cliente_denominacion: customer.name,
      cliente_direccion: customer.address,
      items: (invoice.details ?? []).map<IItemSunat>((detail) =>
        this.createItem(detail, defaults.igvPercentage),
      ),
      total: Number(invoice.total_amount).toFixed(2),
    };
  }

  private createItem(detail: InvoiceDetail, defaultIgv: number): IItemSunat {
    const taxRate = Number(detail.tax_rate) || 0;

    // De los impuestos del producto se toma el que coincide con la tasa de la
    // línea; es el que describe cómo está afectado ese importe.
    const tax =
      (detail.product?.taxes ?? []).find(
        (item) => Number(item.value) === taxRate,
      ) ?? detail.product?.taxes?.[0];

    const affectation = resolveIgvAffectation(taxRate, tax?.code);

    // Una línea exonerada o inafecta declara 0% de IGV. La tasa por defecto
    // solo entra si la línea está gravada y aun así no trae tasa propia.
    const igvPercentage =
      affectation === SunatIgvAffectation.GRAVADO ? taxRate || defaultIgv : 0;

    return {
      unidad_de_medida: resolveMeasurementUnit(
        detail.product?.measurement_unit?.code,
        detail.product?.measurement_unit?.description,
      ),
      descripcion:
        detail.product?.description?.trim() ||
        detail.product?.name?.trim() ||
        '',
      cantidad: Number(detail.quantity).toString(),
      // `price` en InvoiceDetail es el valor sin impuestos (el IGV se calcula
      // aparte en tax_amount), que es justo el valor unitario que espera SUNAT.
      valor_unitario: Number(detail.price).toFixed(6),
      porcentaje_igv: igvPercentage.toString(),
      codigo_tipo_afectacion_igv: affectation,
      nombre_tributo: SUNAT_TAX_NAME[affectation],
    };
  }

  /**
   * Valores que cada organización puede ajustar en la configuración del pack:
   * `config.defaults = { moneda, tipo_operacion, igv }`.
   */
  private getConfiguredDefaults(): {
    currency: string;
    operationType: string;
    igvPercentage: number;
  } {
    const config = this.tenantContext.getPacConfig();
    const defaults = (config?.defaults ?? {}) as Record<string, unknown>;

    return {
      currency:
        typeof defaults.moneda === 'string' && defaults.moneda
          ? defaults.moneda.toUpperCase()
          : SUNAT_FALLBACKS.CURRENCY,
      operationType:
        typeof defaults.tipo_operacion === 'string' && defaults.tipo_operacion
          ? defaults.tipo_operacion
          : SUNAT_FALLBACKS.OPERATION_TYPE,
      igvPercentage:
        typeof defaults.igv === 'number'
          ? defaults.igv
          : SUNAT_FALLBACKS.IGV_PERCENTAGE,
    };
  }

  /**
   * Extrae los datos fiscales del cliente siguiendo la convención del resto
   * del sistema: se prefiere el registro marcado como `is_main` y, si no hay
   * ninguno, el primero disponible (ver ClientPackSyncService).
   */
  private async resolveCustomer(client?: Client): Promise<SunatCustomerData> {
    const taxData =
      (client?.taxData ?? []).find((item) => item.is_main) ??
      client?.taxData?.[0];
    const address =
      (client?.addresses ?? []).find((item) => item.is_main) ??
      client?.addresses?.[0];

    // TODO(boleta): SUNAT solo admite boleta sin documento de identidad por
    // debajo de 700 PEN; por encima exige DNI. Falta aplicar ese umbral.
    const resolved = resolveCustomerDocument(taxData?.tax_document);

    if (!resolved) {
      const message = await this.translationService.translate(
        'pack.sunat_customer_document_invalid',
        this.tenantContext.getUserId() ?? undefined,
        {
          name: client?.name ?? '',
          document: taxData?.tax_document ?? '',
        },
      );
      throw new BadRequestException(message);
    }

    const streetLine = [
      address?.street,
      address?.exterior_number,
      address?.interior_number,
    ]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(' ');

    return {
      name: (taxData?.tax_name?.trim() || client?.name?.trim()) ?? '',
      documentNumber: resolved.number,
      identityDocument: resolved.identityDocument,
      documentType: resolved.documentType,
      address: [
        streetLine,
        address?.neighborhood?.trim(),
        address?.city?.trim(),
        address?.state?.trim(),
      ]
        .filter(Boolean)
        .join(', '),
    };
  }

  /**
   * Toma el comprobante ya reservado en la factura.
   *
   * El correlativo se reserva antes de encolar la emisión
   * (InvoiceService.generateCFDI) para que un reintento reutilice el mismo
   * número y no deje huecos en la numeración. Se respeta el tipo con el que
   * se reservó: la serie pertenece a ese tipo, aunque el documento del
   * cliente haya cambiado desde entonces.
   */
  private async resolveDocument(
    invoice: Invoice,
    customer: SunatCustomerData,
  ): Promise<{ documentType: DocumentType; series: string; number: number }> {
    if (!invoice.series || !invoice.number) {
      const message = await this.translationService.translate(
        'pack.sunat_document_number_missing',
        this.tenantContext.getUserId() ?? undefined,
        { code: invoice.code },
      );
      throw new InternalServerErrorException(message);
    }

    return {
      documentType:
        (invoice.document_type as DocumentType) ?? customer.documentType,
      series: invoice.series,
      number: invoice.number,
    };
  }

  /**
   * `Invoice.date` es una columna `date`: según el driver llega como string
   * 'YYYY-MM-DD' o como Date. Se normaliza sin pasar por la zona horaria
   * local para no desplazar el día.
   */
  private formatIssueDate(date: Date | string): string {
    if (typeof date === 'string') {
      return date.slice(0, 10);
    }

    return new Date(date).toISOString().slice(0, 10);
  }

  private mapEstadoToInvoiceStatus(estado?: SunatEstado): InvoiceStatus {
    switch (estado) {
      case 'PENDIENTE':
        return InvoiceStatus.PENDING_CFDI;
      case 'RECHAZADO':
        // Defensivo: un rechazo ya se convierte en excepción en
        // SunatApiRequestService antes de llegar aquí.
        return InvoiceStatus.FAILED_CFDI;
      default:
        return InvoiceStatus.SENT;
    }
  }

  public async findProductBySku(sku: string): Promise<ProductResponse | null> {
    const product = await this.productRepository.findBySku(sku);

    return product ? this.toProductResponse(product) : null;
  }

  public async updateProduct(productId: string): Promise<ProductResponse> {
    // SUNAT no mantiene un catálogo de productos: el "id en el pack" es el id
    // local del producto, así que actualizar se resuelve releyendo el local.
    const product = await this.productRepository.findById(productId);

    if (!product) {
      return this.notSupported('updateProduct');
    }

    return this.toProductResponse(product);
  }

  private toProductResponse(product: Product): ProductResponse {
    const taxes = (product.taxes ?? []).map((tax) => ({
      name: tax.name,
      rate: Number(tax.value),
      type: tax.type,
    }));

    return {
      id: product.id,
      description: product.description || product.name,
      product_key: product.code,
      unit_key: resolveMeasurementUnit(
        product.measurement_unit?.code,
        product.measurement_unit?.description,
      ),
      unit_name: product.measurement_unit?.description ?? '',
      price: Number(product.base_price),
      sku: product.sku,
      taxes,
      created_at: (product.created_at ?? new Date()).toISOString(),
      livemode: false,
      metadata: {},
      tax_included: false,
    };
  }

  /**
   * Operaciones del contrato que SUNAT todavía no cubre. Se falla de forma
   * explícita en lugar de devolver `null`, que dejaba pasar respuestas vacías
   * hasta el controlador.
   */
  private async notSupported(operation: string): Promise<never> {
    const message = await this.translationService.translate(
      'pack.sunat_operation_not_supported',
      this.tenantContext.getUserId() ?? undefined,
      { operation },
    );

    throw new NotImplementedException(message);
  }

  public async downloadPDF(): Promise<Buffer> {
    return this.notSupported('downloadPDF');
  }

  public async downloadXML(): Promise<string> {
    return this.notSupported('downloadXML');
  }

  public async cancelCFDI(): Promise<void> {
    return this.notSupported('cancelCFDI');
  }

  public async getCFDIStatus(): Promise<any> {
    return this.notSupported('getCFDIStatus');
  }

  public async validateTaxId(): Promise<boolean> {
    return this.notSupported('validateTaxId');
  }

  public async getTaxRegimes(): Promise<any[]> {
    return this.notSupported('getTaxRegimes');
  }

  public async getProductKeys(): Promise<any[]> {
    return this.notSupported('getProductKeys');
  }

  public async getPaymentForms(): Promise<any[]> {
    return this.notSupported('getPaymentForms');
  }

  public async getUses(): Promise<any[]> {
    return this.notSupported('getUses');
  }

  public async searchMeasurementUnits(): Promise<any[]> {
    return this.notSupported('searchMeasurementUnits');
  }

  public async searchProductKeys(): Promise<any[]> {
    return this.notSupported('searchProductKeys');
  }

  public async createCustomer(): Promise<any> {
    return this.notSupported('createCustomer');
  }

  public async updateCustomer(): Promise<any> {
    return this.notSupported('updateCustomer');
  }

  public async createProduct(): Promise<ProductResponse> {
    return this.notSupported('createProduct');
  }

  public async createReceipt(): Promise<any> {
    return this.notSupported('createReceipt');
  }

  public async cancelReceipt(): Promise<void> {
    return this.notSupported('cancelReceipt');
  }
}
