import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like } from 'typeorm';
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
import { CreateWarehouseAdjustmentDetailDto } from '../dtos/warehouse-adjustment/create-warehouse-adjustment-detail.dto';
import { UpdateWarehouseAdjustmentDetailDto } from '../dtos/warehouse-adjustment/update-warehouse-adjustment-detail.dto';
import { WarehouseAdjustmentResponseDto } from '../dtos/warehouse-adjustment/warehouse-adjustment-response.dto';
import { WarehouseAdjustmentDetailResponseDto } from '../dtos/warehouse-adjustment/warehouse-adjustment-detail-response.dto';
import { WarehouseAdjustmentQueryDto } from '../dtos/warehouse-adjustment/warehouse-adjustment-query.dto';
import { WarehouseAdjustmentDetailQueryDto } from '../dtos/warehouse-adjustment/warehouse-adjustment-detail-query.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { WarehouseMapper } from './mappers/warehouse.mapper';
import { ProductMapper } from './mappers/product.mapper';
import { TranslationService } from './translation.service';

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
  ) {}

  async create(
    createDto: CreateWarehouseAdjustmentDto,
    userId: string,
  ): Promise<WarehouseAdjustmentResponseDto> {
    // Validar que los almacenes existan y estén abiertos
    const sourceWarehouse = await this.warehouseRepository.findOne({
      where: { id: createDto.sourceWarehouseId, isOpen: false },
    });
    if (!sourceWarehouse) {
      throw new NotFoundException(
        this.translationService.translate(
          'warehouse.source_not_found_or_closed',
          userId,
        ),
      );
    }

    const targetWarehouse = await this.warehouseRepository.findOne({
      where: { id: createDto.targetWarehouseId, isOpen: false },
    });
    if (!targetWarehouse) {
      throw new NotFoundException(
        this.translationService.translate(
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

    // Generar código único
    const code = createDto.code || (await this.generateUniqueCode());

    // Crear el ajuste
    const adjustment = this.warehouseAdjustmentRepository.create({
      code,
      sourceWarehouseId: createDto.sourceWarehouseId,
      targetWarehouseId: createDto.targetWarehouseId,
      date: new Date(createDto.date),
      description: createDto.description,
      status: false,
    });

    const savedAdjustment =
      await this.warehouseAdjustmentRepository.save(adjustment);

    // Retornar el ajuste creado con sus relaciones
    return this.findOne(savedAdjustment.id, userId);
  }

  async createDetail(
    adjustmentId: string,
    createDetailDto: CreateWarehouseAdjustmentDetailDto,
    userId: string,
  ): Promise<WarehouseAdjustmentDetailResponseDto> {
    // Verificar que el ajuste existe
    const adjustment = await this.warehouseAdjustmentRepository.findOne({
      where: { id: adjustmentId },
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

    // Verificar que el producto existe
    const product = await this.productRepository.findOne({
      where: { id: createDetailDto.productId },
    });
    if (!product) {
      throw new NotFoundException(
        this.translationService.translate('product.not_found', userId, {
          id: createDetailDto.productId,
        }),
      );
    }

    // Verificar si ya existe un detalle con este producto en el ajuste
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
        ],
      });

    let detailToSave: WarehouseAdjustmentDetail;

    if (existingDetail) {
      // El producto ya existe, actualizar cantidad y promediar precio
      const oldQuantity = Number(existingDetail.quantity);
      const oldPrice = Number(existingDetail.price);
      const newQuantity = Number(createDetailDto.quantity);
      const newPrice = Number(createDetailDto.price);

      // Sumar cantidades
      const totalQuantity = oldQuantity + newQuantity;

      // Calcular precio promedio ponderado
      const totalAmount = oldQuantity * oldPrice + newQuantity * newPrice;
      const averagePrice = totalAmount / totalQuantity;

      // Actualizar el detalle existente
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

    // Recargar con relaciones para la respuesta
    const detailWithRelations =
      await this.warehouseAdjustmentDetailRepository.findOne({
        where: { id: savedDetail.id },
        relations: [
          'product',
          'product.brand',
          'product.category',
          'product.tax',
          'product.measurement_unit',
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
  ): Promise<PaginatedResponse<WarehouseAdjustmentDetailResponseDto>> {
    // Verificar que el ajuste existe
    const adjustment = await this.warehouseAdjustmentRepository.findOne({
      where: { id: adjustmentId },
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
      .where('detail.warehouseAdjustmentId = :adjustmentId', { adjustmentId })
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
    // Verificar que el ajuste existe
    const adjustment = await this.warehouseAdjustmentRepository.findOne({
      where: { id: adjustmentId },
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
    // Verificar que el ajuste existe
    const adjustment = await this.warehouseAdjustmentRepository.findOne({
      where: { id: adjustmentId },
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

    // Actualizar campos si se proporcionan
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
    // Verificar que el ajuste existe
    const adjustment = await this.warehouseAdjustmentRepository.findOne({
      where: { id: adjustmentId },
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
        where: { id: adjustmentId },
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

      // Procesar cada detalle
      for (const detail of adjustment.details) {
        // Verificar stock disponible en almacén origen
        const sourceInventory = await this.inventoryRepository.findOne({
          where: {
            product_id: detail.productId,
            warehouse: { id: adjustment.sourceWarehouseId },
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

        // Actualizar inventario del almacén origen (reducir)
        await queryRunner.manager.update(
          Inventory,
          { id: sourceInventory.id },
          {
            quantity:
              Number(sourceInventory.quantity) - Number(detail.quantity),
          },
        );

        // Actualizar o crear inventario del almacén destino
        const targetInventory = await this.inventoryRepository.findOne({
          where: {
            product_id: detail.productId,
            warehouse: { id: adjustment.targetWarehouseId },
          },
        });

        if (targetInventory) {
          await queryRunner.manager.update(
            Inventory,
            { id: targetInventory.id },
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
          });
        }

        // Registrar en historial de productos
        const sourceHistory = queryRunner.manager.create(ProductHistory, {
          product: { id: detail.productId },
          warehouse: { id: adjustment.sourceWarehouseId },
          operation_type: OperationType.TRANSFER_OUT,
          operation_id: adjustment.id,
          quantity: detail.quantity,
          current_stock:
            Number(sourceInventory.quantity) - Number(detail.quantity),
        });

        const targetHistory = queryRunner.manager.create(ProductHistory, {
          product: { id: detail.productId },
          warehouse: { id: adjustment.targetWarehouseId },
          operation_type: OperationType.TRANSFER_IN,
          operation_id: adjustment.id,
          quantity: detail.quantity,
          current_stock:
            (Number(targetInventory?.quantity) || 0) + Number(detail.quantity),
        });

        await queryRunner.manager.save([sourceHistory, targetHistory]);
      }

      // Marcar el ajuste como procesado
      await queryRunner.manager.update(
        WarehouseAdjustment,
        { id: adjustmentId },
        { status: true },
      );

      await queryRunner.commitTransaction();

      // Retornar el ajuste procesado
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
  ): Promise<PaginatedResponse<WarehouseAdjustmentResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.warehouseAdjustmentRepository
      .createQueryBuilder('adjustment')
      .leftJoinAndSelect('adjustment.sourceWarehouse', 'sourceWarehouse')
      .leftJoinAndSelect('adjustment.targetWarehouse', 'targetWarehouse')
      .leftJoinAndSelect('adjustment.details', 'details')
      .leftJoinAndSelect('details.product', 'product')
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

    const responseDtos = adjustments.map((adjustment) =>
      this.mapToResponseDto(adjustment),
    );

    return {
      data: responseDtos,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(
    id: string,
    userId: string,
  ): Promise<WarehouseAdjustmentResponseDto> {
    const adjustment = await this.warehouseAdjustmentRepository.findOne({
      where: { id },
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
      where: { id },
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

    await this.warehouseAdjustmentRepository.softDelete(id);
  }

  private async generateUniqueCode(): Promise<string> {
    const prefix = 'AJU';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // Buscar el último código del día
    const lastAdjustment = await this.warehouseAdjustmentRepository.findOne({
      where: {
        code: Like(`${prefix}${date}%`),
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
