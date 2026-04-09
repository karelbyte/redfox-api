import { Injectable } from '@nestjs/common';
import { BotSettingsResponseDto } from '../../dtos/bot-settings/bot-settings-response.dto';
import { BotSettings } from '../../models/bot-settings.entity';

@Injectable()
export class BotSettingsMapper {
  mapToResponseDto(settings: BotSettings): BotSettingsResponseDto {
    return {
      id: settings.id,
      provider: settings.provider,
      connectionStatus: settings.connection_status,
      isEnabled: settings.is_enabled,
      autoReplyEnabled: settings.auto_reply_enabled,
      quotationModeEnabled: settings.quotation_mode_enabled,
      assistantName: settings.assistant_name ?? null,
      defaultLanguage: settings.default_language,
      tone: settings.tone,
      welcomeMessage: settings.welcome_message ?? null,
      handoffMessage: settings.handoff_message ?? null,
      quotationPrompt: settings.quotation_prompt ?? null,
      cloudConfig: settings.cloud_config ?? null,
      connectionMeta: settings.connection_meta ?? null,
      qrCode: settings.qr_code ?? null,
      qrExpiresAt: settings.qr_expires_at ?? null,
      lastConnectedAt: settings.last_connected_at ?? null,
      lastError: settings.last_error ?? null,
      createdAt: settings.created_at,
      updatedAt: settings.updated_at,
    };
  }
}
