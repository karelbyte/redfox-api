import { IsNotEmpty, IsUUID, IsArray, IsString } from 'class-validator';

export class CreateRolePermissionDto {
  @IsNotEmpty()
  @IsUUID()
  roleId: string;

  @IsNotEmpty()
  @IsUUID()
  permissionId: string;
}

export class AssignPermissionsToRoleDto {
  @IsNotEmpty()
  @IsUUID()
  roleId: string;

  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  permissionIds: string[];
}

// This is just for validation, the actual type is string[]
export class UpdateRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  permissionIds: string[];
}
