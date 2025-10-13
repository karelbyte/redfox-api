import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../models/invoice.entity';
import { InvoiceDetail } from '../models/invoice-detail.entity';
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
import { FacturaAPIService } from './facturapi.service';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceDetail)
    private readonly invoiceDetailRepository: Repository<InvoiceDetail>,
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
    private readonly facturaAPIService: FacturaAPIService,
  ) {}

  private mapDetailToResponseDto(
    detail: InvoiceDetail,
  ): InvoiceDetailResponseDto {
    return {
      id: detail.id,
      quantity: detail.quantity,
      price: detail.price,
      subtotal: detail.subtotal,
      tax_rate: detail.tax_rate,
      tax_amount: detail.tax_amount,
      total: detail.total,
      product: this.productMapper.mapToResponseDto(detail.product),
      created_at: detail.created_at,
    };
  }

  private mapToResponseDto(invoice: Invoice): InvoiceResponseDto {
    // Debug temporal - verificar el estado de la relación client
    console.log('🔍 Debug Invoice:', {
      invoiceId: invoice.id,
      invoiceCode: invoice.code,
      hasClient: !!invoice.client,
      clientId: invoice.client?.id,
      clientName: invoice.client?.name,
    });

    return {
      id: invoice.id,
      code: invoice.code,
      date: invoice.date,
      client: this.clientMapper.mapToResponseDto(invoice.client),
      withdrawal: invoice.withdrawal
        ? this.withdrawalMapper.mapToResponseDto(invoice.withdrawal)
        : null,
      subtotal: invoice.subtotal,
      tax_amount: invoice.tax_amount,
      total_amount: invoice.total_amount,
      status: invoice.status,
      cfdi_uuid: invoice.cfdi_uuid,
      facturapi_id: invoice.facturapi_id,
      payment_method: invoice.payment_method,
      payment_conditions: invoice.payment_conditions,
      notes: invoice.notes,
      details: invoice.details?.map((detail) =>
        this.mapDetailToResponseDto(detail),
      ),
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
      where: { id: client_id },
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
        where: { id: withdrawal_id },
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
      where: { code: createInvoiceDto.code },
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
        invoice: savedInvoice,
        product,
        quantity: detailDto.quantity,
        price: detailDto.price,
        subtotal: Math.round(detailSubtotal * 100) / 100,
        tax_rate: taxRate,
        tax_amount: Math.round(detailTaxAmount * 100) / 100,
        total: Math.round(detailTotal * 100) / 100,
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
      ],
    });

    return this.mapToResponseDto(invoiceWithDetails!);
  }

  async findAll(
    paginationDto: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponseDto<InvoiceResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [invoices, total] = await this.invoiceRepository.findAndCount({
      relations: [
        'client',
        'withdrawal',
        'details',
        'details.product',
        'details.product.brand',
        'details.product.category',
        'details.product.tax',
        'details.product.measurement_unit',
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
      where: { id },
      relations: [
        'client',
        'withdrawal',
        'details',
        'details.product',
        'details.product.brand',
        'details.product.category',
        'details.product.tax',
        'details.product.measurement_unit',
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

    return this.mapToResponseDto(invoice);
  }

  async update(
    id: string,
    updateInvoiceDto: UpdateInvoiceDto,
    userId?: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
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
        where: { id: updateInvoiceDto.client_id },
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
      ],
    });

    return this.mapToResponseDto(invoiceWithDetails!);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
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
      where: { id: withdrawalId },
      relations: [
        'client',
        'details',
        'details.product',
        'details.product.tax',
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

    const existingInvoice = await this.invoiceRepository.findOne({
      where: { code: invoiceCode },
    });
    if (existingInvoice) {
      const message = await this.translationService.translate(
        'invoice.code_exists',
        userId,
        { code: invoiceCode },
      );
      throw new BadRequestException(message);
    }

    const details: CreateInvoiceDetailDto[] = withdrawal.details.map(
      (detail) => ({
        product_id: detail.product.id,
        quantity: detail.quantity,
        price: detail.price,
        tax_rate: detail.product.tax?.value || 0,
      }),
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
        invoice: savedInvoice,
        product,
        quantity: detailDto.quantity,
        price: detailDto.price,
        subtotal: Math.round(detailSubtotal * 100) / 100,
        tax_rate: taxRate,
        tax_amount: Math.round(detailTaxAmount * 100) / 100,
        total: Math.round(detailTotal * 100) / 100,
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
      ],
    });

    return this.mapToResponseDto(invoiceWithDetails!);
  }

  async generateCFDI(
    invoiceId: string,
    userId?: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: [
        'client',
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
      const cfdiResult = await this.facturaAPIService.generateCFDI(invoice);

      invoice.cfdi_uuid = cfdiResult.uuid;
      invoice.facturapi_id = cfdiResult.id;
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
        ],
      });

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
      where: { id: invoiceId },
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

    try {
      await this.facturaAPIService.cancelCFDI(invoice.cfdi_uuid, reason);

      invoice.status = InvoiceStatus.CANCELLED;

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
        ],
      });

      return this.mapToResponseDto(invoiceWithDetails!);
    } catch (error) {
      console.error('Error canceling CFDI:', error);
      throw new BadRequestException('Error canceling CFDI');
    }
  }

  async createDetail(
    invoiceId: string,
    createDetailDto: CreateDetailDto,
    userId?: string,
  ): Promise<InvoiceDetailResponseDto> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
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
      where: { id: invoiceId },
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
      .leftJoinAndSelect('product.tax', 'tax')
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
      where: { id: invoiceId },
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
      where: { id: invoiceId },
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
      where: { id: invoiceId },
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
      throw new BadRequestException(
        'Invoice has not been generated in FacturaAPI',
      );
    }

    return await this.facturaAPIService.downloadPDF(invoice.facturapi_id);
  }

  async downloadXML(invoiceId: string, userId?: string): Promise<string> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
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
      throw new BadRequestException(
        'Invoice has not been generated in FacturaAPI',
      );
    }

    return await this.facturaAPIService.downloadXML(invoice.facturapi_id);
  }
}
