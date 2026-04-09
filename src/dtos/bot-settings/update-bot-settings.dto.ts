import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { BotTone, CloudProviderConfig } from '../../models/bot-settings.entity';

export class UpdateBotSettingsDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  autoReplyEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  quotationModeEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  assistantName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  @IsIn(['es', 'en', 'zh'])
  defaultLanguage?: string;

  @IsOptional()
  @IsEnum(BotTone)
  tone?: BotTone;

  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @IsOptional()
  @IsString()
  handoffMessage?: string;

  @IsOptional()
  @IsString()
  quotationPrompt?: string;

  @IsOptional()
  @IsObject()
  cloudConfig?: CloudProviderConfig;
}
