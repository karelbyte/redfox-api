import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reception } from '../models/reception.entity';
import { ReceptionDetail } from '../models/reception-detail.entity';
import { Provider } from '../models/provider.entity';
import { Product, InventoryStrategy } from '../models/product.entity';
import { Warehouse } from '../models/warehouse.entity';
import { Inventory } from '../models/inventory.entity';
import {
  ProductHistory,
  OperationType,
} from '../models/product-history.entity';
import { CreateReceptionDto } from '../dtos/reception/create-reception.dto';
import { UpdateReceptionDto } from '../dtos/reception/update-reception.dto';
import { ReceptionResponseDto } from '../dtos/reception/reception-response.dto';
import { CloseReceptionResponseDto } from '../dtos/reception/close-reception-response.dto';
import { ReceptionDetailResponseDto } from '../dtos/reception-detail/reception-detail-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponseDto } from '../dtos/common/paginated-response.dto';
import { ProductService } from './product.service';
import { WarehouseMapper } from './mappers/warehouse.mapper';
import { ProductMapper } from './mappers/product.mapper';
import { CreateReceptionDetailDto } from '../dtos/reception-detail/create-reception-detail.dto';
import { UpdateReceptionDetailDto } from '../dtos/reception-detail/update-reception-detail.dto';
import { ReceptionDetailQueryDto } from '../dtos/reception-detail/reception-detail-query.dto';
import { TranslationService } from './translation.service';
import { InventoryPackSyncService } from './inventory-pack-sync.service';
import { ProviderMapper } from './mappers/provider.mapper';
import { SurrogateService } from './surrogate.service';
import { TenantContext } from './tenant-context.service';

@Injectable()
export class ReceptionService {
  constructor(
    @InjectRepository(Reception)
    private readonly receptionRepository: Repository<Reception>,
    @InjectRepository(ReceptionDetail)
    private readonly receptionDetailRepository: Repository<ReceptionDetail>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(ProductHistory)
    private readonly productHistoryRepository: Repository<ProductHistory>,
    private readonly productService: ProductService,
    private readonly warehouseMapper: WarehouseMapper,
    private readonly productMapper: ProductMapper,
    private readonly translationService: TranslationService,
    private readonly inventoryPackSyncService: InventoryPackSyncService,
    private readonly providerMapper: ProviderMapper,
    private readonly surrogateService: SurrogateService,
    private readonly tenantContext: TenantContext,
  ) {}

  private get organizationId(): string {
    return this.tenantContext.getOrganizationId() as string;
  }

  private mapDetailToResponseDto(
    detail: ReceptionDetail,
  ): ReceptionDetailResponseDto {
    return {
      id: detail.id,
      quantity: detail.quantity,
      price: detail.price,
      product: this.productMapper.mapToResponseDto(detail.product),
      created_at: detail.created_at,
    };
  }

  private mapToResponseDto(reception: Reception): ReceptionResponseDto {
    return {
      id: reception.id,
      code: reception.code,
      date: reception.date,
      provider: this.providerMapper.mapToResponseDto(reception.provider),
      warehouse: this.warehouseMapper.mapToResponseDto(reception.warehouse),
      document: reception.document,
      amount: reception.amount,
      status: reception.status,
      created_at: reception.created_at,
    };
  }

  // Función helper para calcular montos con precisión decimal
  private calculateAmount(quantity: number, price: number): number {
    return quantity * price;
  }

  // Función helper para actualizar el monto total de la recepción
  private async updateReceptionAmount(
    receptionId: string,
    newAmount: number,
  ): Promise<void> {
    const reception = await this.receptionRepository.findOne({
      where: { id: receptionId, organization_id: this.organizationId },
    });
    if (reception) {
      reception.amount = Math.round(newAmount * 100) / 100;
      await this.receptionRepository.save(reception);
    }
  }

