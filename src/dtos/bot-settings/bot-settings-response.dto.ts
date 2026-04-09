import {
  BotConnectionMeta,
  BotConnectionStatus,
  BotProvider,
  BotTone,
  CloudProviderConfig,
} from '../../models/bot-settings.entity';

export class BotSettingsResponseDto {
  id: string;
  provider: BotProvider;
  connectionStatus: BotConnectionStatus;
  isEnabled: boolean;
  autoReplyEnabled: boolean;
  quotationModeEnabled: boolean;
  assistantName: string | null;
  defaultLanguage: string;
  tone: BotTone;
  welcomeMessage: string | null;
  handoffMessage: string | null;
  quotationPrompt: string | null;
  cloudConfig: CloudProviderConfig | null;
  connectionMeta: BotConnectionMeta | null;
  qrCode: string | null;
  qrExpiresAt: Date | null;
  lastConnectedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}
