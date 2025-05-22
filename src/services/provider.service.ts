import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../models/provider.entity';
import { CreateProviderDto } from '../dtos/provider/create-provider.dto';
import { UpdateProviderDto } from '../dtos/provider/update-provider.dto';
import { ProviderResponseDto } from '../dtos/provider/provider-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Injectable()
export class ProviderService {
  constructor(
    @InjectRepository(Provider)
    private providerRepository: Repository<Provider>,
  ) {}

  private mapToResponseDto(provider: Provider): ProviderResponseDto {
    const { id, code, description, status, created_at } = provider;
    return {
      id,
      code,
      description,
      status,
      created_at,
    };
  }

  async create(createProviderDto: CreateProviderDto): Promise<ProviderResponseDto> {
    const provider = this.providerRepository.create(createProviderDto);
    const savedProvider = await this.providerRepository.save(provider);
    return this.mapToResponseDto(savedProvider);
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginatedResponse<ProviderResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [providers, total] = await this.providerRepository.findAndCount({
      withDeleted: false,
      skip,
      take: limit,
    });

    const data = providers.map((provider) => this.mapToResponseDto(provider));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<ProviderResponseDto> {
    const provider = await this.providerRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!provider) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }
    return this.mapToResponseDto(provider);
  }

  async update(
    id: string,
    updateProviderDto: UpdateProviderDto,
  ): Promise<ProviderResponseDto> {
    const provider = await this.providerRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!provider) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }
    const updatedProvider = await this.providerRepository.save({
      ...provider,
      ...updateProviderDto,
    });
    return this.mapToResponseDto(updatedProvider);
  }

  async remove(id: string): Promise<void> {
    const provider = await this.providerRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!provider) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }
    await this.providerRepository.softRemove(provider);
  }
} 