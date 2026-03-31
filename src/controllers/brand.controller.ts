import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  Put,
  UseInterceptors,
  MaxFileSizeValidator,
  ParseFilePipe,
  UploadedFiles,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { BrandService } from '../services/brand.service';
import { CreateBrandDto } from '../dtos/brand/create-brand.dto';
import { UpdateBrandDto } from '../dtos/brand/update-brand.dto';
import { BrandResponseDto } from '../dtos/brand/brand-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';
import { UnifiedUploadService } from '../services/unified-upload.service';

const formatFileName = (fileName: string): string => {
  return fileName.replace(/\s+/g, '-');
};

@Controller('brands')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class BrandController {
  constructor(
    private readonly brandService: BrandService,
    private readonly unifiedUploadService: UnifiedUploadService,
  ) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('img', 1, {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async create(
    @Body() createBrandDto: CreateBrandDto,
    @UserId() userId: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ): Promise<BrandResponseDto> {
    // Primero crear la marca para obtener su ID
    const brand = await this.brandService.create(createBrandDto, userId);

    // Si hay archivo, subirlo con el ID de la marca
    if (files && files.length > 0) {
      const uploadResult = await this.unifiedUploadService.uploadFile(
        files[0],
        'brands',
        brand.id,
        {
          maxSize: 5 * 1024 * 1024,
          allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
          maxFiles: 1,
        }
      );

      // Actualizar la marca con la URL de la imagen
      return this.brandService.updateImage(brand.id, uploadResult.url, userId);
    }

    return brand;
  }

  @Get()
  findAll(
    @Query() paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<BrandResponseDto>> {
    return this.brandService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<BrandResponseDto> {
    return this.brandService.findOne(id, userId);
  }

  @Put(':id')
  @UseInterceptors(
    FilesInterceptor('img', 1, {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBrandDto: UpdateBrandDto,
    @UserId() userId: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ): Promise<BrandResponseDto> {
    // Si hay archivo nuevo, subirlo
    if (files && files.length > 0) {
      const uploadResult = await this.unifiedUploadService.uploadFile(
        files[0],
        'brands',
        id,
        {
          maxSize: 5 * 1024 * 1024,
          allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
          maxFiles: 1,
        }
      );

      updateBrandDto.img = uploadResult.url;
    } else if (updateBrandDto.imageChanged) {
      updateBrandDto.img = '';
    }
    
    return this.brandService.update(id, updateBrandDto, userId);
  }

  @Get(':id/usage')
  getBrandUsage(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ) {
    return this.brandService.getBrandUsage(id, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.brandService.remove(id, userId);
  }
}
