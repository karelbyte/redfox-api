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
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userService.findByEmailForAuth(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.status) {
      throw new UnauthorizedException(
        'User is not active. Please check your email to activate your account.',
      );
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
        created_at: user.created_at,
      },
    };
  }

  async impersonate(userId: string): Promise<AuthResponseDto> {
    const user = await this.userService.findOneWithPermissions(userId);
    if (!user) {
      throw new BadRequestException('Target user not found');
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
        created_at: user.created_at,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<void> {
    const existingUser = await this.userService.findByEmailForAuth(
      registerDto.email,
    );
    if (existingUser) {
      throw new BadRequestException('The email address is already in use.');
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
      .replace(/\s+/g, '-') // múltiples espacios → un guión
      .replace(/[^\w-]+/g, '') // eliminar cualquier carácter no alfanumérico
      .replace(/-+/g, '-') // múltiples guiones → uno solo
      .replace(/^-|-$/g, ''); // quitar guiones al inicio/fin

    if (slug.length < 3) {
      throw new BadRequestException(
        'El nombre de la organización genera un identificador demasiado corto. Usa un nombre más descriptivo.',
      );
    }

    const existingOrg = await this.organizationService.findBySlug(slug);
    if (existingOrg) {
      throw new BadRequestException(
        'The organization name already exists. Please choose another one.',
      );
    }

    const organization = await this.organizationService.create({
      name: registerDto.companyName,
      slug,
      status: false,
      ...(registerDto.referrer_code
        ? { referrer_code: registerDto.referrer_code.toUpperCase() }
        : {}),
    } as any);

    // Establecer el contexto de la organización
    this.tenantContext.setOrganizationId(organization.id);

    // Crear rol ADMIN para la nueva organización
    const adminRole = await this.roleService.create({
      organization_id: organization.id,
      code: 'ADMIN',
      description: 'Administrador con todos los permisos',
      status: true,
    } as any);

    // Asignar todos los permisos al rol ADMIN
    const allPermissions = await this.permissionService.findAll();
    const permissionIds = allPermissions.map((p) => p.id);
    await this.rolePermissionService.updateRolePermissions(
      adminRole.id,
      permissionIds,
    );

    // Crear el usuario ya asociado a la organización y al rol ADMIN
    const newUser = await this.userService.create({
      ...registerDto,
      organization_id: organization.id,
      role_ids: [adminRole.id],
      status: false, // El usuario se crea inactivo hasta que se verifique
    } as any);

    // Crear impuestos por defecto
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

    // Crear unidades de medida por defecto
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

    // Limpiar el contexto para no afectar otras peticiones concurrentes (aunque sea per-request)
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
        // No bloquear el registro si falla la notificación al admin
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

      const user = await this.userService.findOne(userId); // checks if exists
      if (!user) throw new BadRequestException('User not found');

      if (user.status) {
        return { message: 'User is already active', alreadyActive: true };
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

        // Crear monedas por defecto para la organización
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

      return { message: 'User successfully activated', alreadyActive: false };
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      throw new BadRequestException('Invalid or expired activation token');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userService.findByEmailForAuth(email);
    if (!user) {
      // Security: return success even if user not found to avoid email enumeration
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
          body { font-family: 'Inter','Segoe UI',Tahoma,Geneva,Verdana,sans-serif; line-height:1.6; color:#E2E8F0; margin:0; padding:0; background-color:#0F172A; }
          .container { max-width:600px; margin:40px auto; background:#1E293B; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,.5); border:1px solid #334155; }
          .header { background:#2D3748; padding:40px 20px; text-align:center; border-bottom:2px solid #EAB308; }
          .header h1 { color:#F8FAFC; margin:0; font-size:32px; font-weight:800; letter-spacing:-.025em; text-transform:uppercase; }
          .header h1 span { color:#EAB308; }
          .content { padding:40px; }
          .footer { background-color:#0F172A; padding:24px; text-align:center; font-size:13px; color:#64748B; border-top:1px solid #334155; }
          .button { display:inline-block; padding:16px 36px; background-color:#EAB308; color:#0F172A !important; text-decoration:none; border-radius:8px; font-weight:700; margin:30px 0; text-transform:uppercase; font-size:14px; }
          .welcome-text { font-size:20px; font-weight:600; color:#F8FAFC; margin-bottom:16px; }
          .instruction-text { color:#CBD5E1; margin-bottom:24px; font-size:15px; }
          .link-box { word-break:break-all; font-size:12px; color:#EAB308; background:#0F172A; padding:12px; border-radius:6px; border:1px solid #334155; }
          .expiry-notice { font-size:13px; color:#64748B; border-top:1px solid #334155; padding-top:24px; margin-top:24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>NITRO<span>.</span></h1></div>
          <div class="content">
            <p class="welcome-text">¡Hola, ${user.name}!</p>
            <p class="instruction-text">Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo para elegir una nueva:</p>
            <div style="text-align:center;">
              <a href="${resetLink}" class="button">Restablecer mi contraseña</a>
            </div>
            <p class="instruction-text">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p class="link-box">${resetLink}</p>
            <div class="expiry-notice">
              ⏱ Este enlace es válido por <strong>60 minutos</strong>.<br>
              Si no solicitaste este cambio, ignora este correo.
            </div>
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
        throw new BadRequestException('Invalid token type');
      }
      const userId = payload.sub;
      await this.userService.update(userId, { password });
    } catch (e) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  async getCurrentUser(userId: string): Promise<AuthResponseDto['user']> {
    const user = await this.userService.findOneWithPermissions(userId);
    if (!user) {
      throw new BadRequestException('User not found');
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
      created_at: user.created_at,
    };
  }
}
