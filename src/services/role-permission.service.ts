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
import { TranslationService } from './translation.service';

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
    private readonly translationService: TranslationService,
  ) {}

  async create(
    createRolePermissionDto: CreateRolePermissionDto,
    userId?: string,
  ): Promise<RolePermissionResponseDto> {
    const existingRolePermission = await this.rolePermissionRepository.findOne({
      where: {
        roleId: createRolePermissionDto.roleId,
        permissionId: createRolePermissionDto.permissionId,
      },
    });

    if (existingRolePermission) {
      const message = await this.translationService.translate(
        'role_permission.already_exists',
        userId,
      );
      throw new ConflictException(message);
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
    userId?: string,
  ): Promise<RolePermissionResponseDto[]> {
    // Validate that permissionIds is an array
    if (!Array.isArray(assignPermissionsDto.permissionIds)) {
      const message = await this.translationService.translate(
        'role_permission.permission_ids_array_required',
        userId,
      );
      throw new BadRequestException(message);
    }

    // Validate that the array is not empty
    if (assignPermissionsDto.permissionIds.length === 0) {
      const message = await this.translationService.translate(
        'role_permission.permission_ids_empty',
        userId,
      );
      throw new BadRequestException(message);
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
        const message = await this.translationService.translate(
          'role_permission.role_not_found',
          userId,
          { roleId: assignPermissionsDto.roleId },
        );
        throw new NotFoundException(message);
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
        const message = await this.translationService.translate(
          'role_permission.permissions_not_found',
          userId,
          { missingIds: missingIds.join(', ') },
        );
        throw new BadRequestException(message);
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
    userId?: string,
  ): Promise<RolePermissionResponseDto[]> {
    // Validate that permissionIds is an array
    if (!Array.isArray(permissionIds)) {
      const message = await this.translationService.translate(
        'role_permission.permission_ids_array_required',
        userId,
      );
      throw new BadRequestException(message);
    }

    const assignPermissionsDto: AssignPermissionsToRoleDto = {
      roleId,
      permissionIds,
    };

    return this.assignPermissionsToRole(assignPermissionsDto, userId);
  }

  async findAll(): Promise<RolePermissionResponseDto[]> {
    const rolePermissions = await this.rolePermissionRepository.find({
      relations: ['role', 'permission'],
    });
    return RolePermissionMapper.toResponseDtoList(rolePermissions);
  }

  async findOne(id: string, userId?: string): Promise<RolePermissionResponseDto> {
    const rolePermission = await this.rolePermissionRepository.findOne({
      where: { id },
      relations: ['role', 'permission'],
    });

    if (!rolePermission) {
      const message = await this.translationService.translate(
        'role_permission.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
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

  async remove(id: string, userId?: string): Promise<void> {
    const rolePermission = await this.rolePermissionRepository.findOne({
      where: { id },
    });

    if (!rolePermission) {
      const message = await this.translationService.translate(
        'role_permission.not_found',
        userId,
        { id },
      );
      throw new NotFoundException(message);
    }

    await this.rolePermissionRepository.softDelete(id);
  }

  async removeByRoleAndPermission(
    roleId: string,
    permissionId: string,
    userId?: string,
  ): Promise<void> {
    const rolePermission = await this.rolePermissionRepository.findOne({
      where: { roleId, permissionId },
    });

    if (!rolePermission) {
      const message = await this.translationService.translate(
        'role_permission.relationship_not_found',
        userId,
      );
      throw new NotFoundException(message);
    }

    await this.rolePermissionRepository.softDelete(rolePermission.id);
  }
}