  async create(
    createReceptionDto: CreateReceptionDto,
    userId?: string,
  ): Promise<ReceptionResponseDto> {
    // Verificar que el provider existe
    const provider = await this.providerRepository.findOne({
      where: {
        id: createReceptionDto.provider_id,
        organization_id: this.organizationId,
      },
    });
    if (!provider) {
      const message = await this.translationService.translate(
        'reception.provider_not_found',
        userId,
        { providerId: createReceptionDto.provider_id },
      );
      throw new NotFoundException(message);
    }

    // Verificar que el warehouse existe
    const warehouse = await this.warehouseRepository.findOne({
      where: {
        id: createReceptionDto.warehouse_id,
        organization_id: this.organizationId,
      },
    });
    if (!warehouse) {
      const message = await this.translationService.translate(
        'reception.warehouse_not_found',
        userId,
        { warehouseId: createReceptionDto.warehouse_id },
      );
      throw new NotFoundException(message);
    }

    const reception = this.receptionRepository.create({
      code: createReceptionDto.code,
      date: createReceptionDto.date,
      provider: provider,
      warehouse: warehouse,
      document: createReceptionDto.document,
      amount: createReceptionDto.amount,
      organization_id: this.organizationId,
    });

    const savedReception = await this.receptionRepository.save(reception);

    // Incrementar el contador del surrogate si el código coincide con el sugerido
    await this.surrogateService.useCodeIfMatches(
      'reception',
      createReceptionDto.code,
    );

    // Recargar con relaciones para la respuesta
    const receptionWithRelations = await this.receptionRepository.findOne({
      where: { id: savedReception.id, organization_id: this.organizationId },
      relations: ['provider', 'warehouse'],
    });

    if (!receptionWithRelations) {
      const message = await this.translationService.translate(
        'reception.not_found',
        userId,
        { id: savedReception.id },
      );
      throw new NotFoundException(message);
    }

    return this.mapToResponseDto(receptionWithRelations);
  }

