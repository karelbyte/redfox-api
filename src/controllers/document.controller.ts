import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Put,
  UseInterceptors,
  UploadedFiles,
  MaxFileSizeValidator,
  ParseFilePipe,
  FileTypeValidator,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DocumentService } from '../services/document.service';
import { CreateDocumentDto } from '../dtos/document/create-document.dto';
import { UpdateDocumentDto } from '../dtos/document/update-document.dto';
import { DocumentResponseDto } from '../dtos/document/document-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';
import { UnifiedUploadService } from '../services/unified-upload.service';

@Controller('employee-documents')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly unifiedUploadService: UnifiedUploadService,
  ) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('file', 1, { storage: memoryStorage() }),
  )
  async create(
    @Body() createDocumentDto: CreateDocumentDto,
    @UserId() userId: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^(image\/|application\/pdf)/ }),
        ],
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ): Promise<DocumentResponseDto> {
    const document = await this.documentService.create(createDocumentDto, userId);

    if (files && files.length > 0) {
      const uploadResult = await this.unifiedUploadService.uploadFile(
        files[0],
        'documents' as any,
        document.id,
        {
          maxSize: 10 * 1024 * 1024,
          allowedTypes: [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
          ],
          maxFiles: 1,
        },
      );
      return this.documentService.updateFilePath(document.id, uploadResult.url, userId);
    }

    return document;
  }

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<DocumentResponseDto>> {
    return this.documentService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<DocumentResponseDto> {
    return this.documentService.findOne(id, userId);
  }

  @Put(':id')
  @UseInterceptors(
    FilesInterceptor('file', 1, { storage: memoryStorage() }),
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @UserId() userId: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^(image\/|application\/pdf)/ }),
        ],
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ): Promise<DocumentResponseDto> {
    const document = await this.documentService.update(id, updateDocumentDto, userId);

    if (files && files.length > 0) {
      const uploadResult = await this.unifiedUploadService.uploadFile(
        files[0],
        'documents' as any,
        id,
        {
          maxSize: 10 * 1024 * 1024,
          allowedTypes: [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
          ],
          maxFiles: 1,
        },
      );
      return this.documentService.updateFilePath(id, uploadResult.url, userId);
    }

    return document;
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.documentService.remove(id, userId);
  }

  @Put(':id/verify')
  verify(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<DocumentResponseDto> {
    return this.documentService.verify(id, userId);
  }
}
