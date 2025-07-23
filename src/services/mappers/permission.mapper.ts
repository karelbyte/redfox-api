import { Permission } from '../../models/permission.entity';
import { PermissionResponseDto } from '../../dtos/permission/permission-response.dto';

export class PermissionMapper {
  static toResponseDto(permission: Permission): PermissionResponseDto {
    if (!permission) {
      throw new Error('Permission cannot be null');
    }

    return {
      id: permission.id,
      code: permission.code,
      module: permission.module,
      description: permission.description,
      createdAt: permission.createdAt,
      deletedAt: permission.deletedAt,
    };
  }

  static toResponseDtoList(permissions: Permission[]): PermissionResponseDto[] {
    return permissions.map((permission) => this.toResponseDto(permission));
  }
}
