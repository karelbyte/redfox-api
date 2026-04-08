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
import { Quotation } from '../models/quotation.entity';
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
import { AuditLogService } from './audit-log.service';
import { AuditAction } from '../models/audit-log.entity';

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
    @InjectRepository(Quotation)
    private readonly quotationRepository: Repository<Quotation>,
    private clientMapper: ClientMapper,
    private readonly translationService: TranslationService,
    private readonly clientPackSyncService: ClientPackSyncService,
    private readonly clientPackImportService: ClientPackImportService,
    private readonly certificationPackFactory: CertificationPackFactoryService,
    private readonly surrogateService: SurrogateService,
    private readonly tenantContext: TenantContext,
    private readonly auditLogService: AuditLogService,
  ) {}

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

    // NO sincronizar al pack en la creación — se sincroniza cuando tenga address y tax data
    return {
      client: this.clientMapper.mapToResponseDto(savedClient),
      pack_sync_success: false,
      pack_sync_error: undefined,
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
      const lowerTerm = term.toLowerCase();
      query.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(client.code) LIKE :term', { term: `%${lowerTerm}%` })
            .orWhere('LOWER(client.name) LIKE :term', {
              term: `%${lowerTerm}%`,
            })
            .orWhere('LOWER(client.description) LIKE :term', {
              term: `%${lowerTerm}%`,
            })
            .orWhere('LOWER(client.phone) LIKE :term', {
              term: `%${lowerTerm}%`,
            })
            .orWhere('LOWER(client.email) LIKE :term', {
              term: `%${lowerTerm}%`,
            })
            .orWhere('LOWER(taxData.tax_document) LIKE :term', {
              term: `%${lowerTerm}%`,
            })
            .orWhere('LOWER(taxData.tax_name) LIKE :term', {
              term: `%${lowerTerm}%`,
            })
            .orWhere('LOWER(address.street) LIKE :term', {
              term: `%${lowerTerm}%`,
            })
            .orWhere('LOWER(address.city) LIKE :term', {
              term: `%${lowerTerm}%`,
            });
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
    const {
      delete_addresses,
      delete_tax_data,
      credit,
      taxData,
      addresses,
      ...baseData
    } = updateClientDto;
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

    // Manejar actualización de taxData - asegurar que client_id se preserve
    if (taxData && taxData.length > 0) {
      for (const taxDataItem of taxData) {
        if (taxDataItem.id) {
          // Actualizar existente
          await this.clientTaxDataRepository.update(
            { id: taxDataItem.id },
            {
              ...taxDataItem,
              client_id: id, // Asegurar que client_id se preserve
            },
          );
        } else {
          // Crear nuevo
          const newTaxData = this.clientTaxDataRepository.create({
            ...taxDataItem,
            client_id: id,
          });
          await this.clientTaxDataRepository.save(newTaxData);
        }
      }
      // Recargar para obtener los datos actualizados
      client.taxData = await this.clientTaxDataRepository.find({
        where: { client_id: id },
      });
    }

    // Manejar actualización de addresses - asegurar que client_id se preserve
    if (addresses && addresses.length > 0) {
      for (const addressItem of addresses) {
        if (addressItem.id) {
          // Actualizar existente
          await this.clientAddressRepository.update(
            { id: addressItem.id },
            {
              ...addressItem,
              client_id: id, // Asegurar que client_id se preserve
            },
          );
        } else {
          // Crear nuevo
          const newAddress = this.clientAddressRepository.create({
            ...addressItem,
            client_id: id,
          });
          await this.clientAddressRepository.save(newAddress);
        }
      }
      // Recargar para obtener los datos actualizados
      client.addresses = await this.clientAddressRepository.find({
        where: { client_id: id },
      });
    }

    // Guardar cliente sin cascade para evitar que TypeORM intente actualizar relaciones
    const savedClient = await this.clientRepository.save(client);

    // Recargar el cliente con todas las relaciones para la sincronización
    const clientWithRelations = await this.clientRepository.findOne({
      where: { id: savedClient.id, organization_id: this.organizationId },
      relations: ['addresses', 'taxData', 'credit'],
      withDeleted: false,
    });

    const hasAddress = (clientWithRelations!.addresses || []).length > 0;
    const hasTaxData = (clientWithRelations!.taxData || []).length > 0;

    // Solo sincronizar al pack si tiene address Y tax data
    if (hasAddress && hasTaxData) {
      const syncResult = await this.clientPackSyncService.syncOnUpdate(
        clientWithRelations!,
        updateClientDto,
      );
      return {
        client: this.clientMapper.mapToResponseDto(syncResult.client),
        pack_sync_success: syncResult.packSyncSuccess,
        pack_sync_error: syncResult.packErrorMessage,
      };
    }

    return {
      client: this.clientMapper.mapToResponseDto(clientWithRelations!),
      pack_sync_success: false,
      pack_sync_error: undefined,
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

    // Verificar historial ANTES de tocar el pack
    const invoiceCount = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.client_id = :id', { id })
      .getCount();

    const withdrawalCount = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .where('withdrawal.client_id = :id', { id })
      .getCount();

    const quotationCount = await this.quotationRepository
      .createQueryBuilder('quotation')
      .where('quotation.client_id = :id', { id })
      .getCount();

    if (invoiceCount > 0 || withdrawalCount > 0 || quotationCount > 0) {
      const message = await this.translationService.translate(
        'client.cannot_delete_in_use',
        userId,
        { invoiceCount, withdrawalCount, quotationCount },
      );
      throw new BadRequestException(message);
    }

    // Solo eliminar del pack si pasó la validación de historial
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
        const isPackUnavailable =
          error?.status === 404 ||
          error?.message?.toLowerCase().includes('not found') ||
          error?.message?.toLowerCase().includes('no certification pack') ||
          error?.message?.toLowerCase().includes('not configured');

        if (!isPackUnavailable) {
          throw new BadRequestException(
            error?.message || 'Client cannot be deleted in the pack system.',
          );
        }
      }
    }

    // Guardar datos del cliente antes de eliminarlo para el log de auditoría
    const clientDataForAudit = { ...client };

    await this.clientRepository.softRemove(client);

    // Log manual de auditoría para soft delete
    try {
      await this.auditLogService.log(
        userId || 'SYSTEM',
        'Client',
        client.id,
        AuditAction.DELETE,
        clientDataForAudit,
        undefined,
        `Soft deleted client: ${client.name}`,
      );
    } catch (error: any) {
      this.logger.warn(
        `Failed to create audit log for client deletion: ${error?.message}`,
      );
    }
  }

  async removeMany(ids: string[]): Promise<void> {
    // Obtener los clientes antes de eliminarlos para el log de auditoría
    const clients = await this.clientRepository.find({
      where: {
        id: In(ids),
        organization_id: this.organizationId,
      },
      withDeleted: false,
    });

    await this.clientRepository.softDelete({
      id: In(ids),
      organization_id: this.organizationId,
    });

    // Log manual de auditoría para cada cliente eliminado
    for (const client of clients) {
      try {
        await this.auditLogService.log(
          'SYSTEM', // No tenemos userId en bulk delete
          'Client',
          client.id,
          AuditAction.DELETE,
          client,
          undefined,
          `Bulk soft deleted client: ${client.name}`,
        );
      } catch (error: any) {
        this.logger.warn(
          `Failed to create audit log for bulk client deletion (${client.id}): ${error?.message}`,
        );
      }
    }
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

  /**
   * Sincroniza manualmente un cliente existente con el pack activo.
   * Útil cuando el cliente fue creado antes de que el pack estuviera activo.
   */
  async syncWithPack(
    id: string,
    userId?: string,
  ): Promise<ClientWithPackStatusResponseDto> {
    const client = await this.clientRepository.findOne({
      where: { id, organization_id: this.organizationId },
      relations: ['addresses', 'taxData'],
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

    const hasAddress = (client.addresses || []).length > 0;
    const hasTaxData = (client.taxData || []).length > 0;

    if (!hasAddress || !hasTaxData) {
      const missing: string[] = [];
      if (!hasAddress) missing.push('dirección');
      if (!hasTaxData) missing.push('datos fiscales');
      throw new BadRequestException(
        `El cliente no puede sincronizarse al pack porque le falta: ${missing.join(' y ')}. Agrega estos datos primero.`,
      );
    }

    const syncResult = await this.clientPackSyncService.syncManually(client);

    return {
      client: this.clientMapper.mapToResponseDto(syncResult.client),
      pack_sync_success: syncResult.packSyncSuccess,
      pack_sync_error: syncResult.packErrorMessage,
    };
  }
}
