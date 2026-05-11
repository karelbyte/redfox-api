import { RoleResponseDto } from '../role/role-response.dto';

export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  organization_id?: string;
  organization_slug?: string;
  organization_referrer_code?: string;
  organization_country?: string | null;
  roles: RoleResponseDto[];
  permissions: string[];
  status: boolean;
  admin: boolean;
  created_at: Date;
}

export class UserWithPermissionDescriptionsDto {
  id: string;
  name: string;
  email: string;
  organization_id?: string;
  organization_slug?: string;
  organization_referrer_code?: string;
  roles: RoleResponseDto[];
  permission_descriptions: string[];
  status: boolean;
  admin: boolean;
  created_at: Date;
}
