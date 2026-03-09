import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, In } from 'typeorm';
import { Client } from '../models/client.entity';
import { Invoice } from '../models/invoice.entity';
import { Withdrawal } from '../models/withdrawal.entity';
import { CreateClientDto } from '../dtos/client/create-client.dto';
import { UpdateClientDto } from '../dtos/client/update-client.dto';
import { ClientResponseDto } from '../dtos/client/client-response.dto';
import { ClientWithPackStatusResponseDto } from '../dtos/client/client-with-pack-status-response.dto';
import { ImportClientsFromPackResponseDto } from '../dtos/client/import-clients-from-pack-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { ClientMapper } from './mappers/client.mapper';
import { TranslationService } from './translation.service';
import { ClientPackSyncService } from './client-pack-sync.service';
import { ClientPackImportService } from './client-pack-import.service';
import { CertificationPackFactoryService } from './certification-pack-factory.service';
import { SurrogateService } from './surrogate.service';
import { ClientAddress } from '../models/client-address.entity';
import { ClientTaxData } from '../models/client-tax-data.entity';
import { ClientCredit } from '../models/client-credit.entity';
import { TenantContext } from './tenant-context.service';

@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);

  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(ClientAddress)
    private readonly clientAddressRepository: Repository<ClientAddress>,
    @InjectRepository(ClientTaxData)
    private readonly clientTaxDataRepository: Repository<ClientTaxData>,
    @InjectRepository(ClientCredit)
    private readonly clientCreditRepository: Repository<ClientCredit>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    private clientMapper: ClientMapper,
    private readonly translationService: TranslationService,
    private readonly clientPackSyncService: ClientPackSyncService,
    private readonly clientPackImportService: ClientPackImportService,
    private readonly certificationPackFactory: CertificationPackFactoryService,
    private readonly surrogateService: SurrogateService,
    private readonly tenantContext: TenantContext,
  ) { }

  private get organizationId(): string {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      throw new BadRequestException('Organization context is required');
    }
    return orgId;
  }

  async create(
    createClientDto: CreateClientDto,
  ): Promise<ClientWithPackStatusResponseDto> {
    const client = this.clientRepository.create({
      ...createClientDto,
      organization_id: this.tenantContext.getOrganizationId() as string,
    });
    const savedClient = await this.clientRepository.save(client);

    // Incrementar el contador si el código coincide con el sugerido
    await this.surrogateService.useCodeIfMatches(
      'client',
      createClientDto.code,
    );

    const syncResult =
      await this.clientPackSyncService.syncOnCreate(savedClient);

    return {
      client: this.clientMapper.mapToResponseDto(syncResult.client),
      pack_sync_success: syncResult.packSyncSuccess,
      pack_sync_error: syncResult.packErrorMessage,
    };
  }

  async findAll(
    paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<ClientResponseDto>> {
    const { page, limit, term, is_active } = paginationDto || {};

    const query = this.clientRepository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.addresses', 'address')
      .leftJoinAndSelect('client.taxData', 'taxData')
      .leftJoinAndSelect('client.credit', 'credit')
      .where('client.deleted_at IS NULL')
      .andWhere('client.organization_id = :organizationId', {
        organizationId: this.organizationId,
      });

    if (is_active !== undefined) {
      const isActiveBool = String(is_active) === 'true';
      query.andWhere('client.status = :status', { status: isActiveBool });
    }

    if (term) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('client.code LIKE :term', { term: `%${term}%` })
            .orWhere('client.name LIKE :term', { term: `%${term}%` })
            .orWhere('client.description LIKE :term', { term: `%${term}%` })
            .orWhere('client.phone LIKE :term', { term: `%${term}%` })
            .orWhere('client.email LIKE :term', { term: `%${term}%` })
            .orWhere('taxData.tax_document LIKE :term', { term: `%${term}%` })
            .orWhere('taxData.tax_name LIKE :term', { term: `%${term}%` })
            .orWhere('address.street LIKE :term', { term: `%${term}%` })
            .orWhere('address.city LIKE :term', { term: `%${term}%` });
        }),
      );
    }

    // Paginación
    const currentPage = page || 1;
    const currentLimit = limit || 8;
    const skip = (currentPage - 1) * currentLimit;

    const [clients, total] = await query
      .skip(skip)
      .take(currentLimit)
      .getManyAndCount();

    const data = clients.map((client) =>
      this.clientMapper.mapToResponseDto(client),
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

  async findOne(id: string, userId?: string): Promise<ClientResponseDto> {
    const client = await this.clientRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['addresses', 'taxData', 'credit'],
      withDeleted: false,
    });
    if (!client) {
      const message = await this.translationService.translate(
        'client.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }
    return this.clientMapper.mapToResponseDto(client);
  }

  async update(
    id: string,
    updateClientDto: UpdateClientDto,
    userId?: string,
  ): Promise<ClientWithPackStatusResponseDto> {
    const client = await this.clientRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['addresses', 'taxData', 'credit'],
      withDeleted: false,
    });

    if (!client) {
      const message = await this.translationService.translate(
        'client.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    // Actualizar campos básicos
    const { delete_addresses, delete_tax_data, credit, ...baseData } =
      updateClientDto;
    Object.assign(client, baseData);

    // Manejar crédito
    if (credit) {
      if (!client.credit) {
        client.credit = this.clientCreditRepository.create({
          ...credit,
          client_id: id,
        });
      } else {
        Object.assign(client.credit, credit);
      }
    }

    // Manejar eliminaciones
    if (delete_addresses && delete_addresses.length > 0) {
      await this.clientAddressRepository.delete(delete_addresses);
    }
    if (delete_tax_data && delete_tax_data.length > 0) {
      await this.clientTaxDataRepository.delete(delete_tax_data);
    }

    // Si se envían direcciones, reemplazarlas o manejarlas
    // Nota: TypeORM save con cascade: true reemplazará o actualizará según el id
    const savedClient = await this.clientRepository.save(client);

    const syncResult = await this.clientPackSyncService.syncOnUpdate(
      savedClient,
      updateClientDto,
    );

    return {
      client: this.clientMapper.mapToResponseDto(syncResult.client),
      pack_sync_success: syncResult.packSyncSuccess,
      pack_sync_error: syncResult.packErrorMessage,
    };
  }

  async importFromPack(
    userId?: string,
  ): Promise<ImportClientsFromPackResponseDto> {
    return this.clientPackImportService.importAllFromPack(userId);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const client = await this.clientRepository.findOne({
      where: { id, organization_id: this.organizationId },
      withDeleted: false,
    });
    if (!client) {
      const message = await this.translationService.translate(
        'client.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    if (client.pack_client_id) {
      try {
        const packService: any =
          await this.certificationPackFactory.getPackService();
        if (
          packService?.deleteCustomer &&
          typeof packService.deleteCustomer === 'function'
        ) {
          await packService.deleteCustomer(client.pack_client_id);
        }
      } catch (error: any) {
        this.logger.warn(
          `Failed to delete client in pack (clientId=${id}, packClientId=${client.pack_client_id}): ${error?.message}`,
        );
        throw new BadRequestException(
          error?.message || 'Client cannot be deleted in the pack system.',
        );
      }
    }

    const invoiceCount = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.client_id = :id', { id })
      .getCount();

    const withdrawalCount = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .where('withdrawal.client_id = :id', { id })
      .getCount();

    if (invoiceCount > 0 || withdrawalCount > 0) {
      const message = await this.translationService.translate(
        'client.cannot_delete_in_use',
        userId,
        { invoiceCount, withdrawalCount },
      );
      throw new BadRequestException(message);
    }

    await this.clientRepository.softRemove(client);
  }

  async removeMany(ids: string[]): Promise<void> {
    await this.clientRepository.softDelete({
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
      ? manager.getRepository(Client)
      : this.clientRepository;
    const client = await repo.findOne({
      where: { id, organization_id: this.organizationId },
    });
    if (client) {
      client.balance = Number(client.balance || 0) + Number(amount);
      await repo.save(client, { reload: false });
    }
  }
}
