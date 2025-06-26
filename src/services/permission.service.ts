import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../models/permission.entity';
import { CreatePermissionDto } from '../dtos/permission/create-permission.dto';
import { UpdatePermissionDto } from '../dtos/permission/update-permission.dto';
import { PermissionMapper } from './mappers/permission.mapper';
import { PermissionResponseDto } from '../dtos/permission/permission-response.dto';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async create(
    createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionResponseDto> {
    const existingPermission = await this.permissionRepository.findOne({
      where: { code: createPermissionDto.code },
    });

    if (existingPermission) {
      throw new ConflictException('Ya existe un permiso con este código');
    }

    const permission = this.permissionRepository.create({
      code: createPermissionDto.code,
      description: createPermissionDto.description,
    });

    const savedPermission = await this.permissionRepository.save(permission);
    return PermissionMapper.toResponseDto(savedPermission);
  }

  async findAll(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionRepository.find();
    return PermissionMapper.toResponseDtoList(permissions);
  }

  async findOne(id: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permiso con ID ${id} no encontrado`);
    }

    return PermissionMapper.toResponseDto(permission);
  }

  async update(
    id: string,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permiso con ID ${id} no encontrado`);
    }

    if (updatePermissionDto.code) {
      const existingPermission = await this.permissionRepository.findOne({
        where: { code: updatePermissionDto.code, id: { $ne: id } as any },
      });

      if (existingPermission) {
        throw new ConflictException('Ya existe un permiso con este código');
      }
    }

    Object.assign(permission, updatePermissionDto);
    const updatedPermission = await this.permissionRepository.save(permission);

    return PermissionMapper.toResponseDto(updatedPermission);
  }

  async remove(id: string): Promise<void> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permiso con ID ${id} no encontrado`);
    }

    await this.permissionRepository.softDelete(id);
  }
}
