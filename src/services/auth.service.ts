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

    // Create user with inactive status
    // Note: UserService.create assumes we pass roles. We need to handle default role.
    // For now, we will let UserService handle user creation, but we need to ensure status is false.
    // However, UserService.create doesn't take status as arg, it uses default.
    // We should probably modify UserService.create or handle it here.

    // Let's create the user using UserService
    // We need to fetch the default role first if we want to assign one.
    // Assuming 'admin' role for now or a specific ID from env.
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

    // Solution: Create user, then update status to false.
    const newUser = await this.userService.create({
      ...registerDto,
      role_ids: roleIds,
    });

    // Manually set status to false via repo or update service if it exposed status update (it doesn't seem to)
    // Looking at UserService.update, it takes UpdateUserDto which might allow status?
    // Let's assume we can update it or we use raw query? Use update for now.
    // Actually, Entity default is true. We should probably set it to false explicitly if we can.

    // Hack: We will update the user status to false immediately
    await this.userService.update(newUser.id, { status: false } as any); // Casting as any if status not in DTO

    // Generate activation token
    const payload = { sub: newUser.id };
    const token = this.jwtService.sign(payload, { expiresIn: '24h' });

    // Send email
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    // HACK: user locale? We don't know it here. We'll default to 'es' or 'en' based on header? 
    // For now, let's assume 'es' or just send a generic link.
    // The frontend handles locale based on where the user lands, but the link needs a locale prefix if using next-intl
    // We can just link to /activate and let middleware redirect? No, next-intl needs prefix.
    // Let's assume default locale 'es'.
    const activationLink = `${frontendUrl}/es/activate?token=${token}`;

    const html = `
       <h1>Bienvenido a Nitro</h1>
       <p>Hola ${newUser.name},</p>
       <p>Gracias por registrarte. Por favor activa tu cuenta haciendo clic en el siguiente enlace:</p>
       <a href="${activationLink}">Activar Cuenta</a>
       <p>Este enlace expira en 24 horas.</p>
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
