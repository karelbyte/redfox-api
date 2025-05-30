import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from './user.service';
import { LoginDto } from '../dtos/auth/login.dto';
import { AuthResponseDto } from '../dtos/auth/auth-response.dto';
import { compare } from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid: boolean = await compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return user;
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.code),
    };

    const expiresIn = '72h';
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    return {
      access_token: this.jwtService.sign(payload, { expiresIn }),
      expires_at: expiresAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles.map((role) => ({
          id: role.id,
          code: role.code,
          description: role.description,
          status: role.status,
          created_at: role.created_at,
        })),
        status: user.status,
        created_at: user.created_at,
      },
    };
  }
}
