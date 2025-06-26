import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LanguageService } from '../services/language.service';
import { CreateLanguageDto } from '../dtos/language/create-language.dto';
import { UpdateLanguageDto } from '../dtos/language/update-language.dto';
import { LanguageResponseDto } from '../dtos/language/language-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { AuthGuard } from '../guards/auth.guard';
import { Language } from '../decorators/language.decorator';
import { UserContextService } from '../services/user-context.service';
import { UserId } from '../decorators/user-id.decorator';

@Controller('languages')
@UseGuards(AuthGuard)
export class LanguageController {
  constructor(
    private readonly languageService: LanguageService,
    private readonly userContextService: UserContextService,
  ) {}

  @Post()
  create(
    @Body() createLanguageDto: CreateLanguageDto,
    @Language() languageCode: string,
  ) {
    return this.languageService.create(createLanguageDto, languageCode);
  }

  @Get()
  findAll(@Language() languageCode: string) {
    return this.languageService.findAll(languageCode);
  }

  @Get('active')
  findActive(@Language() languageCode: string): Promise<LanguageResponseDto[]> {
    return this.languageService.findActive(languageCode);
  }

  @Get('default')
  getDefaultLanguage(@Language() languageCode: string): Promise<LanguageResponseDto> {
    return this.languageService.getDefaultLanguage(languageCode);
  }

  @Get('code/:code')
  findByCode(
    @Param('code') code: string,
    @Language() languageCode: string,
  ): Promise<LanguageResponseDto> {
    return this.languageService.findByCode(code, languageCode);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Language() languageCode: string) {
    return this.languageService.findOne(id, languageCode);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLanguageDto: UpdateLanguageDto,
    @Language() languageCode: string,
  ) {
    return this.languageService.update(id, updateLanguageDto, languageCode);
  }

  @Patch(':id/set-default')
  setDefaultLanguage(
    @Param('id') id: string,
    @Language() languageCode: string,
  ): Promise<LanguageResponseDto> {
    return this.languageService.setDefaultLanguage(id, languageCode);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Language() languageCode: string) {
    return this.languageService.remove(id, languageCode);
  }
}

@Controller('user-language')
@UseGuards(AuthGuard)
export class UserLanguageController {
  constructor(
    private readonly languageService: LanguageService,
    private readonly userContextService: UserContextService,
  ) {}

  @Get()
  async getUserLanguage(@UserId() userId: string) {
    const language = await this.userContextService.getUserLanguage(userId);
    return {
      success: true,
      data: language,
    };
  }

  @Get('code')
  async getUserLanguageCode(@UserId() userId: string) {
    const languageCode = await this.userContextService.getUserLanguageCode(userId);
    return {
      success: true,
      data: { code: languageCode },
    };
  }

  @Post('set')
  async setUserLanguage(
    @UserId() userId: string,
    @Body() body: { languageCode: string },
  ) {
    const success = await this.userContextService.setUserLanguage(
      userId,
      body.languageCode,
    );
    
    return {
      success,
      message: success 
        ? 'Idioma actualizado correctamente' 
        : 'Error al actualizar el idioma',
    };
  }

  @Post('reset')
  async resetUserLanguage(@UserId() userId: string) {
    const success = await this.userContextService.removeUserLanguage(userId);
    
    return {
      success,
      message: success 
        ? 'Idioma restablecido al predeterminado' 
        : 'Error al restablecer el idioma',
    };
  }

  @Get('available')
  async getAvailableLanguages() {
    const languages = await this.languageService.findAll('en');
    return {
      success: true,
      data: languages,
    };
  }
} 