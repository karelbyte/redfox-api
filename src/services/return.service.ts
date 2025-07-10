import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like } from 'typeorm';
import { Return } from '../models/return.entity';
import { ReturnDetail } from '../models/return-detail.entity';
import { Warehouse } from '../models/warehouse.entity';
import { Provider } from '../models/provider.entity';
import { Product } from '../models/product.entity';
import { Inventory } from '../models/inventory.entity';
import {
  ProductHistory,
  OperationType,
} from '../models/product-history.entity';
import { CreateReturnDto } from '../dtos/return/create-return.dto';
import { CreateReturnDetailDto } from '../dtos/return/create-return-detail.dto';
import { UpdateReturnDetailDto } from '../dtos/return/update-return-detail.dto';
import { ReturnResponseDto } from '../dtos/return/return-response.dto';
import { ReturnDetailResponseDto } from '../dtos/return/return-detail-response.dto';
import { ReturnQueryDto } from '../dtos/return/return-query.dto';
import { ReturnDetailQueryDto } from '../dtos/return/return-detail-query.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { WarehouseMapper } from './mappers/warehouse.mapper';
import { ProductMapper } from './mappers/product.mapper';
import { ProviderMapper } from './mappers/provider.mapper';

@Injectable()
export class ReturnService {
  constructor(
    @InjectRepository(Return)
    private returnRepository: Repository<Return>,
    @InjectRepository(ReturnDetail)
    private returnDetailRepository: Repository<ReturnDetail>,
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
    @InjectRepository(Provider)
    private providerRepository: Repository<Provider>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(ProductHistory)
    private productHistoryRepository: Repository<ProductHistory>,
    private dataSource: DataSource,
    private warehouseMapper: WarehouseMapper,
    private productMapper: ProductMapper,
    private providerMapper: ProviderMapper,
  ) {}

  async create(createDto: CreateReturnDto): Promise<ReturnResponseDto> {
    // Validar que el almacén exista y esté abierto
    const sourceWarehouse = await this.warehouseRepository.findOne({
      where: { id: createDto.sourceWarehouseId, isOpen: false },
    });
    if (!sourceWarehouse) {
      throw new NotFoundException('Almacén origen no encontrado o cerrado');
    }

    // Validar que el proveedor exista
    const targetProvider = await this.providerRepository.findOne({
      where: { id: createDto.targetProviderId },
    });
    if (!targetProvider) {
      throw new NotFoundException('Proveedor destino no encontrado');
    }

    // Generar código único
    const code = createDto.code || (await this.generateUniqueCode());

    // Crear la devolución
    const return_ = this.returnRepository.create({
      code,
      sourceWarehouseId: createDto.sourceWarehouseId,
      targetProviderId: createDto.targetProviderId,
      date: new Date(createDto.date),
      description: createDto.description,
      status: false,
    });

    const savedReturn = await this.returnRepository.save(return_);

    // Retornar la devolución creada con sus relaciones
    return this.findOne(savedReturn.id);
  }

