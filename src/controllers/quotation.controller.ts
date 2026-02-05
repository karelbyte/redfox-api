import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Put,
} from '@nestjs/common';
import { QuotationService } from '../services/quotation.service';
import { CreateQuotationDto } from '../dtos/quotation/create-quotation.dto';
import { UpdateQuotationDto } from '../dtos/quotation/update-quotation.dto';
import { QuotationResponseDto } from '../dtos/quotation/quotation-response.dto';
import { ConvertToSaleResponseDto } from '../dtos/quotation/convert-to-sale-response.dto';
import { CreateQuotationDetailDto } from '../dtos/quotation-detail/create-quotation-detail.dto';
import { UpdateQuotationDetailDto } from '../dtos/quotation-detail/update-quotation-detail.dto';
import { QuotationDetailResponseDto } from '../dtos/quotation-detail/quotation-detail-response.dto';
import { QuotationDetailQueryDto } from '../dtos/quotation-detail/quotation-detail-query.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';

@Controller('quotations')
@UseGuards(AuthGuard)
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Post()
  create(
    @Body() createQuotationDto: CreateQuotationDto,
    @UserId() userId: string,
  ): Promise<QuotationResponseDto> {
    return this.quotationService.create(createQuotationDto, userId);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @UserId() userId: string,
  ): Promise<PaginatedResponse<QuotationResponseDto>> {
    return this.quotationService.findAll(paginationDto, userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<QuotationResponseDto> {
    return this.quotationService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateQuotationDto: UpdateQuotationDto,
    @UserId() userId: string,
  ): Promise<QuotationResponseDto> {
    return this.quotationService.update(id, updateQuotationDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.quotationService.remove(id, userId);
  }

  @Post(':id/convert-to-sale')
  convertToSale(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<ConvertToSaleResponseDto> {
    return this.quotationService.convertToSale(id, userId);
  }

  @Post(':id/details')
  createDetail(
    @Param('id', ParseUUIDPipe) quotationId: string,
    @Body() createDetailDto: CreateQuotationDetailDto,
    @UserId() userId: string,
  ): Promise<QuotationDetailResponseDto> {
    return this.quotationService.createDetail(
      quotationId,
      createDetailDto,
      userId,
    );
  }

  @Get(':id/details')
  findAllDetails(
    @Param('id', ParseUUIDPipe) quotationId: string,
    @Query() queryDto: QuotationDetailQueryDto,
    @UserId() userId: string,
  ): Promise<PaginatedResponse<QuotationDetailResponseDto>> {
    return this.quotationService.findAllDetails(quotationId, queryDto, userId);
  }

  @Get(':id/details/:detailId')
  findOneDetail(
    @Param('id', ParseUUIDPipe) quotationId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @UserId() userId: string,
  ): Promise<QuotationDetailResponseDto> {
    return this.quotationService.findOneDetail(quotationId, detailId, userId);
  }

  @Put(':id/details/:detailId')
  updateDetail(
    @Param('id', ParseUUIDPipe) quotationId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @Body() updateDetailDto: UpdateQuotationDetailDto,
    @UserId() userId: string,
  ): Promise<QuotationDetailResponseDto> {
    return this.quotationService.updateDetail(
      quotationId,
      detailId,
      updateDetailDto,
      userId,
    );
  }

  @Delete(':id/details/:detailId')
  removeDetail(
    @Param('id', ParseUUIDPipe) quotationId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.quotationService.removeDetail(quotationId, detailId, userId);
  }
}