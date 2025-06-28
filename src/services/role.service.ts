import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../models/role.entity';
import { CreateRoleDto } from '../dtos/role/create-role.dto';
import { UpdateRoleDto } from '../dtos/role/update-role.dto';
import { RoleResponseDto } from '../dtos/role/role-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { TranslationService } from './translation.service';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private readonly translationService: TranslationService,
  ) {}

  private mapToResponseDto(role: Role): RoleResponseDto {
    const { id, code, description, status, created_at } = role;
    return {
      id,
      code,
      description,
      status,
      created_at,
    };
  }

  async create(
    createRoleDto: CreateRoleDto,
    userId?: string,
  ): Promise<RoleResponseDto> {
    try {
      const role = this.roleRepository.create(createRoleDto);
      const savedRole = await this.roleRepository.save(role);
      return this.mapToResponseDto(savedRole);
    } catch (error) {
      // Handle duplicate code error
      if (
        error.code === 'ER_DUP_ENTRY' &&
        error.message.includes('roles.UQ_')
      ) {
        const message = await this.translationService.translate(
          'role.already_exists',
          userId,
          { code: createRoleDto.code },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<RoleResponseDto>> {
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

  async findOne(id: string, userId?: string): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!role) {
      const message = await this.translationService.translate(
        'role.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }
    return this.mapToResponseDto(role);
  }

  async findOneEntity(id: string, userId?: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!role) {
      const message = await this.translationService.translate(
        'role.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }
    return role;
  }

  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
    userId?: string,
  ): Promise<RoleResponseDto> {
    try {
      const role = await this.roleRepository.findOne({
        where: { id },
        withDeleted: false,
      });
      if (!role) {
        const message = await this.translationService.translate(
          'role.not_found',
          userId,
          { id },
        );
        throw new NotFoundException(message);
      }
      const updatedRole = await this.roleRepository.save({
        ...role,
        ...updateRoleDto,
      });
      return this.mapToResponseDto(updatedRole);
    } catch (error) {
      // Handle duplicate code error in update
      if (
        error.code === 'ER_DUP_ENTRY' &&
        error.message.includes('roles.UQ_')
      ) {
        const message = await this.translationService.translate(
          'role.already_exists',
          userId,
          { code: updateRoleDto.code },
        );
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id },
      withDeleted: false,
    });
    if (!role) {
      const message = await this.translationService.translate(
        'role.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }
    await this.roleRepository.softRemove(role);
  }
}