  async createDetail(
    returnId: string,
    createDetailDto: CreateReturnDetailDto,
  ): Promise<ReturnDetailResponseDto> {
    // Verificar que la devolución existe
    const return_ = await this.returnRepository.findOne({
      where: { id: returnId },
    });
    if (!return_) {
      throw new NotFoundException(`Devolución con ID ${returnId} no encontrada`);
    }

    // Verificar que el producto existe
    const product = await this.productRepository.findOne({
      where: { id: createDetailDto.productId },
    });
    if (!product) {
      throw new NotFoundException(
        `Producto con ID ${createDetailDto.productId} no encontrado`,
      );
    }

    // Verificar si ya existe un detalle con este producto en la devolución
    const existingDetail = await this.returnDetailRepository.findOne({
      where: {
        return: { id: returnId },
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

    let detailToSave: ReturnDetail;

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
      const detail = this.returnDetailRepository.create({
        return: return_,
        product: product,
        quantity: createDetailDto.quantity,
        price: createDetailDto.price,
      });

      detailToSave = detail;
    }

    const savedDetail = await this.returnDetailRepository.save(detailToSave);

    // Recargar con relaciones para la respuesta
    const detailWithRelations = await this.returnDetailRepository.findOne({
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
        'Detalle de devolución no encontrado después de la creación',
      );
    }

    return this.mapDetailToResponseDto(detailWithRelations);
  }

  async findAllDetails(
    returnId: string,
    queryDto: ReturnDetailQueryDto,
  ): Promise<PaginatedResponse<ReturnDetailResponseDto>> {
    // Verificar que la devolución existe
    const return_ = await this.returnRepository.findOne({
      where: { id: returnId },
    });
    if (!return_) {
      throw new NotFoundException(`Devolución con ID ${returnId} no encontrada`);
    }

    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.returnDetailRepository
      .createQueryBuilder('detail')
      .leftJoinAndSelect('detail.product', 'product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.tax', 'tax')
      .leftJoinAndSelect('product.measurement_unit', 'measurement_unit')
      .where('detail.returnId = :returnId', { returnId })
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
    returnId: string,
    detailId: string,
  ): Promise<ReturnDetailResponseDto> {
    // Verificar que la devolución existe
    const return_ = await this.returnRepository.findOne({
      where: { id: returnId },
    });
    if (!return_) {
      throw new NotFoundException(`Devolución con ID ${returnId} no encontrada`);
    }

    const detail = await this.returnDetailRepository.findOne({
      where: { id: detailId, return: { id: returnId } },
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
        `Detalle con ID ${detailId} no encontrado en la devolución ${returnId}`,
      );
    }

    return this.mapDetailToResponseDto(detail);
  }

  async updateDetail(
    returnId: string,
    detailId: string,
    updateDetailDto: UpdateReturnDetailDto,
  ): Promise<ReturnDetailResponseDto> {
    // Verificar que la devolución existe
    const return_ = await this.returnRepository.findOne({
      where: { id: returnId },
    });
    if (!return_) {
      throw new NotFoundException(`Devolución con ID ${returnId} no encontrada`);
    }

    const detail = await this.returnDetailRepository.findOne({
      where: { id: detailId, return: { id: returnId } },
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
        `Detalle con ID ${detailId} no encontrado en la devolución ${returnId}`,
      );
    }

    // Actualizar campos si se proporcionan
    if (updateDetailDto.quantity !== undefined) {
      detail.quantity = updateDetailDto.quantity;
    }
    if (updateDetailDto.price !== undefined) {
      detail.price = updateDetailDto.price;
    }

    const updatedDetail = await this.returnDetailRepository.save(detail);

    return this.mapDetailToResponseDto(updatedDetail);
  }

  async removeDetail(returnId: string, detailId: string): Promise<void> {
    // Verificar que la devolución existe
    const return_ = await this.returnRepository.findOne({
      where: { id: returnId },
    });
    if (!return_) {
      throw new NotFoundException(`Devolución con ID ${returnId} no encontrada`);
    }

    const detail = await this.returnDetailRepository.findOne({
      where: { id: detailId, return: { id: returnId } },
    });

    if (!detail) {
      throw new NotFoundException(
        `Detalle con ID ${detailId} no encontrado en la devolución ${returnId}`,
      );
    }

    await this.returnDetailRepository.remove(detail);
  }

  async processReturn(returnId: string): Promise<ReturnResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verificar que la devolución existe y no ha sido procesada
      const return_ = await this.returnRepository.findOne({
        where: { id: returnId },
        relations: ['details', 'sourceWarehouse', 'targetProvider'],
      });

      if (!return_) {
        throw new NotFoundException(
          `Devolución con ID ${returnId} no encontrada`,
        );
      }

      if (return_.status) {
        throw new BadRequestException('La devolución ya ha sido procesada');
      }

      if (!return_.details || return_.details.length === 0) {
        throw new BadRequestException(
          'La devolución no tiene detalles para procesar',
        );
      }

      // Procesar cada detalle
      for (const detail of return_.details) {
        // Verificar stock disponible en almacén origen
        const sourceInventory = await this.inventoryRepository.findOne({
          where: {
            product_id: detail.productId,
            warehouse: { id: return_.sourceWarehouseId },
          },
        });

        if (
          !sourceInventory ||
          Number(sourceInventory.quantity) < Number(detail.quantity)
        ) {
          throw new BadRequestException(
            `Stock insuficiente para el producto ${detail.productId} en el almacén origen`,
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

        // Registrar en historial de productos
        const sourceHistory = queryRunner.manager.create(ProductHistory, {
          product: { id: detail.productId },
          warehouse: { id: return_.sourceWarehouseId },
          operation_type: OperationType.RETURN_OUT,
          operation_id: return_.id,
          quantity: detail.quantity,
          current_stock:
            Number(sourceInventory.quantity) - Number(detail.quantity),
        });

        await queryRunner.manager.save(sourceHistory);
      }

      // Marcar la devolución como procesada
      await queryRunner.manager.update(
        Return,
        { id: returnId },
        { status: true },
      );

      await queryRunner.commitTransaction();

      // Retornar la devolución procesada
      return this.findOne(returnId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    paginationDto: PaginationDto,
    queryDto?: ReturnQueryDto,
  ): Promise<PaginatedResponse<ReturnResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.returnRepository
      .createQueryBuilder('return')
      .leftJoinAndSelect('return.sourceWarehouse', 'sourceWarehouse')
      .leftJoinAndSelect('return.targetProvider', 'targetProvider')
      .leftJoinAndSelect('return.details', 'details')
      .leftJoinAndSelect('details.product', 'product')
      .orderBy('return.created_at', 'DESC');

    if (queryDto?.sourceWarehouseId) {
      queryBuilder.andWhere('return.sourceWarehouseId = :sourceWarehouseId', {
        sourceWarehouseId: queryDto.sourceWarehouseId,
      });
    }

    if (queryDto?.targetProviderId) {
      queryBuilder.andWhere('return.targetProviderId = :targetProviderId', {
        targetProviderId: queryDto.targetProviderId,
      });
    }

    if (queryDto?.startDate) {
      queryBuilder.andWhere('return.date >= :startDate', {
        startDate: queryDto.startDate,
      });
    }

    if (queryDto?.endDate) {
      queryBuilder.andWhere('return.date <= :endDate', {
        endDate: queryDto.endDate,
      });
    }

    const [returns, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const responseDtos = returns.map((return_) =>
      this.mapToResponseDto(return_),
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

  async findOne(id: string): Promise<ReturnResponseDto> {
    const return_ = await this.returnRepository.findOne({
      where: { id },
      relations: [
        'sourceWarehouse',
        'targetProvider',
        'details',
        'details.product',
      ],
    });

    if (!return_) {
      throw new NotFoundException('Devolución no encontrada');
    }

    return this.mapToResponseDto(return_);
  }

  async remove(id: string): Promise<void> {
    const return_ = await this.returnRepository.findOne({
      where: { id },
      relations: ['details'],
    });

    if (!return_) {
      throw new NotFoundException('Devolución no encontrada');
    }

    // No permitir eliminar devoluciones que ya han sido procesadas
    if (return_.status) {
      throw new BadRequestException(
        'No se puede eliminar una devolución ya procesada',
      );
    }

    await this.returnRepository.softDelete(id);
  }

  private async generateUniqueCode(): Promise<string> {
    const prefix = 'DEV';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // Buscar el último código del día
    const lastReturn = await this.returnRepository.findOne({
      where: {
        code: Like(`${prefix}${date}%`),
      },
      order: { code: 'DESC' },
    });

    let sequence = 1;
    if (lastReturn) {
      const lastSequence = parseInt(lastReturn.code.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${prefix}${date}${sequence.toString().padStart(4, '0')}`;
  }

  private mapDetailToResponseDto(
    detail: ReturnDetail,
  ): ReturnDetailResponseDto {
    return {
      id: detail.id,
      product: this.productMapper.mapToResponseDto(detail.product),
      quantity: detail.quantity,
      price: detail.price,
      created_at: detail.created_at,
    };
  }

  private mapToResponseDto(return_: Return): ReturnResponseDto {
    return {
      id: return_.id,
      code: return_.code,
      sourceWarehouse: this.warehouseMapper.mapToResponseDto(
        return_.sourceWarehouse,
      ),
      targetProvider: this.providerMapper.mapToResponseDto(
        return_.targetProvider,
      ),
      date: return_.date,
      description: return_.description,
      status: return_.status,
      details:
        return_.details?.map((detail) => ({
          id: detail.id,
          product: this.productMapper.mapToResponseDto(detail.product),
          quantity: detail.quantity,
          price: detail.price,
          created_at: detail.created_at,
        })) || [],
      created_at: return_.created_at,
    };
  }
} 