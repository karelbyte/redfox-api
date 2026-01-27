import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Client } from '../models/client.entity';
import { CreateClientDto } from '../dtos/client/create-client.dto';
import { UpdateClientDto } from '../dtos/client/update-client.dto';
import { ClientResponseDto } from '../dtos/client/client-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { ClientMapper } from './mappers/client.mapper';
import { TranslationService } from './translation.service';
import { CertificationPackFactoryService } from './certification-pack-factory.service';
import { CustomerData } from '../interfaces/certification-pack.interface';

@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);

  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    private clientMapper: ClientMapper,
    private readonly translationService: TranslationService,
    private readonly certificationPackFactory: CertificationPackFactoryService,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<ClientResponseDto> {
    const client = this.clientRepository.create(createClientDto);
    const savedClient = await this.clientRepository.save(client);

    // Intentar crear el cliente en el pack de certificación
    try {
      const packService = await this.certificationPackFactory.getPackService();
      
      const customerData: CustomerData = {
        legal_name: savedClient.name,
        tax_id: savedClient.tax_document,
        tax_system: savedClient.tax_system || undefined,
        email: savedClient.email || undefined,
        phone: savedClient.phone || undefined,
        default_invoice_use: savedClient.default_invoice_use || undefined,
        address: {
          street: savedClient.address_street || undefined,
          exterior: savedClient.address_exterior || undefined,
          interior: savedClient.address_interior || undefined,
          neighborhood: savedClient.address_neighborhood || undefined,
          city: savedClient.address_city || undefined,
          municipality: savedClient.address_municipality || undefined,
          zip: savedClient.address_zip || undefined,
          state: savedClient.address_state || undefined,
          country: savedClient.address_country || undefined,
        },
      };

      const packResponse = await packService.createCustomer(customerData);
      
      // Actualizar el cliente con la información del pack
      savedClient.pack_product_id = packResponse.id;
      savedClient.pack_product_response = packResponse;
      
      const updatedClient = await this.clientRepository.save(savedClient);
      return this.clientMapper.mapToResponseDto(updatedClient);
    } catch (error) {
      // Si falla la creación en el pack, loguear el error pero no fallar la creación en la DB
      this.logger.warn(
        `Failed to create client in certification pack: ${error.message}`,
      );
      // Retornar el cliente guardado en la DB sin la información del pack
      return this.clientMapper.mapToResponseDto(savedClient);
    }
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
  ): Promise<ClientResponseDto> {
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

    // Intentar actualizar el cliente en el pack de certificación si tiene pack_product_id
    if (updatedClient.pack_product_id) {
      try {
        const packService = await this.certificationPackFactory.getPackService();
        
        const customerData: Partial<CustomerData> = {};
        
        if (updateClientDto.name) customerData.legal_name = updateClientDto.name;
        if (updateClientDto.tax_document) customerData.tax_id = updateClientDto.tax_document;
        if (updateClientDto.tax_system !== undefined) customerData.tax_system = updateClientDto.tax_system;
        if (updateClientDto.email !== undefined) customerData.email = updateClientDto.email;
        if (updateClientDto.phone !== undefined) customerData.phone = updateClientDto.phone;
        if (updateClientDto.default_invoice_use !== undefined) {
          customerData.default_invoice_use = updateClientDto.default_invoice_use;
        }

        // Solo incluir address si hay algún campo de dirección en el update
        if (
          updateClientDto.address_street !== undefined ||
          updateClientDto.address_exterior !== undefined ||
          updateClientDto.address_interior !== undefined ||
          updateClientDto.address_neighborhood !== undefined ||
          updateClientDto.address_city !== undefined ||
          updateClientDto.address_municipality !== undefined ||
          updateClientDto.address_zip !== undefined ||
          updateClientDto.address_state !== undefined ||
          updateClientDto.address_country !== undefined
        ) {
          customerData.address = {
            street: updateClientDto.address_street !== undefined 
              ? updateClientDto.address_street 
              : updatedClient.address_street || undefined,
            exterior: updateClientDto.address_exterior !== undefined 
              ? updateClientDto.address_exterior 
              : updatedClient.address_exterior || undefined,
            interior: updateClientDto.address_interior !== undefined 
              ? updateClientDto.address_interior 
              : updatedClient.address_interior || undefined,
            neighborhood: updateClientDto.address_neighborhood !== undefined 
              ? updateClientDto.address_neighborhood 
              : updatedClient.address_neighborhood || undefined,
            city: updateClientDto.address_city !== undefined 
              ? updateClientDto.address_city 
              : updatedClient.address_city || undefined,
            municipality: updateClientDto.address_municipality !== undefined 
              ? updateClientDto.address_municipality 
              : updatedClient.address_municipality || undefined,
            zip: updateClientDto.address_zip !== undefined 
              ? updateClientDto.address_zip 
              : updatedClient.address_zip || undefined,
            state: updateClientDto.address_state !== undefined 
              ? updateClientDto.address_state 
              : updatedClient.address_state || undefined,
            country: updateClientDto.address_country !== undefined 
              ? updateClientDto.address_country 
              : updatedClient.address_country || undefined,
          };
        }

        const packResponse = await packService.updateCustomer(
          updatedClient.pack_product_id,
          customerData,
        );
        
        // Actualizar la respuesta del pack
        updatedClient.pack_product_response = packResponse;
        
        const finalClient = await this.clientRepository.save(updatedClient);
        return this.clientMapper.mapToResponseDto(finalClient);
      } catch (error) {
        // Si falla la actualización en el pack, loguear el error pero no fallar la actualización en la DB
        this.logger.warn(
          `Failed to update client in certification pack: ${error.message}`,
        );
        // Retornar el cliente actualizado en la DB sin actualizar la respuesta del pack
        return this.clientMapper.mapToResponseDto(updatedClient);
      }
    }

    return this.clientMapper.mapToResponseDto(updatedClient);
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
    await this.clientRepository.softRemove(client);
  }
}
