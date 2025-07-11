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
import { diskStorage } from 'multer';
import * as fs from 'fs';

const formatFileName = (fileName: string): string => {
  return fileName.replace(/\s+/g, '-');
};

@Controller('categories')
@UseGuards(AuthGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('image', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = './uploads/categories';
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const formattedName = formatFileName(file.originalname);
          const uniqueName = `${Date.now()}-${formattedName}`;
          cb(null, uniqueName);
        },
      }),
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
    if (files && files.length > 0) {
      createCategoryDto.image = `/uploads/categories/${files[0].filename}`;
    }
    return this.categoryService.create(createCategoryDto, userId);
  }

  @Get()
  async findAll(
    @Query() paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<CategoryResponseDto>> {
    //await new Promise(resolve => setTimeout(resolve, 5000));
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
    FilesInterceptor('image', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = './uploads/categories';
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const formattedName = formatFileName(file.originalname);
          const uniqueName = `${Date.now()}-${formattedName}`;
          cb(null, uniqueName);
        },
      }),
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
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @UserId() userId: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ): Promise<CategoryResponseDto> {
    if (files && files.length > 0) {
      updateCategoryDto.image = `/uploads/categories/${files[0].filename}`;
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
