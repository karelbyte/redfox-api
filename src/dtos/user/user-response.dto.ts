import { RoleResponseDto } from '../role/role-response.dto';

export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  roles: RoleResponseDto[];
  permissions: string[];
  status: boolean;
  created_at: Date;
}

export class UserWithPermissionDescriptionsDto {
  id: string;
  name: string;
  email: string;
  roles: RoleResponseDto[];
  permission_descriptions: string[];
  status: boolean;
  created_at: Date;
}
