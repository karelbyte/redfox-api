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
    private readonly providerRepository: Repository<Provider>,
  ) {}

  private mapToResponseDto(provider: Provider): ProviderResponseDto {
    return {
      id: provider.id,
      code: provider.code,
      description: provider.description,
      name: provider.name,
      document: provider.document,
      phone: provider.phone,
      email: provider.email,
      address: provider.address,
      status: provider.status,
      created_at: provider.created_at,
    };
  }

  async create(
    createProviderDto: CreateProviderDto,
  ): Promise<ProviderResponseDto> {
    const provider = this.providerRepository.create(createProviderDto);
    const savedProvider = await this.providerRepository.save(provider);
    return this.mapToResponseDto(savedProvider);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<ProviderResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [providers, total] = await this.providerRepository.findAndCount({
      skip,
      take: limit,
      order: {
        created_at: 'DESC',
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: providers.map((provider) => this.mapToResponseDto(provider)),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: string): Promise<ProviderResponseDto> {
    const provider = await this.providerRepository.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }
    return this.mapToResponseDto(provider);
  }

  async update(
    id: string,
    updateProviderDto: UpdateProviderDto,
  ): Promise<ProviderResponseDto> {
    const provider = await this.providerRepository.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }

    Object.assign(provider, updateProviderDto);
    const updatedProvider = await this.providerRepository.save(provider);
    return this.mapToResponseDto(updatedProvider);
  }

  async remove(id: string): Promise<void> {
    const provider = await this.providerRepository.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }
    await this.providerRepository.softDelete(id);
  }
}
