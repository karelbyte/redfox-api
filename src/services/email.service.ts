import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { EmailConfig } from '../models/email-config.entity';
import { CreateEmailConfigDto } from '../dtos/email-config/create-email-config.dto';
import { UpdateEmailConfigDto } from '../dtos/email-config/update-email-config.dto';
import { EmailConfigResponseDto } from '../dtos/email-config/email-config-response.dto';
import { TenantContext } from './tenant-context.service';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: any[];
}

@Injectable()
export class EmailService {
  constructor(
    @InjectRepository(EmailConfig)
    private emailConfigRepository: Repository<EmailConfig>,
    private readonly tenantContext: TenantContext,
    private readonly configService: ConfigService,
  ) {}

  private get organizationId(): string {
    const orgId = this.tenantContext.getOrganizationId();
    if (!orgId) {
      throw new BadRequestException(
        'Organization context is required for Email Configuration',
      );
    }
    return orgId;
  }

  async getConfig(userId: string): Promise<EmailConfigResponseDto> {
    const config = await this.emailConfigRepository.findOne({
      where: { userId, organization_id: this.organizationId, isActive: true },
    });

    if (!config) {
      throw new BadRequestException(
        'Email configuration not found. Please configure your email settings.',
      );
    }

    return this.mapToResponseDto(config);
  }

  async createConfig(
    userId: string,
    createEmailConfigDto: CreateEmailConfigDto,
  ): Promise<EmailConfigResponseDto> {
    const existingConfig = await this.emailConfigRepository.findOne({
      where: { userId, organization_id: this.organizationId },
    });

    if (existingConfig) {
      throw new BadRequestException(
        'Email configuration already exists. Please update it instead.',
      );
    }

    const config = this.emailConfigRepository.create({
      ...createEmailConfigDto,
      userId,
      organization_id: this.organizationId,
      secure: createEmailConfigDto.secure ?? false,
    });

    const savedConfig = await this.emailConfigRepository.save(config);
    return this.mapToResponseDto(savedConfig);
  }

  async updateConfig(
    userId: string,
    updateEmailConfigDto: UpdateEmailConfigDto,
  ): Promise<EmailConfigResponseDto> {
    const config = await this.emailConfigRepository.findOne({
      where: { userId, organization_id: this.organizationId },
    });

    if (!config) {
      throw new BadRequestException('Email configuration not found.');
    }

    Object.assign(config, updateEmailConfigDto);
    const updatedConfig = await this.emailConfigRepository.save(config);

    return this.mapToResponseDto(updatedConfig);
  }

  async testConnection(
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const config = await this.emailConfigRepository.findOne({
      where: { userId, organization_id: this.organizationId },
    });

    if (!config) {
      throw new BadRequestException('Email configuration not found.');
    }

    try {
      const transporter = this.createTransporter(config);
      await transporter.verify();
      return {
        success: true,
        message: 'Email configuration is valid and connection successful.',
      };
    } catch (error) {
      throw new BadRequestException(
        `Email configuration test failed: ${error.message}`,
      );
    }
  }

  async sendEmail(
    userId: string,
    emailOptions: EmailOptions,
  ): Promise<{ success: boolean; messageId: string }> {
    const config = await this.emailConfigRepository.findOne({
      where: { userId, organization_id: this.organizationId, isActive: true },
    });

    if (!config) {
      throw new BadRequestException(
        'Email configuration not found. Please configure your email settings.',
      );
    }

    try {
      const transporter = this.createTransporter(config);

      const mailOptions = {
        from: `${config.fromName || config.user} <${config.fromEmail}>`,
        to: emailOptions.to,
        subject: emailOptions.subject,
        html: emailOptions.html,
        text: emailOptions.text,
        cc: emailOptions.cc,
        bcc: emailOptions.bcc,
        attachments: emailOptions.attachments,
      };

      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to send email: ${error.message}`);
    }
  }

  private createTransporter(config: EmailConfig) {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      tls: { family: 4 },
      auth: {
        user: config.user,
        pass: config.password,
      },
    } as any);
  }

  async sendSystemEmail(
    to: string | string[],
    subject: string,
    html: string,
  ): Promise<boolean> {
    const provider =
      this.configService.get<string>('EMAIL_PROVIDER') || 'resend';

    if (provider === 'smtp') {
      try {
        const smtpConfig = {
          host: this.configService.get<string>('SMTP_HOST'),
          port: this.configService.get<number>('SMTP_PORT'),
          secure: this.configService.get<boolean>('SMTP_SECURE') || false,
          tls: { family: 4 }, // Forzar IPv4
          auth: {
            user: this.configService.get<string>('SMTP_USER'),
            pass: this.configService.get<string>('SMTP_PASS'),
          },
        };

        const transporter = nodemailer.createTransport(smtpConfig as any);
        const fromEmail = this.configService.get<string>('SMTP_USER');

        await transporter.sendMail({
          from: `"Nitro" <${fromEmail}>`,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
        });

        return true;
      } catch (error) {
        console.error('Error enviando email de sistema con SMTP:', error);
        return false;
      }
    }

    // Default to Resend
    try {
      const resend = new Resend(
        this.configService.get<string>('RESEND_API_KEY'),
      );
      const fromEmail =
        this.configService.get<string>('EMAIL_FROM') || 'onboarding@resend.dev';

      const { data, error } = await resend.emails.send({
        from: `Nitro <${fromEmail}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      });

      if (error) {
        console.error('Error enviando email con Resend:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        'Error crítico al enviar email de sistema con Resend:',
        error,
      );
      return false;
    }
  }

  private mapToResponseDto(config: EmailConfig): EmailConfigResponseDto {
    return {
      id: config.id,
      host: config.host,
      port: config.port,
      user: config.user,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      secure: config.secure,
      isActive: config.isActive,
      organization_id: config.organization_id,
      createdAt:
        typeof config.createdAt === 'string'
          ? config.createdAt
          : config.createdAt.toISOString(),
      updatedAt:
        typeof config.updatedAt === 'string'
          ? config.updatedAt
          : config.updatedAt.toISOString(),
    };
  }
}
