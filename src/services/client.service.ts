import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../models/client.entity';
import { CreateClientDto } from '../dtos/client/create-client.dto';
import { UpdateClientDto } from '../dtos/client/update-client.dto';
import { ClientResponseDto } from '../dtos/client/client-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
  ) {}

  private mapToResponseDto(client: Client): ClientResponseDto {
    const { id, code, name, tax_document, description, address, phone, email, status, created_at } = client;
    return { id, code, name, tax_document, description, address, phone, email, status, created_at };
  }

  async create(createClientDto: CreateClientDto): Promise<ClientResponseDto> {
    const client = this.clientRepository.create(createClientDto);
    const savedClient = await this.clientRepository.save(client);
    return this.mapToResponseDto(savedClient);
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginatedResponse<ClientResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [clients, total] = await this.clientRepository.findAndCount({
      withDeleted: false,
      skip,
      take: limit,
    });

    const data = clients.map((client) => this.mapToResponseDto(client));

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

  async findOne(id: string): Promise<ClientResponseDto> {
    const client = await this.clientRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
    return this.mapToResponseDto(client);
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
    return this.mapToResponseDto(updatedClient);
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