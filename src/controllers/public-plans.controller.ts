import { Controller, Get, Post, Body, Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { EmailQueue } from '../queues/email.queue';
import { SubscriptionService } from '../services/subscription.service';

class ContactDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsString()
  @MinLength(1)
  message: string;
}

@Controller('public')
export class PublicPlansController {
  private readonly logger = new Logger(PublicPlansController.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly emailQueue: EmailQueue,
    private readonly configService: ConfigService,
  ) {}

  @Get('plans')
  async getPublicPlans() {
    const plans = await this.subscriptionService.getAllPlans();
    return plans.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      billing_period: p.billing_period,
      description: p.description,
      features: p.features,
      is_default: p.is_default,
    }));
  }

  @Post('contact')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 600000, limit: 3 } })
  async contact(@Body() dto: ContactDto): Promise<{ success: boolean }> {
    const { name, email, company, message } = dto;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      this.logger.warn('[Contact] Missing required fields');
      return { success: false };
    }

    const notifyEmail = this.configService.get<string>('ERROR_NOTIFY_EMAIL');
    if (!notifyEmail) {
      this.logger.warn('[Contact] ERROR_NOTIFY_EMAIL not configured');
      return { success: false };
    }

    const companyRow = company
      ? `<tr>
           <td style="padding:8px 12px;background:#e2e8f0;font-weight:bold;border-radius:4px;">Empresa</td>
           <td style="padding:8px 12px;">${company}</td>
         </tr>`
      : '';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#6B7C6B;color:#EEF4EC;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h2 style="margin:0;font-size:18px;">📩 Nuevo mensaje desde la Landing — Nitro</h2>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr>
              <td style="padding:8px 12px;background:#e2e8f0;font-weight:bold;width:140px;border-radius:4px;">Nombre</td>
              <td style="padding:8px 12px;">${name}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#e2e8f0;font-weight:bold;border-radius:4px;">Email</td>
              <td style="padding:8px 12px;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            ${companyRow}
            <tr>
              <td style="padding:8px 12px;background:#e2e8f0;font-weight:bold;border-radius:4px;">Fecha</td>
              <td style="padding:8px 12px;">${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</td>
            </tr>
          </table>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:6px;padding:16px;">
            <p style="margin:0 0 8px;font-weight:bold;color:#374151;">Mensaje:</p>
            <p style="margin:0;color:#374151;white-space:pre-wrap;line-height:1.6;">${message}</p>
          </div>
        </div>
        <div style="background:#f1f5f9;padding:12px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Enviado desde nitrostock.work — Formulario de contacto</p>
        </div>
      </div>
    `;

    try {
      await this.emailQueue.addEmailJob({
        to: notifyEmail,
        subject: `[Landing Nitro] Nuevo contacto de ${name}${company ? ` — ${company}` : ''}`,
        html,
      });
      this.logger.log(`[Contact] Email queued for ${name} <${email}>`);
      return { success: true };
    } catch (error) {
      this.logger.error('[Contact] Failed to queue email', error);
      return { success: false };
    }
  }
}
