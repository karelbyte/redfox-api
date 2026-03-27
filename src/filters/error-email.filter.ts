import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { EmailService } from '../services/email.service';

@Catch()
export class ErrorEmailFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorEmailFilter.name);
  private readonly recentErrors = new Map<string, number>();
  private readonly RATE_LIMIT_MS = 60_000; // 1 email por error único cada 60s

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : exception instanceof Error
          ? exception.message
          : 'Unknown error';

    const stack =
      exception instanceof Error ? exception.stack : String(exception);

    // Responder al cliente normalmente
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request?.url,
      message,
    };

    if (response && typeof response.status === 'function') {
      response.status(status).json(errorResponse);
    }

    // Solo enviar email para errores de servidor (5xx)
    if (status >= 500) {
      await this.sendErrorEmail(request, status, message, stack);
    }
  }

  private async sendErrorEmail(
    request: Request,
    status: number,
    message: string,
    stack?: string,
  ) {
    const errorEmail = this.configService.get<string>('ERROR_NOTIFY_EMAIL');
    if (!errorEmail) {
      this.logger.warn(
        'ERROR_NOTIFY_EMAIL no configurado — no se enviará notificación',
      );
      return;
    }

    // Rate limiting: evitar spam por el mismo error
    const errorKey = `${request?.method}:${request?.url}:${message}`;
    const lastSent = this.recentErrors.get(errorKey);
    const now = Date.now();

    if (lastSent && now - lastSent < this.RATE_LIMIT_MS) {
      this.logger.debug(`Error email rate-limited para: ${errorKey}`);
      return;
    }
    this.recentErrors.set(errorKey, now);

    // Limpiar entradas viejas del rate limiter cada 100 entradas
    if (this.recentErrors.size > 100) {
      for (const [key, time] of this.recentErrors.entries()) {
        if (now - time > this.RATE_LIMIT_MS) {
          this.recentErrors.delete(key);
        }
      }
    }

    const env = this.configService.get<string>('NODE_ENV') || 'development';
    const appName = 'Nitro API';
    const timestamp = new Date().toISOString();

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">⚠️ Error en ${appName}</h1>
          <p style="color: #fca5a5; margin: 8px 0 0; font-size: 13px;">Entorno: <strong>${env}</strong> &middot; ${timestamp}</p>
        </div>
        
        <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 24px 32px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 120px; vertical-align: top;">Status</td>
              <td style="padding: 8px 0; font-weight: 600; color: #dc2626;">${status}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">Método</td>
              <td style="padding: 8px 0;">${request?.method || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">URL</td>
              <td style="padding: 8px 0; word-break: break-all;">${request?.url || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">IP</td>
              <td style="padding: 8px 0;">${request?.ip || request?.headers?.['x-forwarded-for'] || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">User-Agent</td>
              <td style="padding: 8px 0; font-size: 12px; word-break: break-all;">${request?.headers?.['user-agent'] || 'N/A'}</td>
            </tr>
          </table>

          <div style="margin-top: 20px;">
            <h3 style="color: #111827; font-size: 15px; margin: 0 0 8px;">Mensaje de Error</h3>
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; color: #991b1b; font-size: 14px;">
              ${message}
            </div>
          </div>

          ${
            stack
              ? `
          <div style="margin-top: 20px;">
            <h3 style="color: #111827; font-size: 15px; margin: 0 0 8px;">Stack Trace</h3>
            <pre style="background: #1f2937; color: #d1d5db; border-radius: 8px; padding: 16px; font-size: 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; line-height: 1.5;">${stack}</pre>
          </div>
          `
              : ''
          }

          ${
            request?.body && Object.keys(request.body).length > 0
              ? `
          <div style="margin-top: 20px;">
            <h3 style="color: #111827; font-size: 15px; margin: 0 0 8px;">Request Body</h3>
            <pre style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; font-size: 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">${JSON.stringify(request.body, null, 2)}</pre>
          </div>
          `
              : ''
          }
        </div>

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 16px 32px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
            Este email fue enviado automáticamente por el sistema de monitoreo de ${appName}.
          </p>
        </div>
      </div>
    `;

    try {
      await this.emailService.sendSystemEmail(
        errorEmail,
        `🚨 [${env.toUpperCase()}] Error ${status} — ${request?.method} ${request?.url}`,
        html,
      );
      this.logger.log(`Error notification enviada a ${errorEmail}`);
    } catch (emailError) {
      this.logger.error(
        'No se pudo enviar email de error:',
        emailError?.message || emailError,
      );
    }
  }
}
