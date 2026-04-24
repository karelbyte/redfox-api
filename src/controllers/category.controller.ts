import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Put,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CategoryService } from '../services/category.service';
import { CreateCategoryDto } from '../dtos/category/create-category.dto';
import { UpdateCategoryDto } from '../dtos/category/update-category.dto';
import { CategoryResponseDto } from '../dtos/category/category-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';
import { memoryStorage } from 'multer';
import { UnifiedUploadService } from '../services/unified-upload.service';
import { TranslationService } from '../services/translation.service';

const formatFileName = (fileName: string): string => {
  return fileName.replace(/\s+/g, '-');
};

@Controller('categories')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly unifiedUploadService: UnifiedUploadService,
    private readonly translationService: TranslationService,
  ) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('image', 1, {
      storage: memoryStorage(),
    }),
  )
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @UserId() userId: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryService.create(
      createCategoryDto,
      userId,
    );
    if (files && files.length > 0) {
      const uploadResult = await this.unifiedUploadService.uploadFile(
        files[0],
        'categories',
        category.id,
        {
          maxSize: 5 * 1024 * 1024,
          allowedTypes: [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
          ],
          maxFiles: 1,
        },
      );
      return this.categoryService.updateImage(
        category.id,
        uploadResult.url,
        userId,
      );
    }

    return category;
  }

  @Get()
  async findAll(
    @Query() paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<CategoryResponseDto>> {
    return this.categoryService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.findOne(id, userId);
  }

  @Get('slug/:slug')
  findBySlug(
    @Param('slug') slug: string,
    @UserId() userId: string,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.findBySlug(slug, userId);
  }

  @Put(':id')
  @UseInterceptors(
    FilesInterceptor('image', 1, {
      storage: memoryStorage(),
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @UserId() userId: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\// }),
        ],
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ): Promise<CategoryResponseDto> {
    if (files && files.length > 0) {
      const uploadResult = await this.unifiedUploadService.uploadFile(
        files[0],
        'categories',
        id,
        {
          maxSize: 5 * 1024 * 1024,
          allowedTypes: [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
          ],
          maxFiles: 1,
        },
      );

      updateCategoryDto.image = uploadResult.url;
    } else if (updateCategoryDto.imageChanged) {
      updateCategoryDto.image = '';
    }

    delete updateCategoryDto.imageChanged;
    return this.categoryService.update(id, updateCategoryDto, userId);
  }

  @Get(':id/usage')
  getCategoryUsage(@Param('id') id: string) {
    return this.categoryService.getCategoryUsage(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @UserId() userId: string): Promise<void> {
    return this.categoryService.remove(id, userId);
  }

  @Get('parent/:id')
  async findByParentId(
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto,
    @UserId() userId: string,
  ): Promise<PaginatedResponse<CategoryResponseDto>> {
    return this.categoryService.findByParentId(id, paginationDto, userId);
  }
}
