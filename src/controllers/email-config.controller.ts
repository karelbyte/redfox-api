import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { EmailService } from '../services/email.service';
import { CreateEmailConfigDto } from '../dtos/email-config/create-email-config.dto';
import { UpdateEmailConfigDto } from '../dtos/email-config/update-email-config.dto';
import { EmailConfigResponseDto } from '../dtos/email-config/email-config-response.dto';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';

@Controller('email-config')
@UseGuards(AuthGuard)
export class EmailConfigController {
  constructor(private readonly emailService: EmailService) {}

  @Get()
  getConfig(@UserId() userId: string): Promise<EmailConfigResponseDto> {
    return this.emailService.getConfig(userId);
  }

  @Post()
  createConfig(
    @Body() createEmailConfigDto: CreateEmailConfigDto,
    @UserId() userId: string,
  ): Promise<EmailConfigResponseDto> {
    return this.emailService.createConfig(userId, createEmailConfigDto);
  }

  @Put()
  updateConfig(
    @Body() updateEmailConfigDto: UpdateEmailConfigDto,
    @UserId() userId: string,
  ): Promise<EmailConfigResponseDto> {
    return this.emailService.updateConfig(userId, updateEmailConfigDto);
  }

  @Post('test')
  testConnection(@UserId() userId: string): Promise<{ success: boolean; message: string }> {
    return this.emailService.testConnection(userId);
  }
}
