export class RolePermissionResponseDto {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: Date;
  deletedAt?: Date;
  role?: {
    id: string;
    code: string;
    description: string;
  };
  permission?: {
    id: string;
    code: string;
    description: string;
  };
} 