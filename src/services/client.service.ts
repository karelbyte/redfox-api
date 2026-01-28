import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
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

@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);

  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    private clientMapper: ClientMapper,
    private readonly translationService: TranslationService,
    private readonly clientPackSyncService: ClientPackSyncService,
    private readonly clientPackImportService: ClientPackImportService,
    private readonly certificationPackFactory: CertificationPackFactoryService,
  ) {}

  async create(
    createClientDto: CreateClientDto,
  ): Promise<ClientWithPackStatusResponseDto> {
    const client = this.clientRepository.create(createClientDto);
    const savedClient = await this.clientRepository.save(client);

    const syncResult = await this.clientPackSyncService.syncOnCreate(
      savedClient,
    );

    return {
      client: this.clientMapper.mapToResponseDto(syncResult.client),
      pack_sync_success: syncResult.packSyncSuccess,
      pack_sync_error: syncResult.packErrorMessage,
    };
  }

  async findAll(
    paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<ClientResponseDto>> {
    const { page, limit, term } = paginationDto || {};

    // Construir las condiciones de búsqueda
    const baseConditions = { withDeleted: false };
    const whereConditions = term
      ? {
          ...baseConditions,
          where: [
            { code: Like(`%${term}%`) },
            { name: Like(`%${term}%`) },
            { tax_document: Like(`%${term}%`) },
            { description: Like(`%${term}%`) },
            { phone: Like(`%${term}%`) },
            { email: Like(`%${term}%`) },
          ],
        }
      : baseConditions;

    // Si no se proporciona paginación, devolver toda la data
    if (!page && !limit) {
      const clients = await this.clientRepository.find(whereConditions);

      const data = clients.map((client) =>
        this.clientMapper.mapToResponseDto(client),
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

    const [clients, total] = await this.clientRepository.findAndCount({
      ...whereConditions,
      skip,
      take: currentLimit,
    });

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
      where: { id },
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
      where: { id },
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
    
    const updatedClient = await this.clientRepository.save({
      ...client,
      ...updateClientDto,
    });

    const syncResult = await this.clientPackSyncService.syncOnUpdate(
      updatedClient,
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
      where: { id },
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

    // Validar uso (facturas / ventas) antes de permitir eliminar
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

    // Best-effort: si tiene pack_client_id e implementación soporta borrado, intentar borrar en pack
    if (client.pack_client_id) {
      try {
        const packService: any = await this.certificationPackFactory.getPackService();
        if (packService?.deleteCustomer && typeof packService.deleteCustomer === 'function') {
          await packService.deleteCustomer(client.pack_client_id);
        }
      } catch (error: any) {
        this.logger.warn(
          `Failed to delete client in pack (clientId=${id}, packClientId=${client.pack_client_id}): ${error?.message}`,
        );
        // no bloquear eliminación local
      }
    }

    await this.clientRepository.softRemove(client);
  }
}
