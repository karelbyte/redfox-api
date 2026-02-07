import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { EmailConfig } from '../models/email-config.entity';
import { CreateEmailConfigDto } from '../dtos/email-config/create-email-config.dto';
import { UpdateEmailConfigDto } from '../dtos/email-config/update-email-config.dto';
import { EmailConfigResponseDto } from '../dtos/email-config/email-config-response.dto';

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
  ) { }

  async getConfig(userId: string): Promise<EmailConfigResponseDto> {
    const config = await this.emailConfigRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!config) {
      throw new BadRequestException('Email configuration not found. Please configure your email settings.');
    }

    return this.mapToResponseDto(config);
  }

  async createConfig(userId: string, createEmailConfigDto: CreateEmailConfigDto): Promise<EmailConfigResponseDto> {
    const existingConfig = await this.emailConfigRepository.findOne({
      where: { userId },
    });

    if (existingConfig) {
      throw new BadRequestException('Email configuration already exists. Please update it instead.');
    }

    const config = this.emailConfigRepository.create({
      ...createEmailConfigDto,
      userId,
      secure: createEmailConfigDto.secure ?? false,
    });

    const savedConfig = await this.emailConfigRepository.save(config);
    return this.mapToResponseDto(savedConfig);
  }

  async updateConfig(userId: string, updateEmailConfigDto: UpdateEmailConfigDto): Promise<EmailConfigResponseDto> {
    const config = await this.emailConfigRepository.findOne({
      where: { userId },
    });

    if (!config) {
      throw new BadRequestException('Email configuration not found.');
    }

    Object.assign(config, updateEmailConfigDto);
    const updatedConfig = await this.emailConfigRepository.save(config);

    return this.mapToResponseDto(updatedConfig);
  }

  async testConnection(userId: string): Promise<{ success: boolean; message: string }> {
    const config = await this.emailConfigRepository.findOne({
      where: { userId },
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
      throw new BadRequestException(`Email configuration test failed: ${error.message}`);
    }
  }

  async sendEmail(userId: string, emailOptions: EmailOptions): Promise<{ success: boolean; messageId: string }> {
    const config = await this.emailConfigRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!config) {
      throw new BadRequestException('Email configuration not found. Please configure your email settings.');
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
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
  }

  async sendSystemEmail(to: string | string[], subject: string, html: string): Promise<boolean> {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: process.env.SMTP_FROM,
        to,
        subject,
        html,
      };

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending system email:', error);
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
      createdAt: typeof config.createdAt === 'string' ? config.createdAt : (config.createdAt as Date).toISOString(),
      updatedAt: typeof config.updatedAt === 'string' ? config.updatedAt : (config.updatedAt as Date).toISOString(),
    };
  }
}
