import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Provider } from '../models/provider.entity';
import { CreateProviderDto } from '../dtos/provider/create-provider.dto';
import { UpdateProviderDto } from '../dtos/provider/update-provider.dto';
import { ProviderResponseDto } from '../dtos/provider/provider-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { ProviderMapper } from './mappers/provider.mapper';
import { TranslationService } from './translation.service';

@Injectable()
export class ProviderService {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    private providerMapper: ProviderMapper,
    private translationService: TranslationService,
  ) {}

  async create(
    createProviderDto: CreateProviderDto,
    userId?: string,
  ): Promise<ProviderResponseDto> {
    const provider = this.providerRepository.create(createProviderDto);
    const savedProvider = await this.providerRepository.save(provider);
    return this.providerMapper.mapToResponseDto(savedProvider);
  }

  async findAll(
    paginationDto?: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponse<ProviderResponseDto>> {
    const { page, limit, term } = paginationDto || {};

    // Construir las condiciones de búsqueda
    const baseConditions = { withDeleted: false };
    const whereConditions = term
      ? {
          ...baseConditions,
          where: [
            { code: Like(`%${term}%`) },
            { description: Like(`%${term}%`) },
            { name: Like(`%${term}%`) },
            { document: Like(`%${term}%`) },
            { phone: Like(`%${term}%`) },
            { email: Like(`%${term}%`) },
            { address: Like(`%${term}%`) },
          ],
        }
      : baseConditions;

    // Si no se proporciona paginación, devolver toda la data
    if (!page && !limit) {
      const providers = await this.providerRepository.find({
        ...whereConditions,
        order: {
          created_at: 'DESC',
        },
      });

      const data = providers.map((provider) =>
        this.providerMapper.mapToResponseDto(provider),
      );

      return {
        data,
        meta: {
          total: data.length,
          page: 1,
          limit: data.length,
          totalPages: 1,
        },
      };
    }

    // Si se proporciona paginación, aplicar la lógica de paginación
    const currentPage = page || 1;
    const currentLimit = limit || 8;
    const skip = (currentPage - 1) * currentLimit;

    const [providers, total] = await this.providerRepository.findAndCount({
      ...whereConditions,
      skip,
      take: currentLimit,
      order: {
        created_at: 'DESC',
      },
    });

    const data = providers.map((provider) =>
      this.providerMapper.mapToResponseDto(provider),
    );

    return {
      data,
      meta: {
        total,
        page: currentPage,
        limit: currentLimit,
        totalPages: Math.ceil(total / currentLimit),
      },
    };
  }

  async findOne(id: string, userId?: string): Promise<ProviderResponseDto> {
    const provider = await this.providerRepository.findOne({ where: { id } });
    if (!provider) {
      const message = await this.translationService.translate(
        'provider.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }
    return this.providerMapper.mapToResponseDto(provider);
  }

  async update(
    id: string,
    updateProviderDto: UpdateProviderDto,
    userId?: string,
  ): Promise<ProviderResponseDto> {
    const provider = await this.providerRepository.findOne({ where: { id } });
    if (!provider) {
      const message = await this.translationService.translate(
        'provider.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    Object.assign(provider, updateProviderDto);
    const updatedProvider = await this.providerRepository.save(provider);
    return this.providerMapper.mapToResponseDto(updatedProvider);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const provider = await this.providerRepository.findOne({ where: { id } });
    if (!provider) {
      const message = await this.translationService.translate(
        'provider.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }
    await this.providerRepository.softDelete(id);
  }
}
