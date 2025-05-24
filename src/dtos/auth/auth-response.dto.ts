import { UserResponseDto } from '../user/user-response.dto';

export class AuthResponseDto {
  access_token: string;
  expires_at: Date;
  user: UserResponseDto;
} 