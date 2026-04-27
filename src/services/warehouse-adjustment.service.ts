import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Like } from 'typeorm';
import { WarehouseAdjustment } from '../models/warehouse-adjustment.entity';
import { WarehouseAdjustmentDetail } from '../models/warehouse-adjustment-detail.entity';
import { Warehouse } from '../models/warehouse.entity';
import { Product } from '../models/product.entity';
import { Inventory } from '../models/inventory.entity';
import {
  ProductHistory,
  OperationType,
} from '../models/product-history.entity';
import { CreateWarehouseAdjustmentDto } from '../dtos/warehouse-adjustment/create-warehouse-adjustment.dto';
import { WarehouseAdjustmentResponseDto } from '../dtos/warehouse-adjustment/warehouse-adjustment-response.dto';
import { WarehouseAdjustmentDetailResponseDto } from '../dtos/warehouse-adjustment/warehouse-adjustment-detail-response.dto';
import { CreateWarehouseAdjustmentDetailDto } from '../dtos/warehouse-adjustment/create-warehouse-adjustment-detail.dto';
import { UpdateWarehouseAdjustmentDetailDto } from '../dtos/warehouse-adjustment/update-warehouse-adjustment-detail.dto';
import { WarehouseAdjustmentDetailQueryDto } from '../dtos/warehouse-adjustment/warehouse-adjustment-detail-query.dto';
import { WarehouseAdjustmentQueryDto } from '../dtos/warehouse-adjustment/warehouse-adjustment-query.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponseDto } from '../dtos/common/paginated-response.dto';
import { WarehouseMapper } from './mappers/warehouse.mapper';
import { ProductMapper } from './mappers/product.mapper';
import { TranslationService } from './translation.service';
import { TenantContext } from './tenant-context.service';
import { UserAttributionService } from './user-attribution.service';

@Injectable()
export class WarehouseAdjustmentService {
  constructor(
    @InjectRepository(WarehouseAdjustment)
    private warehouseAdjustmentRepository: Repository<WarehouseAdjustment>,
    @InjectRepository(WarehouseAdjustmentDetail)
    private warehouseAdjustmentDetailRepository: Repository<WarehouseAdjustmentDetail>,
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(ProductHistory)
    private productHistoryRepository: Repository<ProductHistory>,
    private dataSource: DataSource,
    private warehouseMapper: WarehouseMapper,
    private productMapper: ProductMapper,
    private translationService: TranslationService,
    private readonly tenantContext: TenantContext,
    private readonly userAttributionService: UserAttributionService,
  ) {}

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

  async create(
    createDto: CreateWarehouseAdjustmentDto,
    userId: string,
  ): Promise<WarehouseAdjustmentResponseDto> {

    const sourceWarehouse = await this.warehouseRepository.findOne({
      where: {
        id: createDto.sourceWarehouseId,
        organization_id: this.organizationId,
      },
    });
    if (!sourceWarehouse) {
      throw new NotFoundException(
        await this.translationService.translate(
          'warehouse.source_not_found_or_closed',
          userId,
        ),
      );
    }

    const targetWarehouse = await this.warehouseRepository.findOne({
      where: {
        id: createDto.targetWarehouseId,
        organization_id: this.organizationId,
      },
    });
    if (!targetWarehouse) {
      throw new NotFoundException(
        await this.translationService.translate(
          'warehouse.target_not_found_or_closed',
          userId,
        ),
      );
    }

    if (createDto.sourceWarehouseId === createDto.targetWarehouseId) {
      throw new BadRequestException(
        this.translationService.translate(
          'warehouse_adjustment.same_warehouse_error',
          userId,
        ),
      );
    }

    const code = createDto.code || (await this.generateUniqueCode());

    const adjustment = this.warehouseAdjustmentRepository.create({
      code,
      sourceWarehouseId: createDto.sourceWarehouseId,
      targetWarehouseId: createDto.targetWarehouseId,
      date: new Date(createDto.date),
      description: createDto.description,
      status: false,
      organization_id: this.organizationId,
      created_by: userId || null,
    });

    const savedAdjustment =
      await this.warehouseAdjustmentRepository.save(adjustment);

    return this.findOne(savedAdjustment.id, userId);
  }

