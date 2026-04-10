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
import { BulkDeleteProductDto } from '../dtos/product/bulk-delete-product.dto';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UnifiedUploadService } from '../services/unified-upload.service';

@Controller('products')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly unifiedUploadService: UnifiedUploadService,
  ) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 10, {
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
    // Log temporal para debug
    console.log(
      '🔍 CreateProductDto received:',
      JSON.stringify(createProductDto, null, 2),
    );

    // Primero crear el producto para obtener su ID
    const product = await this.productService.create(createProductDto, userId);

    // Si hay archivos, subirlos con el ID del producto
    if (files && files.length > 0) {
      const uploadResults = await this.unifiedUploadService.uploadFiles(
        files,
        'products',
        product.id,
        {
          maxSize: 5 * 1024 * 1024,
          allowedTypes: [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
          ],
          maxFiles: 10,
        },
      );

      const imageUrls = uploadResults.map((result) => result.url);

      // Actualizar el producto con las URLs de las imágenes
      return this.productService.updateImages(product.id, imageUrls, userId);
    }

    return product;
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<ProductResponseDto>> {
    return this.productService.findAll(paginationDto);
  }

  @Get('search-from-pack')
  searchFromPack(@Query('term') term: string) {
    return this.productService.searchFromPack(term || '');
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
    // Si hay archivos nuevos, subirlos
    if (files && files.length > 0) {
      const uploadResults = await this.unifiedUploadService.uploadFiles(
        files,
        'products',
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
          maxFiles: 10,
        },
      );

      const newImageUrls = uploadResults.map((result) => result.url);

      // Si se especifican imágenes existentes, combinarlas con las nuevas
      if (updateProductDto.images) {
        updateProductDto.images = [...updateProductDto.images, ...newImageUrls];
      } else {
        updateProductDto.images = newImageUrls;
      }
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
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ) {
    return this.productService.remove(id, userId);
  }

  @Post('sync/:id')
  async syncWithPack(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ) {
    return this.productService.syncWithPack(id, userId);
  }

  @Post('bulk-delete')
  removeMany(@Body() bulkDeleteProductDto: BulkDeleteProductDto) {
    return this.productService.removeMany(bulkDeleteProductDto.ids);
  }

  @Post('import-from-pack')
  importFromPack(@UserId() userId: string): Promise<any> {
    return this.productService.importFromPack(userId);
  }
}
