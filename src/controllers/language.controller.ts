import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { LanguageService } from '../services/language.service';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';
import { TranslationService } from '../services/translation.service';

@Controller('user-language')
@UseGuards(AuthGuard)
export class UserLanguageController {
  constructor(
    private readonly languageService: LanguageService,
    private readonly translationService: TranslationService,
  ) {}

  @Post()
  @HttpCode(200)
  async setUserLanguage(
    @UserId() userId: string,
    @Body() body: { code: string },
  ) {
    await this.languageService.create({
      userId,
      code: body.code,
    });
    const message = await this.translationService.translate('language.updated_successfully', userId);
    return {
      success: true,
      message,
    };
  }
}
