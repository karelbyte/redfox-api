import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
  Req,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { CompanySettingsService } from '../services/company-settings.service';
import { UpdateCompanySettingsDto } from '../dtos/company-settings/update-company-settings.dto';
import { CompanySettingsResponseDto } from '../dtos/company-settings/company-settings-response.dto';
import { AuthGuard } from '../guards/auth.guard';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  IStorageService,
  STORAGE_SERVICE,
} from '../services/storage/storage.interface';
import { TranslationService } from '../services/translation.service';

@Controller('company-settings')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class CompanySettingsController {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly translationService: TranslationService,
  ) {}

  @Get()
  get(): Promise<CompanySettingsResponseDto> {
    return this.companySettingsService.get();
  }

  @Put()
  update(
    @Body() updateDto: UpdateCompanySettingsDto,
  ): Promise<CompanySettingsResponseDto> {
    return this.companySettingsService.update(updateDto);
  }

  @Post('logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
    }),
  )
  async uploadLogo(
    @Req() req: Request,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\// }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ): Promise<CompanySettingsResponseDto> {
    const user = (req as any).user;
    const organizationId = user?.organizationId || (req as any)['organizationId'];

    if (!organizationId) {
      const message = await this.translationService.translate(
        'auth.organization_required',
        user?.id,
      );
      throw new BadRequestException(message);
    }

    const ext = file.originalname.split('.').pop() || 'png';
    const key = `${organizationId}/company/logo-${Date.now()}.${ext}`;

    const { url } = await this.storageService.upload(
      file.buffer,
      key,
      file.mimetype,
    );

    return this.companySettingsService.updateLogoUrl(url);
  }
}
