import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quotation, QuotationStatus } from '../models/quotation.entity';
import { QuotationDetail } from '../models/quotation-detail.entity';
import { Client } from '../models/client.entity';
import { Product } from '../models/product.entity';
import { Warehouse } from '../models/warehouse.entity';
import { Withdrawal, WithdrawalStatus } from '../models/withdrawal.entity';
import { WithdrawalDetail } from '../models/withdrawal-detail.entity';
import { CreateQuotationDto } from '../dtos/quotation/create-quotation.dto';
import { UpdateQuotationDto } from '../dtos/quotation/update-quotation.dto';
import { QuotationResponseDto } from '../dtos/quotation/quotation-response.dto';
import { ConvertToSaleResponseDto } from '../dtos/quotation/convert-to-sale-response.dto';
import { QuotationDetailResponseDto } from '../dtos/quotation-detail/quotation-detail-response.dto';
import { CreateQuotationDetailDto } from '../dtos/quotation-detail/create-quotation-detail.dto';
import { UpdateQuotationDetailDto } from '../dtos/quotation-detail/update-quotation-detail.dto';
import { QuotationDetailQueryDto } from '../dtos/quotation-detail/quotation-detail-query.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponseDto } from '../dtos/common/paginated-response.dto';
import { WarehouseMapper } from './mappers/warehouse.mapper';
import { ProductMapper } from './mappers/product.mapper';
import { TranslationService } from './translation.service';
import { TenantContext } from './tenant-context.service';

@Injectable()
export class QuotationService {
  constructor(
    @InjectRepository(Quotation)
    private readonly quotationRepository: Repository<Quotation>,
    @InjectRepository(QuotationDetail)
    private readonly quotationDetailRepository: Repository<QuotationDetail>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(WithdrawalDetail)
    private readonly withdrawalDetailRepository: Repository<WithdrawalDetail>,
    private readonly warehouseMapper: WarehouseMapper,
    private readonly productMapper: ProductMapper,
    private readonly translationService: TranslationService,
    private readonly tenantContext: TenantContext,
  ) { }

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

  private mapDetailToResponseDto(
    detail: QuotationDetail,
  ): QuotationDetailResponseDto {
    return {
      id: detail.id,
      quantity: detail.quantity,
      price: detail.price,
      discount_percentage: detail.discount_percentage,
      discount_amount: detail.discount_amount,
      subtotal: detail.subtotal,
      product: this.productMapper.mapToResponseDto(detail.product),
      created_at: detail.created_at,
    };
  }

  private mapToResponseDto(quotation: Quotation): QuotationResponseDto {
    return {
      id: quotation.id,
      code: quotation.code,
      date: quotation.date,
      valid_until: quotation.valid_until,
      client: quotation.client,
      warehouse: this.warehouseMapper.mapToResponseDto(quotation.warehouse),
      notes: quotation.notes,
      subtotal: quotation.subtotal,
      tax: quotation.tax,
      total: quotation.total,
      status: quotation.status,
      converted_to_sale_id: quotation.converted_to_sale_id,
      created_at: quotation.created_at,
    };
  }

  private calculateDetailSubtotal(
    quantity: number,
    price: number,
    discountPercentage: number = 0,
    discountAmount: number = 0,
  ): number {
    const baseAmount = quantity * price;
    const percentageDiscount = (baseAmount * discountPercentage) / 100;
    const totalDiscount = percentageDiscount + discountAmount;
    return Math.max(0, baseAmount - totalDiscount);
  }

  private async updateQuotationTotals(quotationId: string): Promise<void> {
    const quotation = await this.quotationRepository.findOne({
      where: { id: quotationId, organization_id: this.organizationId },
      relations: ['details', 'details.product', 'details.product.tax'],
    });

    if (!quotation) return;

    let subtotal = 0;
    let totalTax = 0;

    for (const detail of quotation.details) {
      subtotal += Number(detail.subtotal);

      if (detail.product.tax) {
        const taxAmount =
          (Number(detail.subtotal) * Number(detail.product.tax.value)) / 100;
        totalTax += taxAmount;
      }
    }

    quotation.subtotal = Math.round(subtotal * 100) / 100;
    quotation.tax = Math.round(totalTax * 100) / 100;
    quotation.total = Math.round((subtotal + totalTax) * 100) / 100;

    await this.quotationRepository.save(quotation);
  }

