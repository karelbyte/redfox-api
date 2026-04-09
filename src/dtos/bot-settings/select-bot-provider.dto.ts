import { IsEnum } from 'class-validator';
import { BotProvider } from '../../models/bot-settings.entity';

export class SelectBotProviderDto {
  @IsEnum(BotProvider)
  provider: BotProvider;
}