  async createDetail(
    adjustmentId: string,
    createDetailDto: CreateWarehouseAdjustmentDetailDto,
    userId: string,
  ): Promise<WarehouseAdjustmentDetailResponseDto> {
    
    const adjustment = await this.warehouseAdjustmentRepository.findOne({
      where: { id: adjustmentId, organization_id: this.organizationId },
    });
    if (!adjustment) {
      throw new NotFoundException(
        this.translationService.translate(
          'warehouse_adjustment.not_found',
          userId,
          { id: adjustmentId },
        ),
      );
    }

    const product = await this.productRepository.findOne({
      where: {
        id: createDetailDto.productId,
        organization_id: this.organizationId,
      },
    });
    if (!product) {
      throw new NotFoundException(
        this.translationService.translate('product.not_found', userId, {
          id: createDetailDto.productId,
        }),
      );
    }

    const existingDetail =
      await this.warehouseAdjustmentDetailRepository.findOne({
        where: {
          warehouseAdjustment: { id: adjustmentId },
          product: { id: createDetailDto.productId },
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

    let detailToSave: WarehouseAdjustmentDetail;

    if (existingDetail) {
     
      const oldQuantity = Number(existingDetail.quantity);
      const oldPrice = Number(existingDetail.price);
      const newQuantity = Number(createDetailDto.quantity);
      const newPrice = Number(createDetailDto.price);

      const totalQuantity = oldQuantity + newQuantity;

      const totalAmount = oldQuantity * oldPrice + newQuantity * newPrice;
      const averagePrice = totalAmount / totalQuantity;

      existingDetail.quantity = totalQuantity;
      existingDetail.price = averagePrice;

      detailToSave = existingDetail;
    } else {
      const detail = this.warehouseAdjustmentDetailRepository.create({
        warehouseAdjustment: adjustment,
        product: product,
        quantity: createDetailDto.quantity,
        price: createDetailDto.price,
      });

      detailToSave = detail;
    }

    const savedDetail =
      await this.warehouseAdjustmentDetailRepository.save(detailToSave);

    const detailWithRelations =
      await this.warehouseAdjustmentDetailRepository.findOne({
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

    if (!detailWithRelations) {
      throw new NotFoundException(
        this.translationService.translate(
          'warehouse_adjustment.detail_not_found_after_creation',
          userId,
        ),
      );
    }

    return this.mapDetailToResponseDto(detailWithRelations);
  }

  async findAllDetails(
    adjustmentId: string,
    queryDto: WarehouseAdjustmentDetailQueryDto,
    userId: string,
  ): Promise<PaginatedResponseDto<WarehouseAdjustmentDetailResponseDto>> {
    
    const adjustment = await this.warehouseAdjustmentRepository.findOne({
      where: { id: adjustmentId, organization_id: this.organizationId },
    });
    if (!adjustment) {
      throw new NotFoundException(
        this.translationService.translate(
          'warehouse_adjustment.not_found',
          userId,
          { id: adjustmentId },
        ),
      );
    }

    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.warehouseAdjustmentDetailRepository
      .createQueryBuilder('detail')
      .leftJoinAndSelect('detail.product', 'product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.tax', 'tax')
      .leftJoinAndSelect('product.measurement_unit', 'measurement_unit')
      .innerJoin('detail.warehouseAdjustment', 'adjustment')
      .where('detail.warehouseAdjustmentId = :adjustmentId', { adjustmentId })
      .andWhere('adjustment.organization_id = :orgId', {
        orgId: this.organizationId,
      })
      .orderBy('detail.created_at', 'DESC');

    if (queryDto?.productId) {
      queryBuilder.andWhere('detail.productId = :productId', {
        productId: queryDto.productId,
      });
    }

    const [details, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

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
    adjustmentId: string,
    detailId: string,
    userId: string,
  ): Promise<WarehouseAdjustmentDetailResponseDto> {
    
    const adjustment = await this.warehouseAdjustmentRepository.findOne({
      where: { id: adjustmentId, organization_id: this.organizationId },
    });
    if (!adjustment) {
      throw new NotFoundException(
        this.translationService.translate(
          'warehouse_adjustment.not_found',
          userId,
          { id: adjustmentId },
        ),
      );
    }

    const detail = await this.warehouseAdjustmentDetailRepository.findOne({
      where: { id: detailId, warehouseAdjustment: { id: adjustmentId } },
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
      ],
    });

    if (!detail) {
      throw new NotFoundException(
        this.translationService.translate(
          'warehouse_adjustment.detail_not_found',
          userId,
          { detailId, adjustmentId },
        ),
      );
    }

    return this.mapDetailToResponseDto(detail);
  }

  async updateDetail(
    adjustmentId: string,
    detailId: string,
    updateDetailDto: UpdateWarehouseAdjustmentDetailDto,
    userId: string,
  ): Promise<WarehouseAdjustmentDetailResponseDto> {
    
    const adjustment = await this.warehouseAdjustmentRepository.findOne({
      where: { id: adjustmentId, organization_id: this.organizationId },
    });
    if (!adjustment) {
      throw new NotFoundException(
        this.translationService.translate(
          'warehouse_adjustment.not_found',
          userId,
          { id: adjustmentId },
        ),
      );
    }

    const detail = await this.warehouseAdjustmentDetailRepository.findOne({
      where: { id: detailId, warehouseAdjustment: { id: adjustmentId } },
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
      ],
    });

    if (!detail) {
      throw new NotFoundException(
        this.translationService.translate(
          'warehouse_adjustment.detail_not_found',
          userId,
          { detailId, adjustmentId },
        ),
      );
    }

    if (updateDetailDto.quantity !== undefined) {
      detail.quantity = updateDetailDto.quantity;
    }
    if (updateDetailDto.price !== undefined) {
      detail.price = updateDetailDto.price;
    }

    const updatedDetail =
      await this.warehouseAdjustmentDetailRepository.save(detail);

    return this.mapDetailToResponseDto(updatedDetail);
  }

  async removeDetail(
    adjustmentId: string,
    detailId: string,
    userId: string,
  ): Promise<void> {
    
    const adjustment = await this.warehouseAdjustmentRepository.findOne({
      where: { id: adjustmentId, organization_id: this.organizationId },
    });
    if (!adjustment) {
      throw new NotFoundException(
        this.translationService.translate(
          'warehouse_adjustment.not_found',
          userId,
          { id: adjustmentId },
        ),
      );
    }

    const detail = await this.warehouseAdjustmentDetailRepository.findOne({
      where: { id: detailId, warehouseAdjustment: { id: adjustmentId } },
    });

    if (!detail) {
      throw new NotFoundException(
        this.translationService.translate(
          'warehouse_adjustment.detail_not_found',
          userId,
          { detailId, adjustmentId },
        ),
      );
    }

    await this.warehouseAdjustmentDetailRepository.remove(detail);
  }

  async processAdjustment(
    adjustmentId: string,
    userId: string,
  ): Promise<WarehouseAdjustmentResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verificar que el ajuste existe y no ha sido procesado
      const adjustment = await this.warehouseAdjustmentRepository.findOne({
        where: { id: adjustmentId, organization_id: this.organizationId },
        relations: ['details', 'sourceWarehouse', 'targetWarehouse'],
      });

      if (!adjustment) {
        throw new NotFoundException(
          this.translationService.translate(
            'warehouse_adjustment.not_found',
            userId,
            { id: adjustmentId },
          ),
        );
      }

      if (adjustment.status) {
        throw new BadRequestException(
          this.translationService.translate(
            'warehouse_adjustment.already_processed',
            userId,
          ),
        );
      }

      if (!adjustment.details || adjustment.details.length === 0) {
        throw new BadRequestException(
          this.translationService.translate(
            'warehouse_adjustment.no_details_to_process',
            userId,
          ),
        );
      }

      
      for (const detail of adjustment.details) {
        
        const sourceInventory = await this.inventoryRepository.findOne({
          where: {
            product_id: detail.productId,
            warehouse: { id: adjustment.sourceWarehouseId },
            organization_id: this.organizationId,
          },
        });

        if (
          !sourceInventory ||
          Number(sourceInventory.quantity) < Number(detail.quantity)
        ) {
          throw new BadRequestException(
            this.translationService.translate(
              'warehouse_adjustment.insufficient_stock',
              userId,
              { productId: detail.productId },
            ),
          );
        }

        await queryRunner.manager.update(
          Inventory,
          { id: sourceInventory.id, organization_id: this.organizationId },
          {
            quantity:
              Number(sourceInventory.quantity) - Number(detail.quantity),
          },
        );

        
        const targetInventory = await this.inventoryRepository.findOne({
          where: {
            product_id: detail.productId,
            warehouse: { id: adjustment.targetWarehouseId },
            organization_id: this.organizationId,
          },
        });

        if (targetInventory) {
          await queryRunner.manager.update(
            Inventory,
            { id: targetInventory.id, organization_id: this.organizationId },
            {
              quantity:
                Number(targetInventory.quantity) + Number(detail.quantity),
            },
          );
        } else {
          await queryRunner.manager.save(Inventory, {
            product_id: detail.productId,
            warehouse: { id: adjustment.targetWarehouseId },
            quantity: detail.quantity,
            price: detail.price,
            organization_id: this.organizationId,
          });
        }

        
        const sourceHistory = queryRunner.manager.create(ProductHistory, {
          product: { id: detail.productId },
          warehouse: { id: adjustment.sourceWarehouseId },
          operation_type: OperationType.TRANSFER_OUT,
          operation_id: adjustment.id,
          quantity: detail.quantity,
          current_stock:
            Number(sourceInventory.quantity) - Number(detail.quantity),
          organization_id: this.organizationId,
        });

        const targetHistory = queryRunner.manager.create(ProductHistory, {
          product: { id: detail.productId },
          warehouse: { id: adjustment.targetWarehouseId },
          operation_type: OperationType.TRANSFER_IN,
          operation_id: adjustment.id,
          quantity: detail.quantity,
          current_stock:
            (Number(targetInventory?.quantity) || 0) + Number(detail.quantity),
          organization_id: this.organizationId,
        });

        await queryRunner.manager.save([sourceHistory, targetHistory]);
      }

      
      await queryRunner.manager.update(
        WarehouseAdjustment,
        { id: adjustmentId, organization_id: this.organizationId },
        { status: true },
      );

      await queryRunner.commitTransaction();

      
      return this.findOne(adjustmentId, userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    paginationDto: PaginationDto,
    queryDto?: WarehouseAdjustmentQueryDto,
    userId?: string,
  ): Promise<PaginatedResponseDto<WarehouseAdjustmentResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    let authorizedWarehouseIds: string[] = [];
    if (userId) {
      authorizedWarehouseIds = await this.userAttributionService.getAuthorizedWarehouseIds(userId);
    }

    const queryBuilder = this.warehouseAdjustmentRepository
      .createQueryBuilder('adjustment')
      .leftJoinAndSelect('adjustment.sourceWarehouse', 'sourceWarehouse')
      .leftJoinAndSelect('adjustment.targetWarehouse', 'targetWarehouse')
      .leftJoinAndSelect('adjustment.details', 'details')
      .leftJoinAndSelect('details.product', 'product')
      .where('adjustment.organization_id = :orgId', {
        orgId: this.organizationId,
      })
      .orderBy('adjustment.created_at', 'DESC');

    if (queryDto?.sourceWarehouseId) {
      queryBuilder.andWhere(
        'adjustment.sourceWarehouseId = :sourceWarehouseId',
        {
          sourceWarehouseId: queryDto.sourceWarehouseId,
        },
      );
    }

    if (queryDto?.targetWarehouseId) {
      queryBuilder.andWhere(
        'adjustment.targetWarehouseId = :targetWarehouseId',
        {
          targetWarehouseId: queryDto.targetWarehouseId,
        },
      );
    }

    if (queryDto?.startDate) {
      queryBuilder.andWhere('adjustment.date >= :startDate', {
        startDate: queryDto.startDate,
      });
    }

    if (queryDto?.endDate) {
      queryBuilder.andWhere('adjustment.date <= :endDate', {
        endDate: queryDto.endDate,
      });
    }

    const [adjustments, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    let filteredAdjustments = adjustments;
    if (userId && authorizedWarehouseIds.length > 0) {
      filteredAdjustments = adjustments.filter((adjustment) => {
        return authorizedWarehouseIds.includes(adjustment.sourceWarehouseId) ||
               authorizedWarehouseIds.includes(adjustment.targetWarehouseId);
      });
    } else if (userId) {
      filteredAdjustments = [];
    }

    const responseDtos = filteredAdjustments.map((adjustment) =>
      this.mapToResponseDto(adjustment),
    );

    return {
      data: responseDtos,
      meta: {
        page,
        limit,
        total: userId ? filteredAdjustments.length : total,
        totalPages: Math.ceil((userId ? filteredAdjustments.length : total) / limit),
      },
    };
  }

  async findOne(
    id: string,
    userId: string,
  ): Promise<WarehouseAdjustmentResponseDto> {
    const adjustment = await this.warehouseAdjustmentRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: [
        'sourceWarehouse',
        'targetWarehouse',
        'details',
        'details.product',
      ],
    });

    if (!adjustment) {
      throw new NotFoundException(
        this.translationService.translate(
          'warehouse_adjustment.not_found',
          userId,
          { id },
        ),
      );
    }

    return this.mapToResponseDto(adjustment);
  }

  async remove(id: string, userId: string): Promise<void> {
    const adjustment = await this.warehouseAdjustmentRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['details'],
    });

    if (!adjustment) {
      throw new NotFoundException(
        this.translationService.translate(
          'warehouse_adjustment.not_found',
          userId,
          { id },
        ),
      );
    }

    // No permitir eliminar ajustes que ya han sido procesados
    if (adjustment.status) {
      throw new BadRequestException(
        this.translationService.translate(
          'warehouse_adjustment.cannot_delete_processed',
          userId,
        ),
      );
    }

    await this.warehouseAdjustmentRepository.softDelete({
      id,
      organization_id: this.organizationId,
    });
  }

