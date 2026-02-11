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
import { SurrogateService } from './surrogate.service';
import { ProviderAddress } from '../models/provider-address.entity';
import { ProviderTaxData } from '../models/provider-tax-data.entity';
import { ProviderCredit } from '../models/provider-credit.entity';

@Injectable()
export class ProviderService {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(ProviderAddress)
    private readonly providerAddressRepository: Repository<ProviderAddress>,
    @InjectRepository(ProviderTaxData)
    private readonly providerTaxDataRepository: Repository<ProviderTaxData>,
    @InjectRepository(ProviderCredit)
    private readonly providerCreditRepository: Repository<ProviderCredit>,
    private providerMapper: ProviderMapper,
    private translationService: TranslationService,
    private readonly surrogateService: SurrogateService,
  ) { }

  async create(
    createProviderDto: CreateProviderDto,
    userId?: string,
  ): Promise<ProviderResponseDto> {
    const provider = this.providerRepository.create(createProviderDto);
    const savedProvider = await this.providerRepository.save(provider);

    // Incrementar el contador si el código coincide con el sugerido
    await this.surrogateService.useCodeIfMatches('provider', createProviderDto.code);

    return this.providerMapper.mapToResponseDto(savedProvider);
  }

  async findAll(
    paginationDto?: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponse<ProviderResponseDto>> {
    const { page, limit, term, is_active } = paginationDto || {};

    // Construir las condiciones de búsqueda
    const baseConditions: any = { withDeleted: false };

    if (is_active !== undefined) {
      const isActiveBool = String(is_active) === 'true';
      baseConditions.where = { status: isActiveBool };
    }

    const whereConditions = term
      ? {
        ...baseConditions,
        where: baseConditions.where
          ? [
            { ...baseConditions.where, code: Like(`%${term}%`) },
            { ...baseConditions.where, description: Like(`%${term}%`) },
            { ...baseConditions.where, name: Like(`%${term}%`) },
            { ...baseConditions.where, phone: Like(`%${term}%`) },
            { ...baseConditions.where, email: Like(`%${term}%`) },
          ]
          : [
            { code: Like(`%${term}%`) },
            { description: Like(`%${term}%`) },
            { name: Like(`%${term}%`) },
            { phone: Like(`%${term}%`) },
            { email: Like(`%${term}%`) },
          ],
      }
      : baseConditions;

    // Si no se proporciona paginación, devolver toda la data
    if (!page && !limit) {
      const providers = await this.providerRepository.find({
        ...whereConditions,
        relations: ['addresses', 'taxData', 'credit'],
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
      relations: ['addresses', 'taxData', 'credit'],
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
    const provider = await this.providerRepository.findOne({
      where: { id },
      relations: ['addresses', 'taxData', 'credit']
    });
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
    const provider = await this.providerRepository.findOne({
      where: { id },
      relations: ['addresses', 'taxData', 'credit'],
      withDeleted: false,
    });

    if (!provider) {
      const message = await this.translationService.translate(
        'provider.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    const { delete_addresses, delete_tax_data, credit, ...baseData } = updateProviderDto;
    Object.assign(provider, baseData);

    // Handle Credit
    if (credit) {
      if (!provider.credit) {
        provider.credit = this.providerCreditRepository.create({
          ...credit,
          provider_id: id,
        });
      } else {
        Object.assign(provider.credit, credit);
      }
    }

    // Handle Deletions
    if (delete_addresses && delete_addresses.length > 0) {
      await this.providerAddressRepository.delete(delete_addresses);
    }
    if (delete_tax_data && delete_tax_data.length > 0) {
      await this.providerTaxDataRepository.delete(delete_tax_data);
    }

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

  async removeMany(ids: string[], userId?: string): Promise<void> {
    await this.providerRepository.softDelete(ids);
  }
}
