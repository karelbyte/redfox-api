import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { DocumentSeriesService } from '../services/document-series.service';
import {
  CreateDocumentSeriesDto,
  UpdateDocumentSeriesDto,
} from '../dtos/document-series/document-series.dto';
import { DocumentType } from '../models/document-series.entity';
import { AuthGuard } from '../guards/auth.guard';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';

@Controller('document-series')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class DocumentSeriesController {
  constructor(private readonly documentSeriesService: DocumentSeriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateDocumentSeriesDto) {
    return this.documentSeriesService.create(createDto);
  }

  @Get()
  findAll(@Query('document_type') documentType?: DocumentType) {
    return this.documentSeriesService.findAll(documentType);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateDocumentSeriesDto) {
    return this.documentSeriesService.update(id, updateDto);
  }
}
