import { RoleResponseDto } from '../role/role-response.dto';

export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  roles: RoleResponseDto[];
  status: boolean;
  created_at: Date;
}
