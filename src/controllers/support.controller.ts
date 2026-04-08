import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { AuthGuard } from '../guards/auth.guard';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';
import { EmailService } from '../services/email.service';
import { ConfigService } from '@nestjs/config';
import { UserId } from '../decorators/user-id.decorator';
import { TenantContext } from '../services/tenant-context.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../models/user.entity';
import { Organization } from '../models/organization.entity';

class SendSupportMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  message: string;

  @IsString()
  @IsNotEmpty()
  subject: string;
}

@Controller('support')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class SupportController {
  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly tenantContext: TenantContext,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  @Post('contact')
  async sendSupportMessage(
    @Body() dto: SendSupportMessageDto,
    @UserId() userId: string,
  ): Promise<{ success: boolean }> {
    const notifyEmail = this.configService.get<string>('ERROR_NOTIFY_EMAIL');
    if (!notifyEmail) {
      return { success: false };
    }

    const organizationId = this.tenantContext.getOrganizationId();

    // Cargar datos del usuario y organización
    const [user, organization] = await Promise.all([
      this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'name', 'email'],
      }),
      organizationId
        ? this.organizationRepository.findOne({
            where: { id: organizationId },
            select: ['id', 'name', 'slug'],
          })
        : Promise.resolve(null),
    ]);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 18px;">💬 Mensaje de Soporte — Nitro</h2>
        </div>

        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; width: 140px; border-radius: 4px;">Organización</td>
              <td style="padding: 8px 12px;">${organization?.name ?? '—'} <span style="color:#64748b; font-size:12px;">(${organization?.slug ?? organizationId ?? '—'})</span></td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; border-radius: 4px;">Usuario</td>
              <td style="padding: 8px 12px;">${user?.name ?? '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; border-radius: 4px;">Email</td>
              <td style="padding: 8px 12px;"><a href="mailto:${user?.email}">${user?.email ?? '—'}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; border-radius: 4px;">Asunto</td>
              <td style="padding: 8px 12px;">${dto.subject}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; border-radius: 4px;">Fecha</td>
              <td style="padding: 8px 12px;">${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</td>
            </tr>
          </table>

          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px;">
            <p style="margin: 0 0 8px; font-weight: bold; color: #374151;">Mensaje:</p>
            <p style="margin: 0; color: #374151; white-space: pre-wrap; line-height: 1.6;">${dto.message}</p>
          </div>

        </div>

        <div style="background: #f1f5f9; padding: 12px 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">Enviado desde Nitro — Sistema de Soporte</p>
        </div>
      </div>
    `;

    const success = await this.emailService.sendSystemEmail(
      notifyEmail,
      `[Soporte Nitro] ${dto.subject} — ${organization?.name ?? userId}`,
      html,
    );

    return { success };
  }
}
