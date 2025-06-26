import { Permission } from '../../models/permission.entity';
import { PermissionResponseDto } from '../../dtos/permission/permission-response.dto';

export class PermissionMapper {
  static toResponseDto(permission: Permission): PermissionResponseDto {
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
