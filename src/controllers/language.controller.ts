import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { LanguageService } from '../services/language.service';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';

@Controller('user-language')
@UseGuards(AuthGuard)
export class UserLanguageController {
  constructor(private readonly languageService: LanguageService) {}

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
    return {
      success: true,
      message: 'Idioma actualizado correctamente',
    };
  }
}
