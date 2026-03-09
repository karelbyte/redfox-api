import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
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
import { TenantContext } from './tenant-context.service';

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
    private readonly tenantContext: TenantContext,
  ) {}

  private get organizationId(): string {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      throw new BadRequestException(
        'Organization context is required for Providers',
      );
    }
    return orgId;
  }

  async create(
    createProviderDto: CreateProviderDto,
    userId?: string,
  ): Promise<ProviderResponseDto> {
    const provider = this.providerRepository.create({
      ...createProviderDto,
      organization_id: this.organizationId,
    });
    const savedProvider = await this.providerRepository.save(provider);

    // Incrementar el contador si el código coincide con el sugerido
    await this.surrogateService.useCodeIfMatches(
      'provider',
      createProviderDto.code,
    );

    return this.providerMapper.mapToResponseDto(savedProvider);
  }

  async findAll(
    paginationDto?: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponse<ProviderResponseDto>> {
    const { page, limit, term, is_active } = paginationDto || {};

    const baseWhere: any = { organization_id: this.organizationId };

    if (is_active !== undefined) {
      const isActiveBool = String(is_active) === 'true';
      baseWhere.status = isActiveBool;
    }

    const baseConditions: any = { withDeleted: false, where: baseWhere };

    const whereConditions = term
      ? {
          ...baseConditions,
          where: [
            { ...baseWhere, code: Like(`%${term}%`) },
            { ...baseWhere, description: Like(`%${term}%`) },
            { ...baseWhere, name: Like(`%${term}%`) },
            { ...baseWhere, phone: Like(`%${term}%`) },
            { ...baseWhere, email: Like(`%${term}%`) },
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
      where: { id, organization_id: this.organizationId },
      relations: ['addresses', 'taxData', 'credit'],
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
      where: { id, organization_id: this.organizationId },
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

    const {
      delete_addresses,
      delete_tax_data,
      credit,
      taxData,
      addresses,
      ...baseData
    } = updateProviderDto;
    Object.assign(provider, baseData);

    if (taxData) {
      provider.taxData = taxData.map((dtoTax) => {
        const existingTax = provider.taxData?.find((t) => t.id === dtoTax.id);
        if (existingTax) {
          return Object.assign(existingTax, dtoTax);
        }
        return this.providerTaxDataRepository.create({
          ...dtoTax,
          provider_id: id,
        });
      });
    }

    if (addresses) {
      provider.addresses = addresses.map((dtoAddr) => {
        const existingAddr = provider.addresses?.find(
          (a) => a.id === dtoAddr.id,
        );
        if (existingAddr) {
          return Object.assign(existingAddr, dtoAddr);
        }
        return this.providerAddressRepository.create({
          ...dtoAddr,
          provider_id: id,
        });
      });
    }

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
      if (provider.addresses) {
        provider.addresses = provider.addresses.filter(
          (a) => !delete_addresses.includes(a.id),
        );
      }
    }
    if (delete_tax_data && delete_tax_data.length > 0) {
      await this.providerTaxDataRepository.delete(delete_tax_data);
      if (provider.taxData) {
        provider.taxData = provider.taxData.filter(
          (t) => !delete_tax_data.includes(t.id),
        );
      }
    }

    const updatedProvider = await this.providerRepository.save(provider);
    return this.providerMapper.mapToResponseDto(updatedProvider);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const provider = await this.providerRepository.findOne({
      where: { id, organization_id: this.organizationId },
    });
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
    await this.providerRepository.softDelete({
      id: In(ids),
      organization_id: this.organizationId,
    });
  }

  async updateBalance(
    id: string,
    amount: number,
    manager?: any,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(Provider)
      : this.providerRepository;
    const provider = await repo.findOneBy({ id });
    if (provider) {
      provider.balance = Number(provider.balance || 0) + Number(amount);
      await repo.save(provider, { reload: false });
    }
  }
}
