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
} from '@nestjs/common';
import { BrandService } from '../services/brand.service';
import { CreateBrandDto } from '../dtos/brand/create-brand.dto';
import { UpdateBrandDto } from '../dtos/brand/update-brand.dto';
import { BrandResponseDto } from '../dtos/brand/brand-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { AuthGuard } from '../guards/auth.guard';

const formatFileName = (fileName: string): string => {
  return fileName.replace(/\s+/g, '-');
};

@Controller('brands')
@UseGuards(AuthGuard)
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('img', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = './uploads/brands';
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
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  create(
    @Body() createBrandDto: CreateBrandDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ): Promise<BrandResponseDto> {
    if (files && files.length > 0) {
      createBrandDto.img = `/uploads/brands/${files[0].filename}`;
    }
    return this.brandService.create(createBrandDto);
  }

  @Get()
  findAll(
    @Query() paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<BrandResponseDto>> {
    return this.brandService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<BrandResponseDto> {
    return this.brandService.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(
    FilesInterceptor('img', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = './uploads/brands';
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
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBrandDto: UpdateBrandDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ): Promise<BrandResponseDto> {
    if (files && files.length > 0) {
      updateBrandDto.img = `/uploads/brands/${files[0].filename}`;
    } else if (updateBrandDto.imageChanged) {
      updateBrandDto.img = '';
    }
    return this.brandService.update(id, updateBrandDto);
  }

  @Get(':id/usage')
  getBrandUsage(@Param('id', ParseUUIDPipe) id: string) {
    return this.brandService.getBrandUsage(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.brandService.remove(id);
  }
}
