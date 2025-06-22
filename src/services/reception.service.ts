import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reception } from '../models/reception.entity';
import { ReceptionDetail } from '../models/reception-detail.entity';
import { Provider } from '../models/provider.entity';
import { Product } from '../models/product.entity';
import { Warehouse } from '../models/warehouse.entity';
import { CreateReceptionDto } from '../dtos/reception/create-reception.dto';
import { UpdateReceptionDto } from '../dtos/reception/update-reception.dto';
import { ReceptionResponseDto } from '../dtos/reception/reception-response.dto';
import { ReceptionDetailResponseDto } from '../dtos/reception-detail/reception-detail-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponseDto } from '../dtos/common/paginated-response.dto';
import { ProductService } from './product.service';
import { WarehouseMapper } from './mappers/warehouse.mapper';
import { ProductMapper } from './mappers/product.mapper';
import { CreateReceptionDetailDto } from '../dtos/reception-detail/create-reception-detail.dto';
import { UpdateReceptionDetailDto } from '../dtos/reception-detail/update-reception-detail.dto';
import { ReceptionDetailQueryDto } from '../dtos/reception-detail/reception-detail-query.dto';

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
    private readonly productService: ProductService,
    private readonly warehouseMapper: WarehouseMapper,
    private readonly productMapper: ProductMapper,
  ) {}

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
      provider: reception.provider,
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
      where: { id: receptionId },
    });
    if (reception) {
      reception.amount = newAmount;
      await this.receptionRepository.save(reception);
    }
  }

  async create(
    createReceptionDto: CreateReceptionDto,
  ): Promise<ReceptionResponseDto> {
    // Verificar que el provider existe
    const provider = await this.providerRepository.findOne({
      where: { id: createReceptionDto.provider_id },
    });
    if (!provider) {
      throw new NotFoundException(
        `Provider with ID ${createReceptionDto.provider_id} not found`,
      );
    }

    // Verificar que el warehouse existe
    const warehouse = await this.warehouseRepository.findOne({
      where: { id: createReceptionDto.warehouse_id },
    });
    if (!warehouse) {
      throw new NotFoundException(
        `Warehouse with ID ${createReceptionDto.warehouse_id} not found`,
      );
    }

    const reception = this.receptionRepository.create({
      code: createReceptionDto.code,
      date: createReceptionDto.date,
      provider: provider,
      warehouse: warehouse,
      document: createReceptionDto.document,
      amount: createReceptionDto.amount,
    });

    const savedReception = await this.receptionRepository.save(reception);

    // Recargar con relaciones para la respuesta
    const receptionWithRelations = await this.receptionRepository.findOne({
      where: { id: savedReception.id },
      relations: ['provider', 'warehouse'],
    });

    if (!receptionWithRelations) {
      throw new NotFoundException('Reception not found after creation');
    }

    return this.mapToResponseDto(receptionWithRelations);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<ReceptionResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [receptions, total] = await this.receptionRepository.findAndCount({
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

  async findOne(id: string): Promise<ReceptionResponseDto> {
    const reception = await this.receptionRepository.findOne({
      where: { id },
      relations: ['provider', 'details', 'warehouse', 'warehouse.currency'],
    });

    if (!reception) {
      throw new NotFoundException(`Reception with ID ${id} not found`);
    }

    return this.mapToResponseDto(reception);
  }

  async update(
    id: string,
    updateReceptionDto: UpdateReceptionDto,
  ): Promise<ReceptionResponseDto> {
    const reception = await this.receptionRepository.findOne({
      where: { id },
      relations: ['provider', 'details', 'warehouse', 'warehouse.currency'],
    });

    if (!reception) {
      throw new NotFoundException(`Reception with ID ${id} not found`);
    }

    if (updateReceptionDto.provider_id) {
      const provider = await this.providerRepository.findOne({
        where: { id: updateReceptionDto.provider_id },
      });
      if (!provider) {
        throw new NotFoundException(
          `Provider with ID ${updateReceptionDto.provider_id} not found`,
        );
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

  async remove(id: string): Promise<void> {
    const reception = await this.receptionRepository.findOne({ where: { id } });
    if (!reception) {
      throw new NotFoundException(`Reception with ID ${id} not found`);
    }

    await this.receptionRepository.softDelete(id);
  }

  // Métodos para detalles de recepción
  async createDetail(
    receptionId: string,
    createDetailDto: CreateReceptionDetailDto,
  ): Promise<ReceptionDetailResponseDto> {
    // Verificar que la recepción existe
    const reception = await this.receptionRepository.findOne({
      where: { id: receptionId },
    });
    if (!reception) {
      throw new NotFoundException(`Reception with ID ${receptionId} not found`);
    }

    // Verificar que el producto existe
    const product = await this.productRepository.findOne({
      where: { id: createDetailDto.product_id },
    });
    if (!product) {
      throw new NotFoundException(
        `Product with ID ${createDetailDto.product_id} not found`,
      );
    }

    const detail = this.receptionDetailRepository.create({
      reception: reception,
      product: product,
      quantity: createDetailDto.quantity,
      price: createDetailDto.price,
    });

    const savedDetail = await this.receptionDetailRepository.save(detail);

    // Calcular el monto del nuevo detalle con precisión decimal
    const detailAmount = this.calculateAmount(
      createDetailDto.quantity,
      createDetailDto.price,
    );

    // Actualizar el monto total de la recepción
    const currentAmount = reception.amount || 0;
    const newTotalAmount = Number(currentAmount) + Number(detailAmount);

    await this.updateReceptionAmount(receptionId, newTotalAmount);

    // Recargar con relaciones para la respuesta
    const detailWithRelations = await this.receptionDetailRepository.findOne({
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
      throw new NotFoundException('Reception detail not found after creation');
    }

    return this.mapDetailToResponseDto(detailWithRelations);
  }

  async findAllDetails(
    receptionId: string,
    queryDto: ReceptionDetailQueryDto,
  ): Promise<PaginatedResponseDto<ReceptionDetailResponseDto>> {
    // Verificar que la recepción existe
    const reception = await this.receptionRepository.findOne({
      where: { id: receptionId },
    });
    if (!reception) {
      throw new NotFoundException(`Reception with ID ${receptionId} not found`);
    }

    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const [details, total] = await this.receptionDetailRepository.findAndCount({
      where: { reception: { id: receptionId } },
      relations: [
        'product',
        'product.brand',
        'product.category',
        'product.tax',
        'product.measurement_unit',
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
  ): Promise<ReceptionDetailResponseDto> {
    // Verificar que la recepción existe
    const reception = await this.receptionRepository.findOne({
      where: { id: receptionId },
    });
    if (!reception) {
      throw new NotFoundException(`Reception with ID ${receptionId} not found`);
    }

    const detail = await this.receptionDetailRepository.findOne({
      where: { id: detailId, reception: { id: receptionId } },
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
        `Reception detail with ID ${detailId} not found in reception ${receptionId}`,
      );
    }

    return this.mapDetailToResponseDto(detail);
  }

  async updateDetail(
    receptionId: string,
    detailId: string,
    updateDetailDto: UpdateReceptionDetailDto,
  ): Promise<ReceptionDetailResponseDto> {
    // Verificar que la recepción existe
    const reception = await this.receptionRepository.findOne({
      where: { id: receptionId },
    });
    if (!reception) {
      throw new NotFoundException(`Reception with ID ${receptionId} not found`);
    }

    const detail = await this.receptionDetailRepository.findOne({
      where: { id: detailId, reception: { id: receptionId } },
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
        `Reception detail with ID ${detailId} not found in reception ${receptionId}`,
      );
    }

    // Guardar el monto anterior del detalle para restarlo del total
    const oldAmount = this.calculateAmount(detail.quantity, detail.price);

    if (updateDetailDto.product_id) {
      const product = await this.productRepository.findOne({
        where: { id: updateDetailDto.product_id },
        relations: ['brand', 'category', 'tax', 'measurement_unit'],
      });
      if (!product) {
        throw new NotFoundException(
          `Product with ID ${updateDetailDto.product_id} not found`,
        );
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

  async removeDetail(receptionId: string, detailId: string): Promise<void> {
    // Verificar que la recepción existe
    const reception = await this.receptionRepository.findOne({
      where: { id: receptionId },
    });
    if (!reception) {
      throw new NotFoundException(`Reception with ID ${receptionId} not found`);
    }

    const detail = await this.receptionDetailRepository.findOne({
      where: { id: detailId, reception: { id: receptionId } },
    });

    if (!detail) {
      throw new NotFoundException(
        `Reception detail with ID ${detailId} not found in reception ${receptionId}`,
      );
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
