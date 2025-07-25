import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  UseGuards,
  UseInterceptors,
  MaxFileSizeValidator,
  ParseFilePipe,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { ProductService } from '../services/product.service';
import { CreateProductDto } from '../dtos/product/create-product.dto';
import { UpdateProductDto } from '../dtos/product/update-product.dto';
import { ProductResponseDto } from '../dtos/product/product-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';

const formatFileName = (fileName: string): string => {
  return fileName.replace(/\s+/g, '-');
};

@Controller('products')
@UseGuards(AuthGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = './uploads/products';
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
  create(
    @Body() createProductDto: CreateProductDto,
    @UserId() userId: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ): Promise<ProductResponseDto> {
    if (files && files.length > 0) {
      createProductDto.images = files.map(
        (file) => `/uploads/products/${file.filename}`,
      );
    }
    return this.productService.create(createProductDto, userId);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<ProductResponseDto>> {
    return this.productService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<ProductResponseDto> {
    return this.productService.findOne(id, userId);
  }

  @Put(':id')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = './uploads/products';
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
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UserId() userId: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ): Promise<ProductResponseDto> {
    if (files && files.length > 0) {
      updateProductDto.images = files.map(
        (file) => `/uploads/products/${file.filename}`,
      );
    }
    return this.productService.update(id, updateProductDto, userId);
  }

  @Get(':id/usage')
  getProductUsage(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ) {
    return this.productService.getProductUsage(id, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.productService.remove(id, userId);
  }
}
