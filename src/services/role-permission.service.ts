import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { RolePermission } from '../models/role-permission.entity';
import { Role } from '../models/role.entity';
import { Permission } from '../models/permission.entity';
import {
  CreateRolePermissionDto,
  AssignPermissionsToRoleDto,
} from '../dtos/role-permission/create-role-permission.dto';
import { RolePermissionMapper } from './mappers/role-permission.mapper';
import { RolePermissionResponseDto } from '../dtos/role-permission/role-permission-response.dto';

@Injectable()
export class RolePermissionService {
  constructor(
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private dataSource: DataSource,
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

  async assignPermissionsToRole(
    assignPermissionsDto: AssignPermissionsToRoleDto,
  ): Promise<RolePermissionResponseDto[]> {
    // Validate that permissionIds is an array
    if (!Array.isArray(assignPermissionsDto.permissionIds)) {
      throw new BadRequestException('permissionIds debe ser un array');
    }

    // Validate that the array is not empty
    if (assignPermissionsDto.permissionIds.length === 0) {
      throw new BadRequestException('permissionIds no puede estar vacío');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify role exists
      const role = await queryRunner.manager.findOne(Role, {
        where: { id: assignPermissionsDto.roleId },
      });

      if (!role) {
        throw new NotFoundException(
          `Rol con ID ${assignPermissionsDto.roleId} no encontrado`,
        );
      }

      // Verify all permissions exist using a more direct approach
      const permissions = await queryRunner.manager
        .createQueryBuilder(Permission, 'permission')
        .where('permission.id IN (:...ids)', {
          ids: assignPermissionsDto.permissionIds,
        })
        .getMany();

      if (permissions.length !== assignPermissionsDto.permissionIds.length) {
        const foundIds = permissions.map((p) => p.id);
        const missingIds = assignPermissionsDto.permissionIds.filter(
          (id) => !foundIds.includes(id),
        );
        throw new BadRequestException(
          `Permisos no encontrados: ${missingIds.join(', ')}`,
        );
      }

      // Remove existing permissions for this role
      await queryRunner.manager.delete(RolePermission, {
        roleId: assignPermissionsDto.roleId,
      });

      // Create new role-permission relationships
      const rolePermissions = assignPermissionsDto.permissionIds.map(
        (permissionId) =>
          this.rolePermissionRepository.create({
            roleId: assignPermissionsDto.roleId,
            permissionId,
          }),
      );

      const savedRolePermissions = await queryRunner.manager.save(
        RolePermission,
        rolePermissions,
      );

      await queryRunner.commitTransaction();

      // Return the created relationships with relations loaded
      const result = await this.rolePermissionRepository.find({
        where: { id: In(savedRolePermissions.map((rp) => rp.id)) },
        relations: ['role', 'permission'],
      });

      return RolePermissionMapper.toResponseDtoList(result);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateRolePermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<RolePermissionResponseDto[]> {
    // Validate that permissionIds is an array
    if (!Array.isArray(permissionIds)) {
      throw new BadRequestException('permissionIds debe ser un array');
    }

    const assignPermissionsDto: AssignPermissionsToRoleDto = {
      roleId,
      permissionIds,
    };

    return this.assignPermissionsToRole(assignPermissionsDto);
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
