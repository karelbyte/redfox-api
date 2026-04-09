import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotSettings } from '../models/bot-settings.entity';
import { BotSettingsResponseDto } from '../dtos/bot-settings/bot-settings-response.dto';
import { UpdateBotSettingsDto } from '../dtos/bot-settings/update-bot-settings.dto';
import { SelectBotProviderDto } from '../dtos/bot-settings/select-bot-provider.dto';
import { BotSettingsMapper } from './mappers/bot-settings.mapper';
import {
  BotConnectionStatus,
  BotProvider,
  BotTone,
} from '../models/bot-settings.entity';
import { TenantContext } from './tenant-context.service';
import { BaileysProviderService } from './baileys-provider.service';

@Injectable()
export class BotSettingsService {
  constructor(
    @InjectRepository(BotSettings)
    private readonly botSettingsRepository: Repository<BotSettings>,
    private readonly botSettingsMapper: BotSettingsMapper,
    private readonly tenantContext: TenantContext,
    private readonly baileysProviderService: BaileysProviderService,
  ) {}

  private get organizationId(): string {
    const organizationId = this.tenantContext.getOrganizationId();
    if (!organizationId) {
      throw new BadRequestException(
        'Organization context is required for Bot Settings',
      );
    }

    return organizationId;
  }

  async get(): Promise<BotSettingsResponseDto> {
    const settings = await this.ensureSettings();
    return this.botSettingsMapper.mapToResponseDto(settings);
  }

  async update(dto: UpdateBotSettingsDto): Promise<BotSettingsResponseDto> {
    const settings = await this.ensureSettings();

    if (dto.isEnabled !== undefined) {
      settings.is_enabled = dto.isEnabled;
    }
    if (dto.autoReplyEnabled !== undefined) {
      settings.auto_reply_enabled = dto.autoReplyEnabled;
    }
    if (dto.quotationModeEnabled !== undefined) {
      settings.quotation_mode_enabled = dto.quotationModeEnabled;
    }
    if (dto.assistantName !== undefined) {
      settings.assistant_name = dto.assistantName || null;
    }
    if (dto.defaultLanguage !== undefined) {
      settings.default_language = dto.defaultLanguage || 'es';
    }
    if (dto.tone !== undefined) {
      settings.tone = dto.tone;
    }
    if (dto.welcomeMessage !== undefined) {
      settings.welcome_message = dto.welcomeMessage || null;
    }
    if (dto.handoffMessage !== undefined) {
      settings.handoff_message = dto.handoffMessage || null;
    }
    if (dto.quotationPrompt !== undefined) {
      settings.quotation_prompt = dto.quotationPrompt || null;
    }
    if (dto.cloudConfig !== undefined) {
      settings.cloud_config = dto.cloudConfig || null;
    }

    const updated = await this.botSettingsRepository.save(settings);
    return this.botSettingsMapper.mapToResponseDto(updated);
  }

  async selectProvider(
    dto: SelectBotProviderDto,
  ): Promise<BotSettingsResponseDto> {
    let settings = await this.ensureSettings();

    if (
      settings.provider === BotProvider.BAILEYS &&
      dto.provider !== BotProvider.BAILEYS
    ) {
      settings = await this.baileysProviderService.disconnect(settings);
    }

    settings.provider = dto.provider;

    if (dto.provider === BotProvider.WHATSAPP_CLOUD) {
      settings.connection_status = BotConnectionStatus.DISCONNECTED;
      settings.qr_code = null;
      settings.qr_expires_at = null;
      settings.connection_meta = null;
    }

    const updated = await this.botSettingsRepository.save(settings);
    return this.botSettingsMapper.mapToResponseDto(updated);
  }

  async startBaileysConnection(): Promise<BotSettingsResponseDto> {
    const settings = await this.ensureSettings();
    settings.provider = BotProvider.BAILEYS;
    await this.botSettingsRepository.save(settings);

    const updated = await this.baileysProviderService.connect(settings);
    return this.botSettingsMapper.mapToResponseDto(updated);
  }

  async refreshBaileysQr(): Promise<BotSettingsResponseDto> {
    const settings = await this.ensureSettings();
    settings.provider = BotProvider.BAILEYS;
    await this.botSettingsRepository.save(settings);

    const updated = await this.baileysProviderService.refreshQr(settings);
    return this.botSettingsMapper.mapToResponseDto(updated);
  }

  async disconnectBaileys(): Promise<BotSettingsResponseDto> {
    const settings = await this.ensureSettings();
    const updated = await this.baileysProviderService.disconnect(settings);
    return this.botSettingsMapper.mapToResponseDto(updated);
  }

  private async ensureSettings(): Promise<BotSettings> {
    let settings = await this.botSettingsRepository.findOne({
      where: { organization_id: this.organizationId },
    });

    if (!settings) {
      settings = this.botSettingsRepository.create({
        organization_id: this.organizationId,
        provider: BotProvider.BAILEYS,
        connection_status: BotConnectionStatus.DISCONNECTED,
        is_enabled: false,
        auto_reply_enabled: true,
        quotation_mode_enabled: true,
        assistant_name: 'Nitro Bot',
        default_language: 'es',
        tone: BotTone.PROFESSIONAL,
        welcome_message:
          'Hola, puedo ayudarte a crear cotizaciones, revisar precios y consultar stock por WhatsApp.',
        handoff_message:
          'Si prefieres atencion humana, te conecto con un asesor.',
        quotation_prompt:
          'Responde en nombre de la empresa, guia la cotizacion paso a paso, captura datos del cliente y entrega un cierre claro con PDF cuando sea posible.',
      });
      settings = await this.botSettingsRepository.save(settings);
    }

    return settings;
  }
}
