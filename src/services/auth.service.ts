import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from './user.service';
import { LoginDto } from '../dtos/auth/login.dto';
import { RegisterDto } from '../dtos/auth/register.dto';
import { AuthResponseDto } from '../dtos/auth/auth-response.dto';
import { User } from '../models/user.entity';
import { compare } from 'bcrypt';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { RoleService } from './role.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
    private roleService: RoleService,
  ) { }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userService.findByEmailForAuth(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.status) {
      throw new UnauthorizedException('User is not active. Please check your email to activate your account.');
    }

    const isPasswordValid: boolean = await compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
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
        permissions: user.getPermissionCodes(),
        status: user.status,
        created_at: user.created_at,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<void> {
    const existingUser = await this.userService.findByEmailForAuth(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const defaultRoleCode = this.configService.get<string>('DEFAULT_ROLE_ID_FOR_USER_REGISTER');
    let roleIds: string[] = [];

    if (defaultRoleCode) {
      const role = await this.roleService.findByCode(defaultRoleCode);
      if (role) {
        roleIds = [role.id];
      } else {
        console.warn(`Default role code '${defaultRoleCode}' not found.`);
      }
    }

    const newUser = await this.userService.create({
      ...registerDto,
      role_ids: roleIds,
    });

    await this.userService.update(newUser.id, { status: false } as any); // Casting as any if status not in DTO


    const payload = { sub: newUser.id };
    const token = this.jwtService.sign(payload, { expiresIn: '24h' });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const activationLink = `${frontendUrl}/es/activate?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido a Nitro</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
          }
          .header {
            background: #6b7c6b;
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.025em;
          }
          .content {
            padding: 40px;
          }
          .footer {
            background-color: #f1f5f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background-color: #6b7c6b;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 30px 0;
            transition: background-color 0.2s;
          }
          .welcome-text {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 16px;
          }
          .instruction-text {
            color: #475569;
            margin-bottom: 24px;
          }
          .expiry-notice {
            font-size: 13px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nitro</h1>
          </div>
          <div class="content">
            <p class="welcome-text">¡Hola, ${newUser.name}!</p>
            <p class="instruction-text">Te damos la bienvenida a Nitro. Estamos emocionados de tenerte con nosotros.</p>
            <p class="instruction-text">Para comenzar a explorar todas las funciones, por favor activa tu cuenta haciendo clic en el botón de abajo:</p>
            
            <div style="text-align: center;">
              <a href="${activationLink}" class="button">Activar mi cuenta</a>
            </div>
            
            <p class="instruction-text">Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:</p>
            <p style="word-break: break-all; font-size: 12px; color: #6366f1;">${activationLink}</p>
            
            <div class="expiry-notice">
              Este enlace de activación es válido por las próximas 24 horas.<br>
              Si no solicitaste esta cuenta, puedes ignorar este correo.
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Nitro. Todos los derechos reservados.
          </div>
        </div>
      </body>
      </html>
    `;

    await this.emailService.sendSystemEmail(newUser.email, 'Activa tu cuenta de Nitro', html);
  }

  async activate(token: string): Promise<void> {
    try {
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      const user = await this.userService.findOne(userId); // checks if exists
      if (!user) throw new BadRequestException('User not found');

      if (user.status) {
        return; // Already active
      }

      await this.userService.update(user.id, { status: true } as any);
    } catch (e) {
      throw new BadRequestException('Invalid or expired activation token');
    }
  }
}
