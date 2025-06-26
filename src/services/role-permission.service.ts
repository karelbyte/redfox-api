import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from '../models/role-permission.entity';
import { CreateRolePermissionDto } from '../dtos/role-permission/create-role-permission.dto';
import { RolePermissionMapper } from './mappers/role-permission.mapper';
import { RolePermissionResponseDto } from '../dtos/role-permission/role-permission-response.dto';

@Injectable()
export class RolePermissionService {
  constructor(
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
  ) {}

  async create(
    createRolePermissionDto: CreateRolePermissionDto,
  ): Promise<RolePermissionResponseDto> {
    const existingRolePermission = await this.rolePermissionRepository.findOne({
      where: {
        roleId: createRolePermissionDto.roleId,
        permissionId: createRolePermissionDto.permissionId,
      },
    });

    if (existingRolePermission) {
      throw new ConflictException(
        'Ya existe esta relación entre rol y permiso',
      );
    }

    const rolePermission = this.rolePermissionRepository.create({
      roleId: createRolePermissionDto.roleId,
      permissionId: createRolePermissionDto.permissionId,
    });

    const savedRolePermission =
      await this.rolePermissionRepository.save(rolePermission);
    return RolePermissionMapper.toResponseDto(savedRolePermission);
  }

  async findAll(): Promise<RolePermissionResponseDto[]> {
    const rolePermissions = await this.rolePermissionRepository.find({
      relations: ['role', 'permission'],
    });
    return RolePermissionMapper.toResponseDtoList(rolePermissions);
  }

  async findOne(id: string): Promise<RolePermissionResponseDto> {
    const rolePermission = await this.rolePermissionRepository.findOne({
      where: { id },
      relations: ['role', 'permission'],
    });

    if (!rolePermission) {
      throw new NotFoundException(
        `Relación rol-permiso con ID ${id} no encontrada`,
      );
    }

    return RolePermissionMapper.toResponseDto(rolePermission);
  }

  async findByRoleId(roleId: string): Promise<RolePermissionResponseDto[]> {
    const rolePermissions = await this.rolePermissionRepository.find({
      where: { roleId },
      relations: ['role', 'permission'],
    });
    return RolePermissionMapper.toResponseDtoList(rolePermissions);
  }

  async findByPermissionId(
    permissionId: string,
  ): Promise<RolePermissionResponseDto[]> {
    const rolePermissions = await this.rolePermissionRepository.find({
      where: { permissionId },
      relations: ['role', 'permission'],
    });
    return RolePermissionMapper.toResponseDtoList(rolePermissions);
  }

  async remove(id: string): Promise<void> {
    const rolePermission = await this.rolePermissionRepository.findOne({
      where: { id },
    });

    if (!rolePermission) {
      throw new NotFoundException(
        `Relación rol-permiso con ID ${id} no encontrada`,
      );
    }

    await this.rolePermissionRepository.softDelete(id);
  }

  async removeByRoleAndPermission(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    const rolePermission = await this.rolePermissionRepository.findOne({
      where: { roleId, permissionId },
    });

    if (!rolePermission) {
      throw new NotFoundException('Relación rol-permiso no encontrada');
    }

    await this.rolePermissionRepository.softDelete(rolePermission.id);
  }
}
