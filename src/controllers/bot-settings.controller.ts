import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '../guards/auth.guard';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';
import { BotSettingsService } from '../services/bot-settings.service';
import { BotSettingsResponseDto } from '../dtos/bot-settings/bot-settings-response.dto';
import { UpdateBotSettingsDto } from '../dtos/bot-settings/update-bot-settings.dto';
import { SelectBotProviderDto } from '../dtos/bot-settings/select-bot-provider.dto';

@Controller('bot-settings')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class BotSettingsController {
  constructor(private readonly botSettingsService: BotSettingsService) {}

  @Get()
  get(): Promise<BotSettingsResponseDto> {
    return this.botSettingsService.get();
  }

  @Put()
  update(
    @Body() updateBotSettingsDto: UpdateBotSettingsDto,
  ): Promise<BotSettingsResponseDto> {
    return this.botSettingsService.update(updateBotSettingsDto);
  }

  @Post('provider')
  selectProvider(
    @Body() selectBotProviderDto: SelectBotProviderDto,
  ): Promise<BotSettingsResponseDto> {
    return this.botSettingsService.selectProvider(selectBotProviderDto);
  }

  @Post('baileys/connect')
  connectBaileys(): Promise<BotSettingsResponseDto> {
    return this.botSettingsService.startBaileysConnection();
  }

  @Post('baileys/refresh-qr')
  refreshBaileysQr(): Promise<BotSettingsResponseDto> {
    return this.botSettingsService.refreshBaileysQr();
  }

  @Post('baileys/disconnect')
  disconnectBaileys(): Promise<BotSettingsResponseDto> {
    return this.botSettingsService.disconnectBaileys();
  }
}
