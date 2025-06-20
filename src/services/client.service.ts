import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Client } from '../models/client.entity';
import { CreateClientDto } from '../dtos/client/create-client.dto';
import { UpdateClientDto } from '../dtos/client/update-client.dto';
import { ClientResponseDto } from '../dtos/client/client-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { ClientMapper } from './mappers/client.mapper';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    private clientMapper: ClientMapper,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<ClientResponseDto> {
    const client = this.clientRepository.create(createClientDto);
    const savedClient = await this.clientRepository.save(client);
    return this.clientMapper.mapToResponseDto(savedClient);
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
            { address: Like(`%${term}%`) },
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

  async findOne(id: string): Promise<ClientResponseDto> {
    const client = await this.clientRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
    return this.clientMapper.mapToResponseDto(client);
  }

  async update(
    id: string,
    updateClientDto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    const client = await this.clientRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
    const updatedClient = await this.clientRepository.save({
      ...client,
      ...updateClientDto,
    });
    return this.clientMapper.mapToResponseDto(updatedClient);
  }

  async remove(id: string): Promise<void> {
    const client = await this.clientRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
    await this.clientRepository.softRemove(client);
  }
}
