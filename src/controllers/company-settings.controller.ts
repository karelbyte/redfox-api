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
  BadRequestException,
} from '@nestjs/common';
import { CompanySettingsService } from '../services/company-settings.service';
import { UpdateCompanySettingsDto } from '../dtos/company-settings/update-company-settings.dto';
import { CompanySettingsResponseDto } from '../dtos/company-settings/company-settings-response.dto';
import { AuthGuard } from '../guards/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import * as fs from 'fs';

const formatFileName = (fileName: string): string => {
  return fileName.replace(/\s+/g, '-');
};

const getUploadsCompanyDir = (): string => join(process.cwd(), 'uploads', 'company');

@Controller('company-settings')
@UseGuards(AuthGuard)
export class CompanySettingsController {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
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
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = getUploadsCompanyDir();
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const formattedName = formatFileName(file.originalname);
          const uniqueName = `logo-${Date.now()}-${formattedName}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Solo se permiten archivos de imagen'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadLogo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ): Promise<CompanySettingsResponseDto> {
    const logoUrl = `/api/uploads/company/${file.filename}`;
    return this.companySettingsService.updateLogoUrl(logoUrl);
  }
}
