import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { LoginDto } from '../dtos/auth/login.dto';
import { RegisterDto } from '../dtos/auth/register.dto';
import { AuthResponseDto } from '../dtos/auth/auth-response.dto';
import { User } from '../models/user.entity';
import { Currency } from '../models/currency.entity';
import { compare } from 'bcrypt';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { RoleService } from './role.service';
import { EmailQueue } from '../queues/email.queue';
import { OrganizationService } from './organization.service';
import { SubscriptionService } from './subscription.service';
import { PermissionService } from './permission.service';
import { RolePermissionService } from './role-permission.service';
import { TaxService } from './tax.service';
import { MeasurementUnitService } from './measurement-unit.service';
import { TenantContext } from './tenant-context.service';
import { TaxType } from '../models/tax.entity';
import { TranslationService } from './translation.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
    private roleService: RoleService,
    private emailQueue: EmailQueue,
    private organizationService: OrganizationService,
    private subscriptionService: SubscriptionService,
    private permissionService: PermissionService,
    private rolePermissionService: RolePermissionService,
    private taxService: TaxService,
    private measurementUnitService: MeasurementUnitService,
    private tenantContext: TenantContext,
    private readonly translationService: TranslationService,
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userService.findByEmailForAuth(email);
    if (!user) {
      const message = await this.translationService.translate(
        'auth.invalid_credentials',
      );
      throw new UnauthorizedException(message);
    }

    if (!user.status) {
      const message = await this.translationService.translate(
        'auth.user_inactive',
        user.id,
      );
      throw new UnauthorizedException(message);
    }

    const isPasswordValid: boolean = await compare(password, user.password);
    if (!isPasswordValid) {
      const message = await this.translationService.translate(
        'auth.invalid_credentials',
        user.id,
      );
      throw new UnauthorizedException(message);
    }

    return user;
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.code),
      organizationId: user.organization_id,
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
        organization_id: user.organization_id,
        organization_slug: user.organization?.slug,
        organization_referrer_code: user.organization?.referrer_code,
        roles: user.roles.map((role) => ({
          id: role.id,
          code: role.code,
          description: role.description,
          status: role.status,
          created_at: role.created_at,
        })),
        permissions: user.getPermissionCodes(),
        status: user.status,
        admin: user.admin,
        created_at: user.created_at,
      },
    };
  }

  async impersonate(userId: string): Promise<AuthResponseDto> {
    const user = await this.userService.findOneWithPermissions(userId);
    if (!user) {
      const message = await this.translationService.translate(
        'auth.target_user_not_found',
      );
      throw new BadRequestException(message);
    }

    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.code),
      organizationId: user.organization_id,
      isImpersonated: true,
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
        organization_id: user.organization_id,
        organization_slug: user.organization?.slug,
        organization_referrer_code: user.organization?.referrer_code,
        roles: user.roles.map((role) => ({
          id: role.id,
          code: role.code,
          description: role.description,
          status: role.status,
          created_at: role.created_at,
        })),
        permissions: user.getPermissionCodes(),
        status: user.status,
        admin: user.admin,
        created_at: user.created_at,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<void> {
    const existingUser = await this.userService.findByEmailForAuth(
      registerDto.email,
    );
    if (existingUser) {
      const message = await this.translationService.translate(
        'auth.email_already_in_use',
      );
      throw new BadRequestException(message);
    }

    const defaultRoleCode = this.configService.get<string>(
      'DEFAULT_ROLE_ID_FOR_USER_REGISTER',
    );
    let roleIds: string[] = [];

    if (defaultRoleCode) {
      const role = await this.roleService.findByCode(defaultRoleCode);
      if (role) {
        roleIds = [role.id];
      } else {
        console.warn(`Default role code '${defaultRoleCode}' not found.`);
      }
    }

    const slug = registerDto.companyName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (slug.length < 3) {
      const message = await this.translationService.translate(
        'auth.org_name_too_short',
      );
      throw new BadRequestException(message);
    }

    const existingOrg = await this.organizationService.findBySlug(slug);
    if (existingOrg) {
      const message = await this.translationService.translate(
        'auth.org_name_already_exists',
      );
      throw new BadRequestException(message);
    }

    const organization = await this.organizationService.create({
      name: registerDto.companyName,
      slug,
      status: false,
      ...(registerDto.referrer_code
        ? { referrer_code: registerDto.referrer_code.toUpperCase() }
        : {}),
    } as any);

    this.tenantContext.setOrganizationId(organization.id);

    const adminRole = await this.roleService.create({
      organization_id: organization.id,
      code: 'ADMIN',
      description: 'Administrador con todos los permisos',
      status: true,
    } as any);

    const allPermissions = await this.permissionService.findAll();
    const permissionIds = allPermissions.map((p) => p.id);
    await this.rolePermissionService.updateRolePermissions(
      adminRole.id,
      permissionIds,
    );

    const newUser = await this.userService.create({
      ...registerDto,
      organization_id: organization.id,
      role_ids: [adminRole.id],
      status: false,
      admin: true,
    } as any);

    await this.taxService.create({
      code: 'IVA',
      name: 'IVA 16%',
      value: 16,
      type: TaxType.PERCENTAGE,
      isActive: true,
    });

    await this.taxService.create({
      code: 'IVA',
      name: 'IVA 0%',
      value: 0,
      type: TaxType.PERCENTAGE,
      isActive: true,
    });

    const defaultUnits = [
      { code: 'E48', description: 'Unidad de servicio' },
      { code: 'H87', description: 'Pieza' },
      { code: 'ACT', description: 'Actividad' },
      { code: 'HUR', description: 'Hora' },
      { code: 'XPK', description: 'Paquete' },
      { code: 'SET', description: 'Conjunto' },
      { code: 'KGM', description: 'Kilogramo' },
      { code: 'LTR', description: 'Litro' },
      { code: 'MTR', description: 'Metro' },
      { code: 'MTK', description: 'Metro cuadrado' },
      { code: 'XBX', description: 'Caja' },
      { code: 'E51', description: 'Trabajo' },
    ];

    for (const unit of defaultUnits) {
      try {
        await this.measurementUnitService.create({
          code: unit.code,
          description: unit.description,
          status: true,
        });
      } catch (error) {
        console.error(`Error creating default unit ${unit.code}:`, error);
      }
    }

    this.tenantContext.clear();

    const payload = { sub: newUser.id };
    const token = this.jwtService.sign(payload, { expiresIn: '72h' });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

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
            font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #E2E8F0;
            margin: 0;
            padding: 0;
            background-color: #0F172A;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #1E293B;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
            border: 1px solid #334155;
          }
          .header {
            background: #2D3748;
            padding: 40px 20px;
            text-align: center;
            border-bottom: 2px solid #EAB308;
          }
          .header h1 {
            color: #F8FAFC;
            margin: 0;
            font-size: 32px;
            font-weight: 800;
            letter-spacing: -0.025em;
            text-transform: uppercase;
          }
          .header h1 span {
            color: #EAB308;
          }
          .content {
            padding: 40px;
          }
          .footer {
            background-color: #0F172A;
            padding: 24px;
            text-align: center;
            font-size: 13px;
            color: #64748B;
            border-top: 1px solid #334155;
          }
          .button {
            display: inline-block;
            padding: 16px 36px;
            background-color: #EAB308;
            color: #0F172A !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 700;
            margin: 30px 0;
            transition: all 0.2s;
            text-transform: uppercase;
            font-size: 14px;
            box-shadow: 0 4px 6px rgba(234, 179, 8, 0.2);
          }
          .button:hover {
            background-color: #FACC15;
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(234, 179, 8, 0.3);
          }
          .welcome-text {
            font-size: 20px;
            font-weight: 600;
            color: #F8FAFC;
            margin-bottom: 16px;
          }
          .instruction-text {
            color: #CBD5E1;
            margin-bottom: 24px;
            font-size: 16px;
          }
          .expiry-notice {
            font-size: 13px;
            color: #64748B;
            border-top: 1px solid #334155;
            padding-top: 24px;
            margin-top: 24px;
          }
          .highlight {
            color: #EAB308;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NITRO<span>.</span></h1>
          </div>
          <div class="content">
            <p class="welcome-text">¡Hola, ${newUser.name}!</p>
            <p class="instruction-text">Te damos la bienvenida a <span class="highlight">Nitro</span>. Estamos emocionados de tenerte con nosotros y ayudarte a potenciar tu negocio.</p>
            <p class="instruction-text">Para comenzar a explorar todas las funciones, por favor activa tu cuenta haciendo clic en el botón de abajo:</p>
            
            <div style="text-align: center;">
              <a href="${activationLink}" class="button">Activar mi cuenta</a>
            </div>
            
            <p class="instruction-text">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; font-size: 12px; color: #EAB308; background: #0F172A; padding: 12px; border-radius: 6px; border: 1px solid #334155;">${activationLink}</p>
            
            <div class="expiry-notice">
              Este enlace de activación es válido por las próximas <strong>72 horas</strong> (3 días).<br><br>
              Si no solicitaste esta cuenta, puedes ignorar este correo sin ningún problema.
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} NITRO. El motor de tu negocio.<br>Todos los derechos reservados.
          </div>
        </div>
      </body>
      </html>
    `;

    await this.emailQueue.addEmailJob({
      to: newUser.email,
      subject: 'Activa tu cuenta de Nitro',
      html,
    });

    // Notificar al admin sobre el nuevo registro
    const notifyEmail = this.configService.get<string>('ERROR_NOTIFY_EMAIL');
    if (notifyEmail) {
      try {
        await this.emailService.sendSystemEmail(
          notifyEmail,
          '🆕 Nuevo registro en Nitro',
          `
            <h2>Nuevo usuario registrado</h2>
            <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px;">
              <tr><td style="padding:8px;font-weight:bold;color:#555;">Nombre</td><td style="padding:8px;">${newUser.name}</td></tr>
              <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555;">Email</td><td style="padding:8px;">${newUser.email}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#555;">Empresa</td><td style="padding:8px;">${registerDto.companyName}</td></tr>
              <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555;">Slug</td><td style="padding:8px;">${slug}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#555;">Organización ID</td><td style="padding:8px;">${organization.id}</td></tr>
              <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555;">Referido por</td><td style="padding:8px;">${registerDto.referrer_code || '—'}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#555;">Fecha</td><td style="padding:8px;">${new Date().toLocaleString('es-MX', { timeZone: 'America/Hermosillo' })}</td></tr>
            </table>
          `,
        );
      } catch (err: any) {
        console.warn(
          '[Auth] Failed to send admin registration notification:',
          err?.message,
        );
      }
    }
  }

  async activate(
    token: string,
  ): Promise<{ message: string; alreadyActive: boolean }> {
    try {
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      const user = await this.userService.findOne(userId);
      if (!user) {
        const message = await this.translationService.translate(
          'auth.user_not_found',
        );
        throw new BadRequestException(message);
      }

      if (user.status) {
        const message = await this.translationService.translate(
          'auth.user_already_active',
          user.id,
        );
        return { message, alreadyActive: true };
      }

      await this.userService.update(user.id, { status: true } as any);

      let subscription: any = null;
      if (user.organization_id) {
        await this.organizationService.update(user.organization_id, {
          status: true,
        });

        try {
          subscription = await this.subscriptionService.createTrialSubscription(
            user.organization_id,
            user.email,
          );
        } catch (subscriptionError) {
          console.error(
            'Failed to create trial subscription:',
            subscriptionError,
          );
        }

        try {
          const defaultCurrencies = [
            { code: 'MXN', name: 'Peso Mexicano' },
            { code: 'USD', name: 'Dólar Estadounidense' },
          ];
          for (const c of defaultCurrencies) {
            const exists = await this.currencyRepository.findOne({
              where: { code: c.code, organization_id: user.organization_id },
            });
            if (!exists) {
              await this.currencyRepository.save(
                this.currencyRepository.create({
                  code: c.code,
                  name: c.name,
                  organization_id: user.organization_id,
                }),
              );
            }
          }
        } catch (currencyError) {
          console.error('Failed to create default currencies:', currencyError);
        }
      }

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';

      const trialEndDate = subscription?.trial_end_date
        ? new Date(subscription.trial_end_date).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'N/A';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>¡Bienvenido a Nitro!</title>
          <style>
            body {
              font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #E2E8F0;
              margin: 0;
              padding: 0;
              background-color: #0F172A;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: #1E293B;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
              border: 1px solid #334155;
            }
            .header {
              background: #2D3748;
              padding: 40px 20px;
              text-align: center;
              border-bottom: 2px solid #EAB308;
            }
            .header h1 {
              color: #F8FAFC;
              margin: 0;
              font-size: 32px;
              font-weight: 800;
              letter-spacing: -0.025em;
              text-transform: uppercase;
            }
            .header h1 span {
              color: #EAB308;
            }
            .content {
              padding: 40px;
            }
            .success-badge {
              background: #10B981;
              color: white;
              padding: 12px 24px;
              border-radius: 8px;
              display: inline-block;
              font-weight: 700;
              margin-bottom: 24px;
              font-size: 14px;
            }
            .trial-box {
              background: #0F172A;
              border: 2px solid #EAB308;
              border-radius: 12px;
              padding: 24px;
              margin: 24px 0;
            }
            .trial-box h3 {
              color: #EAB308;
              margin-top: 0;
              font-size: 20px;
            }
            .trial-info {
              color: #CBD5E1;
              margin: 12px 0;
            }
            .trial-info strong {
              color: #F8FAFC;
            }
            .plan-box {
              background: #334155;
              border-radius: 12px;
              padding: 24px;
              margin: 24px 0;
            }
            .plan-box h3 {
              color: #EAB308;
              margin-top: 0;
            }
            .plan-features {
              list-style: none;
              padding: 0;
              margin: 16px 0;
            }
            .plan-features li {
              padding: 8px 0;
              color: #CBD5E1;
              padding-left: 24px;
              position: relative;
            }
            .plan-features li:before {
              content: "✓";
              color: #10B981;
              font-weight: bold;
              position: absolute;
              left: 0;
            }
            .price {
              font-size: 36px;
              font-weight: 800;
              color: #EAB308;
              margin: 16px 0;
            }
            .button {
              display: inline-block;
              padding: 16px 36px;
              background-color: #EAB308;
              color: #0F172A !important;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 700;
              margin: 20px 0;
              transition: all 0.2s;
              text-transform: uppercase;
              font-size: 14px;
              box-shadow: 0 4px 6px rgba(234, 179, 8, 0.2);
            }
            .button:hover {
              background-color: #FACC15;
              transform: translateY(-2px);
              box-shadow: 0 6px 12px rgba(234, 179, 8, 0.3);
            }
            .footer {
              background-color: #0F172A;
              padding: 24px;
              text-align: center;
              font-size: 13px;
              color: #64748B;
              border-top: 1px solid #334155;
            }
            .welcome-text {
              font-size: 20px;
              font-weight: 600;
              color: #F8FAFC;
              margin-bottom: 16px;
            }
            .instruction-text {
              color: #CBD5E1;
              margin-bottom: 16px;
              font-size: 16px;
            }
            .highlight {
              color: #EAB308;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>NITRO<span>.</span></h1>
            </div>
            <div class="content">
              <div style="text-align: center;">
                <span class="success-badge">✓ CUENTA ACTIVADA</span>
              </div>
              
              <p class="welcome-text">¡Hola, ${user.name}!</p>
              <p class="instruction-text">
                Tu cuenta ha sido activada exitosamente. ¡Estamos emocionados de tenerte con nosotros!
              </p>

              <div class="trial-box">
                <h3>🎉 Período de Prueba Activado</h3>
                <p class="trial-info">
                  <strong>Duración:</strong> 7 días gratis<br>
                  <strong>Finaliza:</strong> ${trialEndDate}<br>
                  <strong>Acceso:</strong> Todas las funcionalidades
                </p>
                <p class="instruction-text">
                  Durante estos 7 días podrás explorar todas las características de Nitro sin ningún costo.
                </p>
              </div>

              <div class="plan-box">
                <h3>Plan Único - Todas las Características</h3>
                <div class="price">$700 <span style="font-size: 18px; color: #CBD5E1;">MXN/mes</span></div>
                
                <ul class="plan-features">
                  <li>Usuarios ilimitados</li>
                  <li>Almacenes ilimitados</li>
                  <li>Productos ilimitados</li>
                  <li>Todas las estrategias de inventario (FIFO, AVERAGE, FEFO)</li>
                  <li>Gestión de crédito a clientes</li>
                  <li>Facturación electrónica (CFDI)</li>
                  <li>Reportes avanzados y análisis</li>
                  <li>API REST y Webhooks</li>
                  <li>Soporte prioritario</li>
                </ul>

                <p class="instruction-text">
                  Después del período de prueba, necesitarás activar tu suscripción para continuar usando Nitro.
                </p>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${frontendUrl}" class="button">Comenzar a usar Nitro</a>
              </div>

              <p class="instruction-text" style="font-size: 14px; color: #64748B; text-align: center;">
                💡 Tip: Te enviaremos recordatorios antes de que finalice tu período de prueba.
              </p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} NITRO. El motor de tu negocio.<br>
              Todos los derechos reservados.
            </div>
          </div>
        </body>
        </html>
      `;

      await this.emailQueue.addEmailJob({
        to: user.email,
        subject: '¡Bienvenido a Nitro! Tu cuenta está activa',
        html,
      });

      const message = await this.translationService.translate(
        'auth.user_activated_successfully',
        user.id,
      );
      return { message, alreadyActive: false };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message = await this.translationService.translate(
        'auth.invalid_activation_token',
      );
      throw new BadRequestException(message);
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userService.findByEmailForAuth(email);
    if (!user) {
      return;
    }

    const payload = { sub: user.id, type: 'password-reset' };
    const token = this.jwtService.sign(payload, { expiresIn: '1h' });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/es/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restablecer Contraseña - Nitro</title>
        <style>
          body {
            font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #E2E8F0;
            margin: 0;
            padding: 0;
            background-color: #0F172A;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #1E293B;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
            border: 1px solid #334155;
          }
          .header {
            background: #6B7C6B;
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            color: #EEF4EC;
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.025em;
          }
          .content {
            padding: 40px;
          }
          .content h2 {
            color: #F8FAFC;
            font-size: 20px;
            margin-top: 0;
          }
          .content p {
            color: #94A3B8;
            margin-bottom: 24px;
          }
          .button-container {
            text-align: center;
            margin: 32px 0;
          }
          .button {
            background-color: #6B7C6B;
            color: #EEF4EC !important;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            display: inline-block;
            transition: all 0.2s;
          }
          .footer {
            background: #0F172A;
            padding: 24px;
            text-align: center;
            font-size: 14px;
            color: #64748B;
            border-top: 1px solid #334155;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NITRO</h1>
          </div>
          <div class="content">
            <h2>Restablecer Contraseña</h2>
            <p>Hola,</p>
            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Si no hiciste esta solicitud, puedes ignorar este correo.</p>
            <div class="button-container">
              <a href="${resetLink}" class="button">Restablecer Contraseña</a>
            </div>
            <p>Este enlace expirará en 1 hora por razones de seguridad.</p>
            <p>Si tienes problemas con el botón, copia y pega el siguiente enlace en tu navegador:</p>
            <p style="word-break: break-all; font-size: 12px; color: #64748B;">${resetLink}</p>
          </div>
          <div class="footer">&copy; ${new Date().getFullYear()} NITRO. El motor de tu negocio.<br>Todos los derechos reservados.</div>
        </div>
      </body>
      </html>
    `;

    await this.emailQueue.addEmailJob({
      to: user.email,
      subject: 'Restablecer contraseña - Nitro',
      html,
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.type !== 'password-reset') {
        const message = await this.translationService.translate(
          'auth.invalid_token_type',
        );
        throw new BadRequestException(message);
      }
      const userId = payload.sub;
      await this.userService.update(userId, { password });
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      const message = await this.translationService.translate(
        'auth.invalid_reset_token',
      );
      throw new BadRequestException(message);
    }
  }

  async getCurrentUser(userId: string): Promise<AuthResponseDto['user']> {
    const user = await this.userService.findOneWithPermissions(userId);
    if (!user) {
      const message = await this.translationService.translate(
        'auth.user_not_found',
      );
      throw new BadRequestException(message);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      organization_id: user.organization_id,
      organization_slug: user.organization?.slug,
      organization_referrer_code: user.organization?.referrer_code,
      roles: user.roles.map((role) => ({
        id: role.id,
        code: role.code,
        description: role.description,
        status: role.status,
        created_at: role.created_at,
      })),
      permissions: user.getPermissionCodes(),
      status: user.status,
      admin: user.admin,
      created_at: user.created_at,
    };
  }
}