  async create(
    createQuotationDto: CreateQuotationDto,
    userId?: string,
  ): Promise<QuotationResponseDto> {
    const client = await this.clientRepository.findOne({
      where: { id: createQuotationDto.client_id, organization_id: this.organizationId },
    });
    if (!client) {
      const message = await this.translationService.translate(
        'quotation.client_not_found',
        userId,
        { clientId: createQuotationDto.client_id },
      );
      throw new NotFoundException(message);
    }

    const warehouse = await this.warehouseRepository.findOne({
      where: { id: createQuotationDto.warehouse_id, organization_id: this.organizationId },
    });
    if (!warehouse) {
      const message = await this.translationService.translate(
        'quotation.warehouse_not_found',
        userId,
        { warehouseId: createQuotationDto.warehouse_id },
      );
      throw new NotFoundException(message);
    }

    const quotation = this.quotationRepository.create({
      code: createQuotationDto.code,
      date: createQuotationDto.date,
      valid_until: createQuotationDto.valid_until,
      client: client,
      warehouse: warehouse,
      notes: createQuotationDto.notes,
      subtotal: 0,
      tax: 0,
      total: 0,
      status: QuotationStatus.DRAFT,
      organization_id: this.organizationId,
    });

    const savedQuotation = await this.quotationRepository.save(quotation);

    const quotationWithRelations = await this.quotationRepository.findOne({
      where: { id: savedQuotation.id, organization_id: this.organizationId },
      relations: ['client', 'warehouse'],
    });

    if (!quotationWithRelations) {
      const message = await this.translationService.translate(
        'quotation.not_found',
        userId,
        { id: savedQuotation.id },
      );
      throw new NotFoundException(message);
    }

    return this.mapToResponseDto(quotationWithRelations);
  }

