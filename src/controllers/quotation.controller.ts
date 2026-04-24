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
  UseInterceptors,
  Logger,
  Res,
} from '@nestjs/common';
import { QuotationService } from '../services/quotation.service';
import { WithdrawalService } from '../services/withdrawal.service';
import { InvoiceService } from '../services/invoice.service';
import { CreateQuotationDto } from '../dtos/quotation/create-quotation.dto';
import { UpdateQuotationDto } from '../dtos/quotation/update-quotation.dto';
import { QuotationResponseDto } from '../dtos/quotation/quotation-response.dto';
import { ConvertToSaleResponseDto } from '../dtos/quotation/convert-to-sale-response.dto';
import { CreateQuotationDetailDto } from '../dtos/quotation-detail/create-quotation-detail.dto';
import { UpdateQuotationDetailDto } from '../dtos/quotation-detail/update-quotation-detail.dto';
import { QuotationDetailResponseDto } from '../dtos/quotation-detail/quotation-detail-response.dto';
import { SendQuotationEmailDto } from '../dtos/quotation/send-quotation-email.dto';
import { QuotationDetailQueryDto } from '../dtos/quotation-detail/quotation-detail-query.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';

@Controller('quotations')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class QuotationController {
  private readonly logger = new Logger(QuotationController.name);

  constructor(
    private readonly quotationService: QuotationService,
    private readonly withdrawalService: WithdrawalService,
    private readonly invoiceService: InvoiceService,
  ) {}

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
  async convertToSale(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      items: { detail_id: string; warehouse_id?: string }[];
      payment_method?: string;
      close_sale?: boolean;
      create_invoice?: boolean;
      stamp_invoice?: boolean;
    },
    @UserId() userId: string,
  ): Promise<ConvertToSaleResponseDto> {
    const result = await this.quotationService.convertToSale(
      id,
      body.items,
      userId,
      body.payment_method,
    );

    if (body.close_sale) {
      try {
        await this.withdrawalService.closeWithdrawal(result.saleId, userId);
      } catch (error) {
        this.logger.warn(
          `[ConvertToSale] Could not close sale ${result.saleId}: ${error?.message}`,
        );
      }
    }

    let invoiceId: string | null = null;
    if (body.create_invoice && body.close_sale) {
      try {
        const invoice = await this.invoiceService.createFromWithdrawal(
          result.saleId,
          userId,
        );
        invoiceId = invoice?.id ?? null;
      } catch (error) {
        this.logger.warn(
          `[ConvertToSale] Could not create invoice for sale ${result.saleId}: ${error?.message}`,
        );
      }
    }

    if (body.stamp_invoice && invoiceId) {
      try {
        await this.invoiceService.generateCFDI(invoiceId, userId);
      } catch (error) {
        this.logger.warn(
          `[ConvertToSale] Could not stamp invoice ${invoiceId}: ${error?.message}`,
        );
      }
    }

    return result;
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

  @Post(':id/send-email')
  sendEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() sendEmailDto: SendQuotationEmailDto,
    @UserId() userId: string,
  ): Promise<{ sent: boolean; message: string }> {
    return this.quotationService.sendEmail(id, sendEmailDto, userId);
  }

  @Get(':id/pdf')
  async getPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('locale') locale: string = 'es',
    @Res() res: any,
  ): Promise<void> {
    const document = await this.quotationService.getQuotationPdf(id, locale);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${document.fileName}`,
      'Content-Length': document.buffer.length,
    });
    res.end(document.buffer);
  }
}
