import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../models/role.entity';
import { CreateRoleDto } from '../dtos/role/create-role.dto';
import { UpdateRoleDto } from '../dtos/role/update-role.dto';
import { RoleResponseDto } from '../dtos/role/role-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  private mapToResponseDto(role: Role): RoleResponseDto {
    const { id, name, description, status, created_at } = role;
    return {
      id,
      name,
      description,
      status,
      created_at,
    };
  }

  async create(createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    const role = this.roleRepository.create(createRoleDto);
    const savedRole = await this.roleRepository.save(role);
    return this.mapToResponseDto(savedRole);
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginatedResponse<RoleResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [roles, total] = await this.roleRepository.findAndCount({
      withDeleted: false,
      skip,
      take: limit,
    });

    const data = roles.map((role) => this.mapToResponseDto(role));

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

  async findOne(id: string): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }
    return this.mapToResponseDto(role);
  }

  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }
    const updatedRole = await this.roleRepository.save({
      ...role,
      ...updateRoleDto,
    });
    return this.mapToResponseDto(updatedRole);
  }

  async remove(id: string): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }
    await this.roleRepository.softRemove(role);
  }
} 