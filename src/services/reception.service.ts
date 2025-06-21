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
      relations: [
        'provider',
        'details',
        'warehouse',
        'details.product',
        'details.product.brand',
        'details.product.provider',
        'details.product.measurement_unit',
      ],
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

    if (updateReceptionDto.details) {
      // Eliminar detalles existentes
      await this.receptionDetailRepository.delete({ reception: { id } });

      // Crear nuevos detalles
      const details = await Promise.all(
        updateReceptionDto.details.map(async (detailDto) => {
          const product = await this.productRepository.findOne({
            where: { id: detailDto.product_id },
          });
          if (!product) {
            throw new NotFoundException(
              `Product with ID ${detailDto.product_id} not found`,
            );
          }

          const detail = this.receptionDetailRepository.create({
            reception,
            product,
            quantity: detailDto.quantity,
          });

          return this.receptionDetailRepository.save(detail);
        }),
      );

      reception.details = details;
    }

    Object.assign(reception, {
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