  async findAll(
    paginationDto: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponseDto<ReceptionResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [receptions, total] = await this.receptionRepository.findAndCount({
      where: { organization_id: this.organizationId },
      relations: ['provider', 'warehouse'],
      skip,
      take: limit,
      order: {
        created_at: 'DESC',
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: receptions.map((reception) => this.mapToResponseDto(reception)),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: string, userId?: string): Promise<ReceptionResponseDto> {
    const reception = await this.receptionRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['provider', 'details', 'warehouse', 'warehouse.currency'],
    });

    if (!reception) {
      const message = await this.translationService.translate(
        'reception.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    return this.mapToResponseDto(reception);
  }

  async update(
    id: string,
    updateReceptionDto: UpdateReceptionDto,
    userId?: string,
  ): Promise<ReceptionResponseDto> {
    const reception = await this.receptionRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['provider', 'details', 'warehouse', 'warehouse.currency'],
    });

    if (!reception) {
      const message = await this.translationService.translate(
        'reception.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    if (updateReceptionDto.provider_id) {
      const provider = await this.providerRepository.findOne({
        where: {
          id: updateReceptionDto.provider_id,
          organization_id: this.organizationId,
        },
      });
      if (!provider) {
        const message = await this.translationService.translate(
          'reception.provider_not_found',
          userId,
          { providerId: updateReceptionDto.provider_id },
        );
        throw new NotFoundException(message);
      }
      reception.provider = provider;
    }

    Object.assign(reception, {
      code: updateReceptionDto.code,
      date: updateReceptionDto.date,
      document: updateReceptionDto.document,
      amount: updateReceptionDto.amount,
      status: updateReceptionDto.status,
    });

    const updatedReception = await this.receptionRepository.save(reception);
    return this.mapToResponseDto(updatedReception);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const reception = await this.receptionRepository.findOne({
      where: { id, organization_id: this.organizationId },
    });
    if (!reception) {
      const message = await this.translationService.translate(
        'reception.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    await this.receptionRepository.softDelete({
      id,
      organization_id: this.organizationId,
    });
  }

  async createDetail(
    receptionId: string,
    createDetailDto: CreateReceptionDetailDto,
    userId?: string,
  ): Promise<ReceptionDetailResponseDto> {
    const reception = await this.receptionRepository.findOne({
      where: { id: receptionId, organization_id: this.organizationId },
    });
    if (!reception) {
      const message = await this.translationService.translate(
        'reception.not_found',
        userId,
        { id: receptionId },
      );
      throw new NotFoundException(message);
    }

    const product = await this.productRepository.findOne({
      where: {
        id: createDetailDto.product_id,
        organization_id: this.organizationId,
      },
    });
    if (!product) {
      const message = await this.translationService.translate(
        'reception.product_not_found',
        userId,
        { productId: createDetailDto.product_id },
      );
      throw new NotFoundException(message);
    }

    const detailToSave: Partial<ReceptionDetail> = {
      reception: reception,
      product: product,
      quantity: createDetailDto.quantity,
      price: createDetailDto.price,
    };

    const strategy = product.inventory_strategy || InventoryStrategy.AVERAGE;

    if (strategy === InventoryStrategy.FEFO) {
      // FEFO requiere fecha de vencimiento obligatoriamente
      if (!createDetailDto.expiration_date) {
        const message = await this.translationService.translate(
          'reception.fefo_requires_expiration_date',
          userId,
        );
        throw new BadRequestException(message);
      }
      detailToSave.batch_number = createDetailDto.batch_number || undefined;
      detailToSave.expiration_date = new Date(createDetailDto.expiration_date);
    } else if (strategy === InventoryStrategy.FIFO) {
      // FIFO: lote recomendado, fecha opcional
      detailToSave.batch_number = createDetailDto.batch_number || undefined;
      detailToSave.expiration_date = createDetailDto.expiration_date
        ? new Date(createDetailDto.expiration_date)
        : undefined;
    } else {
      // AVERAGE: lote y fecha no aplican — se ignoran
      detailToSave.batch_number = undefined;
      detailToSave.expiration_date = undefined;
    }

    const detailAmount = this.calculateAmount(
      createDetailDto.quantity,
      createDetailDto.price,
    );

    const currentAmount = reception.amount || 0;
    const newTotalAmount = Number(currentAmount) + Number(detailAmount);

    await this.updateReceptionAmount(receptionId, newTotalAmount);

    const savedDetail = await this.receptionDetailRepository.save(detailToSave);

    const detailWithRelations = await this.receptionDetailRepository.findOne({
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
      const message = await this.translationService.translate(
        'reception.detail_not_found',
        userId,
        { detailId: savedDetail.id, receptionId },
      );
      throw new NotFoundException(message);
    }

    return this.mapDetailToResponseDto(detailWithRelations);
  }

  async findAllDetails(
    receptionId: string,
    queryDto: ReceptionDetailQueryDto,
    userId?: string,
  ): Promise<PaginatedResponseDto<ReceptionDetailResponseDto>> {
    // Verificar que la recepción existe
    console.log('receptionId', receptionId);
    const reception = await this.receptionRepository.findOne({
      where: { id: receptionId, organization_id: this.organizationId },
    });
    if (!reception) {
      const message = await this.translationService.translate(
        'reception.not_found',
        userId,
        { id: receptionId },
      );
      throw new NotFoundException(message);
    }

    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const [details, total] = await this.receptionDetailRepository.findAndCount({
      where: {
        reception: { id: receptionId, organization_id: this.organizationId },
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
    receptionId: string,
    detailId: string,
    userId?: string,
  ): Promise<ReceptionDetailResponseDto> {
    // Verificar que la recepción existe
    const reception = await this.receptionRepository.findOne({
      where: { id: receptionId, organization_id: this.organizationId },
    });
    if (!reception) {
      const message = await this.translationService.translate(
        'reception.not_found',
        userId,
        { id: receptionId },
      );
      throw new NotFoundException(message);
    }

    const detail = await this.receptionDetailRepository.findOne({
      where: {
        id: detailId,
        reception: { id: receptionId, organization_id: this.organizationId },
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
        'reception.detail_not_found',
        userId,
        { detailId, receptionId },
      );
      throw new NotFoundException(message);
    }

    return this.mapDetailToResponseDto(detail);
  }

  async updateDetail(
    receptionId: string,
    detailId: string,
    updateDetailDto: UpdateReceptionDetailDto,
    userId?: string,
  ): Promise<ReceptionDetailResponseDto> {
    // Verificar que la recepción existe
    const reception = await this.receptionRepository.findOne({
      where: { id: receptionId, organization_id: this.organizationId },
    });
    if (!reception) {
      const message = await this.translationService.translate(
        'reception.not_found',
        userId,
        { id: receptionId },
      );
      throw new NotFoundException(message);
    }

    const detail = await this.receptionDetailRepository.findOne({
      where: {
        id: detailId,
        reception: { id: receptionId, organization_id: this.organizationId },
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
        'reception.detail_not_found',
        userId,
        { detailId, receptionId },
      );
      throw new NotFoundException(message);
    }

    // Guardar el monto anterior del detalle para restarlo del total
    const oldAmount = this.calculateAmount(detail.quantity, detail.price);

    if (updateDetailDto.product_id) {
      const product = await this.productRepository.findOne({
        where: {
          id: updateDetailDto.product_id,
          organization_id: this.organizationId,
        },
        relations: ['brand', 'category', 'tax', 'measurement_unit'],
      });
      if (!product) {
        const message = await this.translationService.translate(
          'reception.product_not_found',
          userId,
          { productId: updateDetailDto.product_id },
        );
        throw new NotFoundException(message);
      }
      detail.product = product;
    }

    // Actualizar los campos del detalle
    if (updateDetailDto.quantity !== undefined) {
      detail.quantity = updateDetailDto.quantity;
    }
    if (updateDetailDto.price !== undefined) {
      detail.price = updateDetailDto.price;
    }

    const updatedDetail = await this.receptionDetailRepository.save(detail);

    // Calcular el nuevo monto del detalle
    const newAmount = this.calculateAmount(detail.quantity, detail.price);

    // Actualizar el monto total de la recepción: restar el monto anterior y sumar el nuevo
    const currentAmount = reception.amount || 0;
    const newTotalAmount =
      Number(currentAmount) - Number(oldAmount) + Number(newAmount);
    await this.updateReceptionAmount(receptionId, newTotalAmount);

    return this.mapDetailToResponseDto(updatedDetail);
  }

  async removeDetail(
    receptionId: string,
    detailId: string,
    userId?: string,
  ): Promise<void> {
    // Verificar que la recepción existe
    const reception = await this.receptionRepository.findOne({
      where: { id: receptionId, organization_id: this.organizationId },
    });
    if (!reception) {
      const message = await this.translationService.translate(
        'reception.not_found',
        userId,
        { id: receptionId },
      );
      throw new NotFoundException(message);
    }

    const detail = await this.receptionDetailRepository.findOne({
      where: {
        id: detailId,
        reception: { id: receptionId, organization_id: this.organizationId },
      },
    });

    if (!detail) {
      const message = await this.translationService.translate(
        'reception.detail_not_found',
        userId,
        { detailId, receptionId },
      );
      throw new NotFoundException(message);
    }

    // Calcular el monto del detalle a eliminar con precisión decimal
    const detailAmount = this.calculateAmount(detail.quantity, detail.price);

    // Restar el monto del detalle del total de la recepción
    const currentAmount = reception.amount || 0;
    const newTotalAmount = Number(currentAmount) - Number(detailAmount);
    await this.updateReceptionAmount(receptionId, newTotalAmount);

    // Eliminar el detalle
    await this.receptionDetailRepository.softDelete(detailId);
  }

  async closeReception(
    receptionId: string,
    userId?: string,
  ): Promise<CloseReceptionResponseDto> {
    const reception = await this.receptionRepository.findOne({
      where: { id: receptionId, organization_id: this.organizationId },
      relations: ['warehouse', 'details', 'details.product'],
    });

    if (!reception) {
      const message = await this.translationService.translate(
        'reception.not_found',
        userId,
        { id: receptionId },
      );
      throw new NotFoundException(message);
    }

    if (!reception.status) {
      const message = await this.translationService.translate(
        'reception.already_closed',
        userId,
      );
      throw new BadRequestException(message);
    }

    const receptionDetails = await this.receptionDetailRepository.find({
      where: {
        reception: { id: receptionId, organization_id: this.organizationId },
      },
      relations: ['product', 'product.measurement_unit'],
    });

    if (receptionDetails.length === 0) {
      const message = await this.translationService.translate(
        'reception.no_products_to_transfer',
        userId,
      );
      throw new BadRequestException(message);
    }

    let transferredProducts = 0;
    let totalQuantity = 0;

    for (const detail of receptionDetails) {
      const product = detail.product;
      const strategy = product.inventory_strategy || InventoryStrategy.AVERAGE;

      let finalInventory: Inventory;

      if (strategy === InventoryStrategy.AVERAGE) {
        // Para AVERAGE: buscar si existe inventario del producto en el almacén
        const existingInventory = await this.inventoryRepository.findOne({
          where: {
            product_id: product.id,
            warehouse_id: reception.warehouse.id,
            organization_id: this.organizationId,
          },
          relations: ['product', 'warehouse'],
        });

        if (existingInventory) {
          // Calcular precio promedio ponderado
          const oldQuantity = Number(existingInventory.quantity);
          const newQuantity = Number(detail.quantity);
          const oldPrice = Number(existingInventory.price);
          const newPrice = Number(detail.price);

          const weightedAveragePrice =
            (oldQuantity * oldPrice + newQuantity * newPrice) /
            (oldQuantity + newQuantity);

          // Actualizar el inventario existente
          existingInventory.quantity = oldQuantity + newQuantity;
          existingInventory.price =
            Math.round(weightedAveragePrice * 100) / 100;
          existingInventory.updated_at = new Date();

          finalInventory =
            await this.inventoryRepository.save(existingInventory);
        } else {
          // Crear nuevo inventario si no existe
          const newInventory = this.inventoryRepository.create({
            product,
            warehouse: reception.warehouse,
            quantity: detail.quantity,
            price: detail.price,
            batch_number: detail.batch_number,
            expiration_date: detail.expiration_date,
            entry_id: reception.id,
            organization_id: this.organizationId,
          });

          finalInventory = await this.inventoryRepository.save(newInventory);
        }
      } else {
        // Para FIFO/FEFO: crear nuevo item siempre
        const newInventory = this.inventoryRepository.create({
          product,
          warehouse: reception.warehouse,
          quantity: detail.quantity,
          price: detail.price,
          batch_number: detail.batch_number,
          expiration_date: detail.expiration_date,
          entry_id: reception.id,
          organization_id: this.organizationId,
        });

        finalInventory = await this.inventoryRepository.save(newInventory);
      }

      const productHistory = this.productHistoryRepository.create({
        product,
        warehouse: reception.warehouse,
        operation_type: OperationType.RECEPTION,
        operation_id: reception.id,
        quantity: Number(detail.quantity),
        current_stock: Number(finalInventory.quantity),
        batch_number: detail.batch_number,
        expiration_date: detail.expiration_date,
        organization_id: this.organizationId,
      });

      await this.productHistoryRepository.save(productHistory);

      // Update denormalized total_stock
      await this.productService.updateStock(
        detail.product.id,
        Number(detail.quantity),
      );

      finalInventory.product = detail.product;
      await this.inventoryPackSyncService.syncForInventory(finalInventory);

      transferredProducts++;
      totalQuantity += Number(detail.quantity);
    }

    reception.status = false;
    await this.receptionRepository.save(reception);

    const message =
      transferredProducts > 0
        ? await this.translationService.translate(
            'reception.closed_successfully',
            userId,
            { transferredProducts },
          )
        : await this.translationService.translate(
            'reception.closed_no_products',
            userId,
          );

    return {
      receptionId: reception.id,
      receptionCode: reception.code,
      transferredProducts,
      totalQuantity,
      message,
      closedAt: new Date(),
    };
  }
}

/*
await this.productHistoryService.create({
  product_id: detail.product.id,
  warehouse_id: warehouseId,
  operation_type: OperationType.ENTRY,
  operation_id: reception.id,
  quantity: detail.quantity,
});
}*/