  async findAll(
    paginationDto: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponseDto<QuotationResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [quotations, total] = await this.quotationRepository.findAndCount({
      where: { organization_id: this.organizationId },
      relations: ['client', 'warehouse'],
      skip,
      take: limit,
      order: {
        created_at: 'DESC',
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: quotations.map((quotation) => this.mapToResponseDto(quotation)),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: string, userId?: string): Promise<QuotationResponseDto> {
    const quotation = await this.quotationRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['client', 'warehouse', 'details'],
    });

    if (!quotation) {
      const message = await this.translationService.translate(
        'quotation.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    return this.mapToResponseDto(quotation);
  }

  async update(
    id: string,
    updateQuotationDto: UpdateQuotationDto,
    userId?: string,
  ): Promise<QuotationResponseDto> {
    const quotation = await this.quotationRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['client', 'warehouse'],
    });

    if (!quotation) {
      const message = await this.translationService.translate(
        'quotation.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    if (updateQuotationDto.client_id) {
      const client = await this.clientRepository.findOne({
        where: { id: updateQuotationDto.client_id, organization_id: this.organizationId },
      });
      if (!client) {
        const message = await this.translationService.translate(
          'quotation.client_not_found',
          userId,
          { clientId: updateQuotationDto.client_id },
        );
        throw new NotFoundException(message);
      }
      quotation.client = client;
    }

    if (updateQuotationDto.warehouse_id) {
      const warehouse = await this.warehouseRepository.findOne({
        where: { id: updateQuotationDto.warehouse_id, organization_id: this.organizationId },
      });
      if (!warehouse) {
        const message = await this.translationService.translate(
          'quotation.warehouse_not_found',
          userId,
          { warehouseId: updateQuotationDto.warehouse_id },
        );
        throw new NotFoundException(message);
      }
      quotation.warehouse = warehouse;
    }

    Object.assign(quotation, {
      code: updateQuotationDto.code,
      date: updateQuotationDto.date,
      valid_until: updateQuotationDto.valid_until,
      notes: updateQuotationDto.notes,
      status: updateQuotationDto.status,
    });

    const updatedQuotation = await this.quotationRepository.save(quotation);
    return this.mapToResponseDto(updatedQuotation);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const quotation = await this.quotationRepository.findOne({
      where: { id, organization_id: this.organizationId },
    });
    if (!quotation) {
      const message = await this.translationService.translate(
        'quotation.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    await this.quotationRepository.softDelete({
      id,
      organization_id: this.organizationId,
    });
  }

  async createDetail(
    quotationId: string,
    createDetailDto: CreateQuotationDetailDto,
    userId?: string,
  ): Promise<QuotationDetailResponseDto> {
    const quotation = await this.quotationRepository.findOne({
      where: { id: quotationId, organization_id: this.organizationId },
    });
    if (!quotation) {
      const message = await this.translationService.translate(
        'quotation.not_found',
        userId,
        { id: quotationId },
      );
      throw new NotFoundException(message);
    }

    const product = await this.productRepository.findOne({
      where: { id: createDetailDto.product_id, organization_id: this.organizationId },
      relations: ['brand', 'category', 'tax', 'measurement_unit'],
    });
    if (!product) {
      const message = await this.translationService.translate(
        'quotation.product_not_found',
        userId,
        { productId: createDetailDto.product_id },
      );
      throw new NotFoundException(message);
    }

    const existingDetail = await this.quotationDetailRepository.findOne({
      where: {
        quotation: { id: quotationId, organization_id: this.organizationId },
        product: { id: createDetailDto.product_id, organization_id: this.organizationId },
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

    let detailToSave: QuotationDetail;

    if (existingDetail) {
      const oldQuantity = Number(existingDetail.quantity);
      const newQuantity = Number(createDetailDto.quantity);
      const totalQuantity = oldQuantity + newQuantity;

      const averagePrice =
        (oldQuantity * Number(existingDetail.price) +
          newQuantity * Number(createDetailDto.price)) /
        totalQuantity;

      existingDetail.quantity = totalQuantity;
      existingDetail.price = averagePrice;
      existingDetail.discount_percentage =
        createDetailDto.discount_percentage || 0;
      existingDetail.discount_amount = createDetailDto.discount_amount || 0;
      existingDetail.subtotal = this.calculateDetailSubtotal(
        totalQuantity,
        averagePrice,
        existingDetail.discount_percentage,
        existingDetail.discount_amount,
      );

      detailToSave = existingDetail;
    } else {
      const subtotal = this.calculateDetailSubtotal(
        createDetailDto.quantity,
        createDetailDto.price,
        createDetailDto.discount_percentage || 0,
        createDetailDto.discount_amount || 0,
      );

      const detail = this.quotationDetailRepository.create({
        quotation: quotation,
        product: product,
        quantity: createDetailDto.quantity,
        price: createDetailDto.price,
        discount_percentage: createDetailDto.discount_percentage || 0,
        discount_amount: createDetailDto.discount_amount || 0,
        subtotal: subtotal,
      });

      detailToSave = detail;
    }

    const savedDetail = await this.quotationDetailRepository.save(detailToSave);
    await this.updateQuotationTotals(quotationId);

    const detailWithRelations = await this.quotationDetailRepository.findOne({
      where: {
        id: savedDetail.id,
        quotation: { id: quotationId, organization_id: this.organizationId },
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

    if (!detailWithRelations) {
      const message = await this.translationService.translate(
        'quotation.detail_not_found',
        userId,
        { detailId: savedDetail.id, quotationId },
      );
      throw new NotFoundException(message);
    }

    return this.mapDetailToResponseDto(detailWithRelations);
  }

  async findAllDetails(
    quotationId: string,
    queryDto: QuotationDetailQueryDto,
    userId?: string,
  ): Promise<PaginatedResponseDto<QuotationDetailResponseDto>> {
    const quotation = await this.quotationRepository.findOne({
      where: { id: quotationId, organization_id: this.organizationId },
    });
    if (!quotation) {
      const message = await this.translationService.translate(
        'quotation.not_found',
        userId,
        { id: quotationId },
      );
      throw new NotFoundException(message);
    }

    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const [details, total] = await this.quotationDetailRepository.findAndCount({
      where: {
        quotation: { id: quotationId, organization_id: this.organizationId },
      },
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
        'product.prices',
      ],
      skip,
      take: limit,
      order: {
        created_at: 'DESC',
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: details.map((detail) => this.mapDetailToResponseDto(detail)),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOneDetail(
    quotationId: string,
    detailId: string,
    userId?: string,
  ): Promise<QuotationDetailResponseDto> {
    const quotation = await this.quotationRepository.findOne({
      where: { id: quotationId, organization_id: this.organizationId },
    });
    if (!quotation) {
      const message = await this.translationService.translate(
        'quotation.not_found',
        userId,
        { id: quotationId },
      );
      throw new NotFoundException(message);
    }

    const detail = await this.quotationDetailRepository.findOne({
      where: {
        id: detailId,
        quotation: { id: quotationId, organization_id: this.organizationId },
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
      const message = await this.translationService.translate(
        'quotation.detail_not_found',
        userId,
        { detailId, quotationId },
      );
      throw new NotFoundException(message);
    }

    return this.mapDetailToResponseDto(detail);
  }

  async updateDetail(
    quotationId: string,
    detailId: string,
    updateDetailDto: UpdateQuotationDetailDto,
    userId?: string,
  ): Promise<QuotationDetailResponseDto> {
    const quotation = await this.quotationRepository.findOne({
      where: { id: quotationId, organization_id: this.organizationId },
    });
    if (!quotation) {
      const message = await this.translationService.translate(
        'quotation.not_found',
        userId,
        { id: quotationId },
      );
      throw new NotFoundException(message);
    }

    const detail = await this.quotationDetailRepository.findOne({
      where: {
        id: detailId,
        quotation: { id: quotationId, organization_id: this.organizationId },
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
      const message = await this.translationService.translate(
        'quotation.detail_not_found',
        userId,
        { detailId, quotationId },
      );
      throw new NotFoundException(message);
    }

    if (updateDetailDto.product_id) {
      const product = await this.productRepository.findOne({
        where: { id: updateDetailDto.product_id, organization_id: this.organizationId },
        relations: ['brand', 'category', 'tax', 'measurement_unit'],
      });
      if (!product) {
        const message = await this.translationService.translate(
          'quotation.product_not_found',
          userId,
          { productId: updateDetailDto.product_id },
        );
        throw new NotFoundException(message);
      }
      detail.product = product;
    }

    if (updateDetailDto.quantity !== undefined) {
      detail.quantity = updateDetailDto.quantity;
    }
    if (updateDetailDto.price !== undefined) {
      detail.price = updateDetailDto.price;
    }
    if (updateDetailDto.discount_percentage !== undefined) {
      detail.discount_percentage = updateDetailDto.discount_percentage;
    }
    if (updateDetailDto.discount_amount !== undefined) {
      detail.discount_amount = updateDetailDto.discount_amount;
    }

    detail.subtotal = this.calculateDetailSubtotal(
      detail.quantity,
      detail.price,
      detail.discount_percentage,
      detail.discount_amount,
    );

    const updatedDetail = await this.quotationDetailRepository.save(detail);
    await this.updateQuotationTotals(quotationId);

    return this.mapDetailToResponseDto(updatedDetail);
  }

  async removeDetail(
    quotationId: string,
    detailId: string,
    userId?: string,
  ): Promise<void> {
    const quotation = await this.quotationRepository.findOne({
      where: { id: quotationId, organization_id: this.organizationId },
    });
    if (!quotation) {
      const message = await this.translationService.translate(
        'quotation.not_found',
        userId,
        { id: quotationId },
      );
      throw new NotFoundException(message);
    }

    const detail = await this.quotationDetailRepository.findOne({
      where: {
        id: detailId,
        quotation: { id: quotationId, organization_id: this.organizationId },
      },
    });

    if (!detail) {
      const message = await this.translationService.translate(
        'quotation.detail_not_found',
        userId,
        { detailId, quotationId },
      );
      throw new NotFoundException(message);
    }

    await this.quotationDetailRepository.softDelete(detailId);
    await this.updateQuotationTotals(quotationId);
  }

  async convertToSale(
    quotationId: string,
    userId?: string,
  ): Promise<ConvertToSaleResponseDto> {
    const quotation = await this.quotationRepository.findOne({
      where: { id: quotationId, organization_id: this.organizationId },
      relations: ['client', 'warehouse', 'details', 'details.product'],
    });

    if (!quotation) {
      const message = await this.translationService.translate(
        'quotation.not_found',
        userId,
        { id: quotationId },
      );
      throw new NotFoundException(message);
    }

    if (quotation.status === QuotationStatus.CONVERTED) {
      const message = await this.translationService.translate(
        'quotation.already_converted',
        userId,
      );
      throw new BadRequestException(message);
    }

    if (quotation.details.length === 0) {
      const message = await this.translationService.translate(
        'quotation.no_products_to_convert',
        userId,
      );
      throw new BadRequestException(message);
    }

    const withdrawal = this.withdrawalRepository.create({
      code: `SALE-${quotation.code}`,
      destination: `Sale from quotation ${quotation.code}`,
      client: quotation.client,
      amount: quotation.total,
      status: WithdrawalStatus.OPEN,
      organization_id: this.organizationId,
    });

    const savedWithdrawal = await this.withdrawalRepository.save(withdrawal);

    for (const detail of quotation.details) {
      const withdrawalDetail = this.withdrawalDetailRepository.create({
        withdrawal: savedWithdrawal,
        product: detail.product,
        warehouse: quotation.warehouse,
        quantity: detail.quantity,
        price: detail.price,
      });

      await this.withdrawalDetailRepository.save(withdrawalDetail);
    }

    quotation.status = QuotationStatus.CONVERTED;
    quotation.converted_to_sale_id = savedWithdrawal.id;
    await this.quotationRepository.save(quotation);

    const message = await this.translationService.translate(
      'quotation.converted_successfully',
      userId,
      { quotationCode: quotation.code, saleCode: savedWithdrawal.code },
    );

    return {
      quotationId: quotation.id,
      quotationCode: quotation.code,
      saleId: savedWithdrawal.id,
      saleCode: savedWithdrawal.code,
      totalProducts: quotation.details.length,
      totalAmount: quotation.total,
      message,
      convertedAt: new Date(),
    };
  }
}
