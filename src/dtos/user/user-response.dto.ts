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