  private async generateUniqueCode(): Promise<string> {
    const prefix = 'AJU';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const lastAdjustment = await this.warehouseAdjustmentRepository.findOne({
      where: {
        code: Like(`${prefix}${date}%`),
        organization_id: this.organizationId,
      },
      order: { code: 'DESC' },
    });

    let sequence = 1;
    if (lastAdjustment) {
      const lastSequence = parseInt(lastAdjustment.code.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${prefix}${date}${sequence.toString().padStart(4, '0')}`;
  }

  private mapDetailToResponseDto(
    detail: WarehouseAdjustmentDetail,
  ): WarehouseAdjustmentDetailResponseDto {
    return {
      id: detail.id,
      product: this.productMapper.mapToResponseDto(detail.product),
      quantity: detail.quantity,
      price: detail.price,
      created_at: detail.created_at,
    };
  }

  private mapToResponseDto(
    adjustment: WarehouseAdjustment,
  ): WarehouseAdjustmentResponseDto {
    return {
      id: adjustment.id,
      code: adjustment.code,
      sourceWarehouse: this.warehouseMapper.mapToResponseDto(
        adjustment.sourceWarehouse,
      ),
      targetWarehouse: this.warehouseMapper.mapToResponseDto(
        adjustment.targetWarehouse,
      ),
      date: adjustment.date,
      description: adjustment.description,
      status: adjustment.status,
      details:
        adjustment.details?.map((detail) => ({
          id: detail.id,
          product: this.productMapper.mapToResponseDto(detail.product),
          quantity: detail.quantity,
          price: detail.price,
          created_at: detail.created_at,
        })) || [],
      created_at: adjustment.created_at,
    };
  }
}
