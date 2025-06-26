import { RolePermission } from '../../models/role-permission.entity';
import { RolePermissionResponseDto } from '../../dtos/role-permission/role-permission-response.dto';

export class RolePermissionMapper {
  static toResponseDto(rolePermission: RolePermission): RolePermissionResponseDto {
    return {
      id: rolePermission.id,
      roleId: rolePermission.roleId,
      permissionId: rolePermission.permissionId,
      createdAt: rolePermission.createdAt,
      deletedAt: rolePermission.deletedAt,
      role: rolePermission.role
        ? {
            id: rolePermission.role.id,
            code: rolePermission.role.code,
            description: rolePermission.role.description,
          }
        : undefined,
      permission: rolePermission.permission
        ? {
            id: rolePermission.permission.id,
            code: rolePermission.permission.code,
            description: rolePermission.permission.description,
          }
        : undefined,
    };
  }

  static toResponseDtoList(rolePermissions: RolePermission[]): RolePermissionResponseDto[] {
    return rolePermissions.map((rolePermission) => this.toResponseDto(rolePermission));
  }
} 