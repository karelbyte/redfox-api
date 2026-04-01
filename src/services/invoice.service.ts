import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Invoice, InvoiceStatus } from '../models/invoice.entity';
import { InvoiceDetail } from '../models/invoice-detail.entity';
import { InvoicePayment, InvoicePaymentStatus } from '../models/invoice-payment.entity';
import { Client } from '../models/client.entity';
import { Withdrawal } from '../models/withdrawal.entity';
import { Product } from '../models/product.entity';
import { Tax } from '../models/tax.entity';
import {
  CreateInvoiceDto,
  CreateInvoiceDetailDto,
} from '../dtos/invoice/create-invoice.dto';
import { UpdateInvoiceDto } from '../dtos/invoice/update-invoice.dto';
import { InvoiceResponseDto } from '../dtos/invoice/invoice-response.dto';
import { InvoiceDetailResponseDto } from '../dtos/invoice-detail/invoice-detail-response.dto';
import { CreateInvoiceDetailDto as CreateDetailDto } from '../dtos/invoice-detail/create-invoice-detail.dto';
import { UpdateInvoiceDetailDto } from '../dtos/invoice-detail/create-invoice-detail.dto';
import { InvoiceDetailQueryDto } from '../dtos/invoice-detail/create-invoice-detail.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponseDto } from '../dtos/common/paginated-response.dto';
import { ProductService } from './product.service';
import { ProductMapper } from './mappers/product.mapper';
import { ClientMapper } from './mappers/client.mapper';
import { WithdrawalMapper } from './mappers/withdrawal.mapper';
import { TranslationService } from './translation.service';
import { CertificationPackFactoryService } from './certification-pack-factory.service';
import { ProductPackSyncService } from './product-pack-sync.service';
import { TenantContext } from './tenant-context.service';
import { NotificationService } from './notification.service';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceDetail)
    private readonly invoiceDetailRepository: Repository<InvoiceDetail>,
    @InjectRepository(InvoicePayment)
    private readonly invoicePaymentRepository: Repository<InvoicePayment>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Tax)
    private readonly taxRepository: Repository<Tax>,
    private readonly productService: ProductService,
    private readonly productMapper: ProductMapper,
    private readonly clientMapper: ClientMapper,
    private readonly withdrawalMapper: WithdrawalMapper,
    private readonly translationService: TranslationService,
    private readonly certificationPackFactory: CertificationPackFactoryService,
    private readonly productPackSyncService: ProductPackSyncService,
    private readonly tenantContext: TenantContext,
    private readonly notificationService: NotificationService,
  ) { }

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

  private mapDetailToResponseDto(
    detail: InvoiceDetail,
  ): InvoiceDetailResponseDto {
    const subtotal = Math.round(Number(detail.quantity) * Number(detail.price) * 100) / 100;
    const taxRate = (detail.product as any)?.taxes?.length
      ? (detail.product as any).taxes.reduce((acc: number, tax: any) => {
          if (tax.type === 'PERCENTAGE') return acc + Number(tax.value);
          return acc;
        }, 0)
      : Number(detail.tax_rate) || 0;
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    return {
      id: detail.id,
      quantity: detail.quantity,
      price: detail.price,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      product: this.productMapper.mapToResponseDto(detail.product),
      created_at: detail.created_at,
    };
  }

  private mapToResponseDto(invoice: Invoice): InvoiceResponseDto {
    const mappedDetails = invoice.details?.map((detail) =>
      this.mapDetailToResponseDto(detail),
    );

    const subtotal = mappedDetails?.reduce((s, d) => s + Number(d.subtotal), 0) ?? Number(invoice.subtotal);
    const tax_amount = mappedDetails?.reduce((s, d) => s + Number(d.tax_amount), 0) ?? Number(invoice.tax_amount);
    const total_amount = mappedDetails?.reduce((s, d) => s + Number(d.total), 0) ?? Number(invoice.total_amount);

    return {
      id: invoice.id,
      code: invoice.code,
      date: invoice.date,
      client: this.clientMapper.mapToResponseDto(invoice.client),
      withdrawal: invoice.withdrawal
        ? this.withdrawalMapper.mapToResponseDto(invoice.withdrawal)
        : null,
      subtotal: Math.round(subtotal * 100) / 100,
      tax_amount: Math.round(tax_amount * 100) / 100,
      total_amount: Math.round(total_amount * 100) / 100,
      status: invoice.status,
      cfdi_uuid: invoice.cfdi_uuid,
      pack_invoice_id: invoice.pack_invoice_id ?? null,
      pack_invoice_response: invoice.pack_invoice_response ?? null,
      payment_method: invoice.payment_method,
      payment_conditions: invoice.payment_conditions,
      notes: invoice.notes,
      details: mappedDetails,
      created_at: invoice.created_at,
    };
  }

  private calculateAmounts(details: CreateInvoiceDetailDto[]): {
    subtotal: number;
    tax_amount: number;
    total_amount: number;
  } {
    let subtotal = 0;
    let tax_amount = 0;

    details.forEach((detail) => {
      const detailSubtotal = detail.quantity * detail.price;
      subtotal += detailSubtotal;

      const taxRate = detail.tax_rate || 0;
      const detailTaxAmount = detailSubtotal * (taxRate / 100);
      tax_amount += detailTaxAmount;
    });

    const total_amount = subtotal + tax_amount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax_amount: Math.round(tax_amount * 100) / 100,
      total_amount: Math.round(total_amount * 100) / 100,
    };
  }

  async create(
    createInvoiceDto: CreateInvoiceDto,
    userId?: string,
  ): Promise<InvoiceResponseDto> {
    const { client_id, withdrawal_id, details, ...rest } = createInvoiceDto;

    const client = await this.clientRepository.findOne({
      where: { id: client_id, organization_id: this.organizationId },
    });
    if (!client) {
      const message = await this.translationService.translate(
        'invoice.client_not_found',
        userId,
        { id: client_id },
      );
      throw new NotFoundException(message);
    }

    let withdrawal: Withdrawal | undefined = undefined;
    if (withdrawal_id) {
      const foundWithdrawal = await this.withdrawalRepository.findOne({
        where: { id: withdrawal_id, organization_id: this.organizationId },
      });
      if (!foundWithdrawal) {
        const message = await this.translationService.translate(
          'invoice.withdrawal_not_found',
          userId,
          { id: withdrawal_id },
        );
        throw new NotFoundException(message);
      }
      withdrawal = foundWithdrawal;
    }

    const existingInvoice = await this.invoiceRepository.findOne({
      where: { code: createInvoiceDto.code, organization_id: this.organizationId },
    });
    if (existingInvoice) {
      const message = await this.translationService.translate(
        'invoice.code_exists',
        userId,
        { code: createInvoiceDto.code },
      );
      throw new BadRequestException(message);
    }

    const amounts = this.calculateAmounts(details);

    const invoice = this.invoiceRepository.create({
      code: rest.code,
      date: rest.date,
      client,
      withdrawal: withdrawal || undefined,
      subtotal: amounts.subtotal,
      tax_amount: amounts.tax_amount,
      total_amount: amounts.total_amount,
      status: InvoiceStatus.DRAFT,
      payment_method: rest.payment_method,
      payment_conditions: rest.payment_conditions,
      notes: rest.notes,
      organization_id: this.organizationId,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    for (const detailDto of details) {
      const product = await this.productService.findOneEntity(
        detailDto.product_id,
      );

      const detailSubtotal = detailDto.quantity * detailDto.price;
      const taxRate = detailDto.tax_rate || 0;
      const detailTaxAmount = detailSubtotal * (taxRate / 100);
      const detailTotal = detailSubtotal + detailTaxAmount;

      const detail = this.invoiceDetailRepository.create({
        invoice_id: savedInvoice.id,
        product_id: product.id,
        quantity: detailDto.quantity,
        price: detailDto.price,
        subtotal: Math.round(detailSubtotal * 100) / 100,
        tax_rate: taxRate,
        tax_amount: Math.round(detailTaxAmount * 100) / 100,
        total: Math.round(detailTotal * 100) / 100,
        organization_id: this.organizationId,
      });

      await this.invoiceDetailRepository.save(detail);
    }

    const invoiceWithDetails = await this.invoiceRepository.findOne({
      where: { id: savedInvoice.id },
      relations: [
        'client',
        'withdrawal',
        'details',
        'details.product',
        'details.product.brand',
        'details.product.category',
        'details.product.tax',
        'details.product.measurement_unit',
        'details.product.currency',
      ],
    });

    // Cargar detalles explícitamente sin filtro de soft delete
    if (invoiceWithDetails) {
      invoiceWithDetails.details = await this.invoiceDetailRepository.find({
        where: { invoice_id: invoiceWithDetails.id },
        relations: [
          'product',
          'product.brand',
          'product.category',
          'product.tax',
          'product.measurement_unit',
        ],
        withDeleted: false,
      });
    }

    return this.mapToResponseDto(invoiceWithDetails!);
  }

  async findAll(
    paginationDto: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponseDto<InvoiceResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [invoices, total] = await this.invoiceRepository.findAndCount({
      where: { organization_id: this.organizationId },
      relations: [
        'client',
        'withdrawal',
        'details',
        'details.product',
        'details.product.brand',
        'details.product.category',
        'details.product.taxes',
        'details.product.measurement_unit',
        'details.product.currency',
      ],
      skip,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return {
      data: invoices.map((invoice) => this.mapToResponseDto(invoice)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId?: string): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: [
        'client',
        'withdrawal',
        'details',
        'details.product',
        'details.product.brand',
        'details.product.category',
        'details.product.taxes',
        'details.product.measurement_unit',
        'details.product.currency',
      ],
    });

    if (!invoice) {
      const message = await this.translationService.translate(
        'invoice.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    // Cargar detalles sin filtro de soft delete
    if (invoice.details) {
      invoice.details = await this.invoiceDetailRepository.find({
        where: { invoice_id: invoice.id },
        relations: [
          'product',
          'product.brand',
          'product.category',
          'product.taxes',
          'product.measurement_unit',
        ],
        withDeleted: false,
      });
    }

    return this.mapToResponseDto(invoice);
  }

  async update(
    id: string,
    updateInvoiceDto: UpdateInvoiceDto,
    userId?: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['client', 'withdrawal', 'details'],
    });

    if (!invoice) {
      const message = await this.translationService.translate(
        'invoice.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    if (updateInvoiceDto.client_id) {
      const client = await this.clientRepository.findOne({
        where: { id: updateInvoiceDto.client_id, organization_id: this.organizationId },
      });
      if (!client) {
        const message = await this.translationService.translate(
          'invoice.client_not_found',
          userId,
          { id: updateInvoiceDto.client_id },
        );
        throw new NotFoundException(message);
      }
      invoice.client = client;
    }

    Object.assign(invoice, updateInvoiceDto);
    const updatedInvoice = await this.invoiceRepository.save(invoice);

    const invoiceWithDetails = await this.invoiceRepository.findOne({
      where: { id: updatedInvoice.id },
      relations: [
        'client',
        'withdrawal',
        'details',
        'details.product',
        'details.product.brand',
        'details.product.category',
        'details.product.tax',
        'details.product.measurement_unit',
        'details.product.currency',
      ],
    });

    // Cargar detalles explícitamente sin filtro de soft delete
    if (invoiceWithDetails) {
      invoiceWithDetails.details = await this.invoiceDetailRepository.find({
        where: { invoice_id: invoiceWithDetails.id },
        relations: [
          'product',
          'product.brand',
          'product.category',
          'product.tax',
          'product.measurement_unit',
        ],
        withDeleted: false,
      });
    }

    return this.mapToResponseDto(invoiceWithDetails!);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, organization_id: this.organizationId },
    });

    if (!invoice) {
      const message = await this.translationService.translate(
        'invoice.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    await this.invoiceRepository.softRemove(invoice);
  }

  async convertWithdrawalToInvoice(
    withdrawalId: string,
    invoiceCode: string,
    userId?: string,
  ): Promise<InvoiceResponseDto> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId, organization_id: this.organizationId },
      relations: [
        'client',
        'details',
        'details.product',
        'details.product.taxes',
      ],
    });

    if (!withdrawal) {
      const message = await this.translationService.translate(
        'invoice.withdrawal_not_found',
        userId,
        { id: withdrawalId },
      );
      throw new NotFoundException(message);
    }

    if (!withdrawal.client) {
      const message = await this.translationService.translate(
        'invoice.withdrawal_no_client',
        userId,
        { id: withdrawalId },
      );
      throw new BadRequestException(message);
    }

    // Idempotencia: si ya existe factura para este withdrawal, devolverla
    const existingByWithdrawal = await this.invoiceRepository.findOne({
      where: {
        withdrawal: { id: withdrawalId, organization_id: this.organizationId },
        organization_id: this.organizationId,
      },
      relations: [
        'client',
        'withdrawal',
        'details',
        'details.product',
        'details.product.brand',
        'details.product.category',
        'details.product.tax',
        'details.product.measurement_unit',
        'details.product.currency',
      ],
    });
    if (existingByWithdrawal) {
      return this.mapToResponseDto(existingByWithdrawal);
    }

    const existingByCode = await this.invoiceRepository.findOne({
      where: { code: invoiceCode, organization_id: this.organizationId },
    });
    if (existingByCode) {
      const message = await this.translationService.translate(
        'invoice.code_exists',
        userId,
        { code: invoiceCode },
      );
      throw new BadRequestException(message);
    }

    const details: CreateInvoiceDetailDto[] = withdrawal.details.map(
      (detail) => {
        const taxRate = (detail.product.taxes || []).reduce((acc, tax) => {
          if ((tax as any).type === 'PERCENTAGE') return acc + Number(tax.value);
          return acc;
        }, 0);
        return {
          product_id: detail.product.id,
          quantity: detail.quantity,
          price: detail.price,
          tax_rate: taxRate,
        };
      },
    );

    const amounts = this.calculateAmounts(details);

    const invoice = this.invoiceRepository.create({
      code: invoiceCode,
      date: new Date(),
      client: withdrawal.client,
      withdrawal,
      subtotal: amounts.subtotal,
      tax_amount: amounts.tax_amount,
      total_amount: amounts.total_amount,
      status: InvoiceStatus.DRAFT,
      payment_method: withdrawal.paymentMethod as any,
      organization_id: this.organizationId,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    withdrawal.invoiceId = savedInvoice.id;
    await this.withdrawalRepository.save(withdrawal);

    for (const detailDto of details) {
      const product = await this.productService.findOneEntity(
        detailDto.product_id,
      );

      const detailSubtotal = detailDto.quantity * detailDto.price;
      const taxRate = detailDto.tax_rate || 0;
      const detailTaxAmount = detailSubtotal * (taxRate / 100);
      const detailTotal = detailSubtotal + detailTaxAmount;

      const detail = this.invoiceDetailRepository.create({
        invoice_id: savedInvoice.id,
        product_id: product.id,
        quantity: detailDto.quantity,
        price: detailDto.price,
        subtotal: Math.round(detailSubtotal * 100) / 100,
        tax_rate: taxRate,
        tax_amount: Math.round(detailTaxAmount * 100) / 100,
        total: Math.round(detailTotal * 100) / 100,
        organization_id: this.organizationId,
      });

      await this.invoiceDetailRepository.save(detail);
    }

    const invoiceWithDetails = await this.invoiceRepository.findOne({
      where: { id: savedInvoice.id },
      relations: [
        'client',
        'withdrawal',
        'details',
        'details.product',
        'details.product.brand',
        'details.product.category',
        'details.product.tax',
        'details.product.measurement_unit',
        'details.product.currency',
      ],
    });

    // Cargar detalles explícitamente sin filtro de soft delete
    if (invoiceWithDetails) {
      invoiceWithDetails.details = await this.invoiceDetailRepository.find({
        where: { invoice_id: invoiceWithDetails.id },
        relations: [
          'product',
          'product.brand',
          'product.category',
          'product.tax',
          'product.measurement_unit',
        ],
        withDeleted: false,
      });
    }

    return this.mapToResponseDto(invoiceWithDetails!);
  }

  /**
   * Crea una factura global en el PAC a partir de ventas (withdrawals) que tienen
   * solo nota (pack_receipt_id) y aún no están facturadas. Actualiza cada withdrawal
   * con invoice_id apuntando a la nueva factura global.
   */
  async createGlobalInvoice(
    dto: {
      from?: string;
      to?: string;
      periodicity: string;
      withdrawal_ids?: string[];
    },
    userId?: string,
  ): Promise<InvoiceResponseDto> {
    let withdrawals: Withdrawal[];
    if (dto.withdrawal_ids?.length) {
      withdrawals = await this.withdrawalRepository.find({
        where: dto.withdrawal_ids.map((id) => ({
          id,
          organization_id: this.organizationId,
        })),
        relations: ['client'],
      });
    } else if (dto.from && dto.to) {
      const fromDate = new Date(dto.from);
      // Incluir todo el día final
      const toDate = new Date(dto.to);
      toDate.setHours(23, 59, 59, 999);
      withdrawals = await this.withdrawalRepository
        .createQueryBuilder('w')
        .where('w.organization_id = :organizationId', { organizationId: this.organizationId })
        .andWhere('w.created_at >= :from', { from: fromDate })
        .andWhere('w.created_at <= :to', { to: toDate })
        .andWhere('w.invoice_id IS NULL')
        .andWhere("w.status = 'CLOSED'")
        .getMany();
    } else {
      throw new BadRequestException(
        'Debe enviar withdrawal_ids o from y to para el periodo',
      );
    }

    withdrawals = withdrawals.filter((w) => !w.invoiceId);
    if (!withdrawals.length) {
      throw new BadRequestException(
        'No hay ventas cerradas sin facturar en el periodo indicado',
      );
    }

    // Calcular el total real de las ventas del período
    const totalAmount = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

    const packService = await this.certificationPackFactory.getPackService();
    if (!packService.createGlobalInvoice) {
      throw new BadRequestException('El PAC activo no soporta factura global');
    }

    const from = dto.from ?? withdrawals.reduce(
      (min, w) => !min || new Date(w.created_at) < new Date(min)
        ? w.created_at.toISOString().split('T')[0] : min,
      null as string | null,
    );
    const to = dto.to ?? withdrawals.reduce(
      (max, w) => !max || new Date(w.created_at) > new Date(max)
        ? w.created_at.toISOString().split('T')[0] : max,
      null as string | null,
    );

    const cfdiResult = await packService.createGlobalInvoice({
      from: from ?? undefined,
      to: to ?? undefined,
      periodicity: dto.periodicity as any,
      receipts: withdrawals.map((w) => w.pack_receipt_id!).filter(Boolean),
      totalAmount,
    });

    // Buscar cliente XAXX010101000 (Público en General) en nuestra DB
    const publicClient = await this.clientRepository.findOne({
      where: { organization_id: this.organizationId },
      order: { id: 'ASC' },
    });

    if (!publicClient) {
      throw new BadRequestException(
        'No hay clientes en el sistema; se requiere al menos uno para la factura global',
      );
    }

    const globalCode = `GLOBAL-${(to ?? new Date().toISOString().split('T')[0]).replace(/-/g, '')}`;
    const existingCode = await this.invoiceRepository.findOne({
      where: { code: globalCode, organization_id: this.organizationId },
    });
    const code = existingCode ? `${globalCode}-${Date.now()}` : globalCode;

    const invoice = this.invoiceRepository.create({
      code,
      date: new Date(),
      client: publicClient,
      withdrawal: undefined,
      subtotal: Math.round(totalAmount / 1.16 * 100) / 100,
      tax_amount: Math.round((totalAmount - totalAmount / 1.16) * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
      status: InvoiceStatus.SENT,
      cfdi_uuid: cfdiResult.uuid,
      pack_invoice_id: cfdiResult.id,
      pack_invoice_response: {
        uuid: cfdiResult.uuid,
        status: cfdiResult.status,
        id: cfdiResult.id,
        pdf_url: cfdiResult.pdf_url,
        xml_url: cfdiResult.xml_url,
      },
      payment_method: 'cash' as any,
      organization_id: this.organizationId,
    });
    const savedInvoice = await this.invoiceRepository.save(invoice);

    for (const w of withdrawals) {
      w.invoiceId = savedInvoice.id;
      await this.withdrawalRepository.save(w);
    }

    const invoiceWithDetails = await this.invoiceRepository.findOne({
      where: { id: savedInvoice.id },
      relations: ['client', 'withdrawal', 'details', 'details.product'],
    });
    return this.mapToResponseDto(invoiceWithDetails!);
  }

  async generateCFDI(
    invoiceId: string,
    userId?: string,
    options?: any,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, organization_id: this.organizationId },
      relations: [
        'client',
        'client.taxData',
        'details',
        'details.product',
        'details.product.tax',
      ],
    });

    if (!invoice) {
      const message = await this.translationService.translate(
        'invoice.not_found',
        userId,
        { id: invoiceId },
      );
      throw new NotFoundException(message);
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      const message = await this.translationService.translate(
        'invoice.not_draft',
        userId,
      );
      throw new BadRequestException(message);
    }

    try {
      const packService = await this.certificationPackFactory.getPackService();

      // Auto-sincronizar productos que no tengan product_pack_id
      for (const detail of invoice.details) {
        if (detail.product && !detail.product.product_pack_id) {
          const result = await this.productPackSyncService.syncProduct(detail.product);
          if (result.packSyncSuccess) {
            detail.product.product_pack_id = result.product.product_pack_id;
          } else {
            throw new BadRequestException(
              `No se pudo sincronizar el producto "${detail.product.name}" con Factura Green: ${result.packErrorMessage}`,
            );
          }
        }
      }

      // Pasar opciones especiales al servicio de pack (solo Factura Green las usa)
      const cfdiResult = await packService.generateCFDI(invoice, options);

      invoice.cfdi_uuid = cfdiResult.uuid;
      invoice.pack_invoice_id = cfdiResult.id;
      invoice.pack_invoice_response = {
        uuid: cfdiResult.uuid,
        status: cfdiResult.status,
        pdf_url: cfdiResult.pdf_url,
        xml_url: cfdiResult.xml_url,
      };
      invoice.status = InvoiceStatus.SENT;

      const updatedInvoice = await this.invoiceRepository.save(invoice);

      const invoiceWithDetails = await this.invoiceRepository.findOne({
        where: { id: updatedInvoice.id },
        relations: [
          'client',
          'withdrawal',
          'details',
          'details.product',
          'details.product.brand',
          'details.product.category',
          'details.product.tax',
          'details.product.measurement_unit',
        'details.product.currency',
        ],
      });

      // Cargar detalles explícitamente sin filtro de soft delete
      if (invoiceWithDetails) {
        invoiceWithDetails.details = await this.invoiceDetailRepository.find({
          where: { invoice_id: invoiceWithDetails.id },
          relations: [
            'product',
            'product.brand',
            'product.category',
            'product.tax',
            'product.measurement_unit',
          ],
          withDeleted: false,
        });
      }

      // Notificar al usuario que el CFDI fue generado
      try {
        if (userId) {
          await this.notificationService.createInvoiceNotification(
            `🧾 CFDI generado: ${invoice.code}`,
            `La factura ${invoice.code} fue timbrada exitosamente. UUID: ${cfdiResult.uuid}`,
            updatedInvoice.id,
            userId,
          );
        }
      } catch { /* no bloquear el flujo */ }

      return this.mapToResponseDto(invoiceWithDetails!);
    } catch (error) {
      console.error('Error generating CFDI:', error);
      throw new BadRequestException('Error generating CFDI');
    }
  }

  async cancelCFDI(
    invoiceId: string,
    reason: string,
    userId?: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, organization_id: this.organizationId },
    });

    if (!invoice) {
      const message = await this.translationService.translate(
        'invoice.not_found',
        userId,
        { id: invoiceId },
      );
      throw new NotFoundException(message);
    }

    if (!invoice.cfdi_uuid) {
      const message = await this.translationService.translate(
        'invoice.no_cfdi',
        userId,
      );
      throw new BadRequestException(message);
    }

    // Bloquear cancelación si tiene complementos de pago timbrados activos
    const activePayments = await this.invoicePaymentRepository.find({
      where: {
        invoice_id: invoiceId,
        organization_id: this.organizationId,
        status: InvoicePaymentStatus.STAMPED,
      },
    });

    if (activePayments.length > 0) {
      throw new BadRequestException(
        `No se puede cancelar la factura porque tiene ${activePayments.length} complemento(s) de pago timbrado(s). ` +
        `Cancela los complementos de pago primero.`,
      );
    }

    try {
      const packService = await this.certificationPackFactory.getPackService();
      await packService.cancelCFDI(invoice.cfdi_uuid, reason);

      invoice.status = InvoiceStatus.CANCELLED;
      const updatedInvoice = await this.invoiceRepository.save(invoice);

      // Liberar las ventas asociadas para que puedan volver a facturarse
      await this.withdrawalRepository
        .createQueryBuilder()
        .update()
        .set({ invoiceId: null })
        .where('invoice_id = :invoiceId AND organization_id = :organizationId', {
          invoiceId: invoiceId,
          organizationId: this.organizationId,
        })
        .execute();

      const invoiceWithDetails = await this.invoiceRepository.findOne({
        where: { id: updatedInvoice.id },
        relations: [
          'client',
          'withdrawal',
          'details',
          'details.product',
          'details.product.brand',
          'details.product.category',
          'details.product.tax',
          'details.product.measurement_unit',
          'details.product.currency',
        ],
      });

      if (invoiceWithDetails) {
        invoiceWithDetails.details = await this.invoiceDetailRepository.find({
          where: { invoice_id: invoiceWithDetails.id },
          relations: [
            'product',
            'product.brand',
            'product.category',
            'product.tax',
            'product.measurement_unit',
          ],
          withDeleted: false,
        });
      }

      return this.mapToResponseDto(invoiceWithDetails!);
    } catch (error: any) {
      console.error('Error canceling CFDI:', error);
      // Propagar el mensaje original del PAC
      throw new BadRequestException(error.message || 'Error al cancelar el CFDI');
    }
  }

  async createDetail(
    invoiceId: string,
    createDetailDto: CreateDetailDto,
    userId?: string,
  ): Promise<InvoiceDetailResponseDto> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, organization_id: this.organizationId },
    });
    if (!invoice) {
      const message = await this.translationService.translate(
        'invoice.not_found',
        userId,
        { id: invoiceId },
      );
      throw new NotFoundException(message);
    }

    const product = await this.productService.findOneEntity(
      createDetailDto.product_id,
    );

    const detailSubtotal = createDetailDto.quantity * createDetailDto.price;
    const taxRate = createDetailDto.tax_rate || 0;
    const detailTaxAmount = detailSubtotal * (taxRate / 100);
    const detailTotal = detailSubtotal + detailTaxAmount;

    const detail = this.invoiceDetailRepository.create({
      invoice,
      product,
      quantity: createDetailDto.quantity,
      price: createDetailDto.price,
      subtotal: Math.round(detailSubtotal * 100) / 100,
      tax_rate: taxRate,
      tax_amount: Math.round(detailTaxAmount * 100) / 100,
      total: Math.round(detailTotal * 100) / 100,
      organization_id: this.organizationId,
    });

    const savedDetail = await this.invoiceDetailRepository.save(detail);

    const currentSubtotal = invoice.subtotal || 0;
    const currentTaxAmount = invoice.tax_amount || 0;
    const currentTotal = invoice.total_amount || 0;

    invoice.subtotal =
      Math.round((currentSubtotal + detailSubtotal) * 100) / 100;
    invoice.tax_amount =
      Math.round((currentTaxAmount + detailTaxAmount) * 100) / 100;
    invoice.total_amount = Math.round((currentTotal + detailTotal) * 100) / 100;

    await this.invoiceRepository.save(invoice);

    const detailWithRelations = await this.invoiceDetailRepository.findOne({
      where: { id: savedDetail.id },
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
        'product.prices',
      ],
    });

    return this.mapDetailToResponseDto(detailWithRelations!);
  }

  async findAllDetails(
    invoiceId: string,
    queryDto: InvoiceDetailQueryDto,
    userId?: string,
  ): Promise<PaginatedResponseDto<InvoiceDetailResponseDto>> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, organization_id: this.organizationId },
    });
    if (!invoice) {
      const message = await this.translationService.translate(
        'invoice.not_found',
        userId,
        { id: invoiceId },
      );
      throw new NotFoundException(message);
    }

    const queryBuilder = this.invoiceDetailRepository
      .createQueryBuilder('detail')
      .leftJoinAndSelect('detail.product', 'product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.taxes', 'taxes')
      .leftJoinAndSelect('product.measurement_unit', 'measurementUnit')
      .where('detail.invoice.id = :invoiceId', { invoiceId });

    if (queryDto.product_id) {
      queryBuilder.andWhere('detail.product.id = :productId', {
        productId: queryDto.product_id,
      });
    }

    const details = await queryBuilder.getMany();

    const mappedDetails = details.map((detail) =>
      this.mapDetailToResponseDto(detail),
    );

    return {
      data: mappedDetails,
      meta: {
        total: details.length,
        page: 1,
        limit: details.length,
        totalPages: 1,
      },
    };
  }

  async findOneDetail(
    invoiceId: string,
    detailId: string,
    userId?: string,
  ): Promise<InvoiceDetailResponseDto> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, organization_id: this.organizationId },
    });
    if (!invoice) {
      const message = await this.translationService.translate(
        'invoice.not_found',
        userId,
        { id: invoiceId },
      );
      throw new NotFoundException(message);
    }

    const detail = await this.invoiceDetailRepository.findOne({
      where: {
        id: detailId,
        invoice: { id: invoiceId },
      },
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
        'product.prices',
      ],
    });

    if (!detail) {
      throw new NotFoundException('Invoice detail not found');
    }

    return this.mapDetailToResponseDto(detail);
  }

  async updateDetail(
    invoiceId: string,
    detailId: string,
    updateDetailDto: UpdateInvoiceDetailDto,
    userId?: string,
  ): Promise<InvoiceDetailResponseDto> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, organization_id: this.organizationId },
    });
    if (!invoice) {
      const message = await this.translationService.translate(
        'invoice.not_found',
        userId,
        { id: invoiceId },
      );
      throw new NotFoundException(message);
    }

    const detail = await this.invoiceDetailRepository.findOne({
      where: {
        id: detailId,
        invoice: { id: invoiceId },
      },
      relations: ['product'],
    });

    if (!detail) {
      throw new NotFoundException('Invoice detail not found');
    }

    const oldAmount = detail.total;
    const oldSubtotal = detail.subtotal;
    const oldTaxAmount = detail.tax_amount;

    if (updateDetailDto.product_id) {
      const product = await this.productService.findOneEntity(
        updateDetailDto.product_id,
      );
      detail.product = product;
    }

    if (updateDetailDto.quantity !== undefined) {
      detail.quantity = updateDetailDto.quantity;
    }
    if (updateDetailDto.price !== undefined) {
      detail.price = updateDetailDto.price;
    }
    if (updateDetailDto.tax_rate !== undefined) {
      detail.tax_rate = updateDetailDto.tax_rate;
    }

    const newSubtotal = detail.quantity * detail.price;
    const newTaxAmount = newSubtotal * (detail.tax_rate / 100);
    const newTotal = newSubtotal + newTaxAmount;

    detail.subtotal = Math.round(newSubtotal * 100) / 100;
    detail.tax_amount = Math.round(newTaxAmount * 100) / 100;
    detail.total = Math.round(newTotal * 100) / 100;

    const updatedDetail = await this.invoiceDetailRepository.save(detail);

    const currentSubtotal = invoice.subtotal || 0;
    const currentTaxAmount = invoice.tax_amount || 0;
    const currentTotal = invoice.total_amount || 0;

    invoice.subtotal =
      Math.round((currentSubtotal - oldSubtotal + newSubtotal) * 100) / 100;
    invoice.tax_amount =
      Math.round((currentTaxAmount - oldTaxAmount + newTaxAmount) * 100) / 100;
    invoice.total_amount =
      Math.round((currentTotal - oldAmount + newTotal) * 100) / 100;

    await this.invoiceRepository.save(invoice);

    const detailWithRelations = await this.invoiceDetailRepository.findOne({
      where: { id: updatedDetail.id },
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
        'product.prices',
      ],
    });

    return this.mapDetailToResponseDto(detailWithRelations!);
  }

  async removeDetail(
    invoiceId: string,
    detailId: string,
    userId?: string,
  ): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, organization_id: this.organizationId },
    });
    if (!invoice) {
      const message = await this.translationService.translate(
        'invoice.not_found',
        userId,
        { id: invoiceId },
      );
      throw new NotFoundException(message);
    }

    const detail = await this.invoiceDetailRepository.findOne({
      where: {
        id: detailId,
        invoice: { id: invoiceId },
      },
    });

    if (!detail) {
      throw new NotFoundException('Invoice detail not found');
    }

    const currentSubtotal = invoice.subtotal || 0;
    const currentTaxAmount = invoice.tax_amount || 0;
    const currentTotal = invoice.total_amount || 0;

    invoice.subtotal =
      Math.round((currentSubtotal - detail.subtotal) * 100) / 100;
    invoice.tax_amount =
      Math.round((currentTaxAmount - detail.tax_amount) * 100) / 100;
    invoice.total_amount =
      Math.round((currentTotal - detail.total) * 100) / 100;

    await this.invoiceRepository.save(invoice);
    await this.invoiceDetailRepository.softDelete(detailId);
  }

  async downloadPDF(invoiceId: string, userId?: string): Promise<Buffer> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, organization_id: this.organizationId },
    });

    if (!invoice) {
      const message = await this.translationService.translate(
        'invoice.not_found',
        userId,
        { id: invoiceId },
      );
      throw new NotFoundException(message);
    }

    if (!invoice.pack_invoice_id) {
      throw new BadRequestException(
        'Invoice has not been generated in certification pack',
      );
    }

    const packService = await this.certificationPackFactory.getPackService();
    return await packService.downloadPDF(invoice.pack_invoice_id);
  }

  async downloadXML(invoiceId: string, userId?: string): Promise<string> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, organization_id: this.organizationId },
    });

    if (!invoice) {
      const message = await this.translationService.translate(
        'invoice.not_found',
        userId,
        { id: invoiceId },
      );
      throw new NotFoundException(message);
    }

    if (!invoice.pack_invoice_id) {
      throw new BadRequestException(
        'Invoice has not been generated in certification pack',
      );
    }

    const packService = await this.certificationPackFactory.getPackService();
    return await packService.downloadXML(invoice.pack_invoice_id);
  }
}
