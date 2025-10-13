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
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { InvoiceService } from '../services/invoice.service';
import { CreateInvoiceDto } from '../dtos/invoice/create-invoice.dto';
import { UpdateInvoiceDto } from '../dtos/invoice/update-invoice.dto';
import { InvoiceResponseDto } from '../dtos/invoice/invoice-response.dto';
import {
  GenerateCFDIDto,
  CancelCFDIDto,
  ConvertWithdrawalToInvoiceDto,
} from '../dtos/invoice/facturapi.dto';
import { CreateInvoiceDetailDto } from '../dtos/invoice-detail/create-invoice-detail.dto';
import { UpdateInvoiceDetailDto } from '../dtos/invoice-detail/create-invoice-detail.dto';
import { InvoiceDetailResponseDto } from '../dtos/invoice-detail/invoice-detail-response.dto';
import { InvoiceDetailQueryDto } from '../dtos/invoice-detail/create-invoice-detail.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';

@Controller('invoices')
@UseGuards(AuthGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @UserId() userId: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.create(createInvoiceDto, userId);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @UserId() userId: string,
  ): Promise<PaginatedResponse<InvoiceResponseDto>> {
    return this.invoiceService.findAll(paginationDto, userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @UserId() userId: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.update(id, updateInvoiceDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.invoiceService.remove(id, userId);
  }

  @Post('convert-withdrawal')
  convertWithdrawalToInvoice(
    @Body() convertDto: ConvertWithdrawalToInvoiceDto,
    @UserId() userId: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.convertWithdrawalToInvoice(
      convertDto.withdrawal_id,
      convertDto.invoice_code,
      userId,
    );
  }

  @Post(':id/generate-cfdi')
  generateCFDI(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.generateCFDI(id, userId);
  }

  @Post(':id/cancel-cfdi')
  cancelCFDI(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelDto: CancelCFDIDto,
    @UserId() userId: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.cancelCFDI(id, cancelDto.reason, userId);
  }

  @Post(':id/details')
  createDetail(
    @Param('id', ParseUUIDPipe) invoiceId: string,
    @Body() createDetailDto: CreateInvoiceDetailDto,
    @UserId() userId: string,
  ): Promise<InvoiceDetailResponseDto> {
    return this.invoiceService.createDetail(invoiceId, createDetailDto, userId);
  }

  @Get(':id/details')
  findAllDetails(
    @Param('id', ParseUUIDPipe) invoiceId: string,
    @Query() queryDto: InvoiceDetailQueryDto,
    @UserId() userId: string,
  ): Promise<PaginatedResponse<InvoiceDetailResponseDto>> {
    return this.invoiceService.findAllDetails(invoiceId, queryDto, userId);
  }

  @Get(':id/details/:detailId')
  findOneDetail(
    @Param('id', ParseUUIDPipe) invoiceId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @UserId() userId: string,
  ): Promise<InvoiceDetailResponseDto> {
    return this.invoiceService.findOneDetail(invoiceId, detailId, userId);
  }

  @Put(':id/details/:detailId')
  updateDetail(
    @Param('id', ParseUUIDPipe) invoiceId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @Body() updateDetailDto: UpdateInvoiceDetailDto,
    @UserId() userId: string,
  ): Promise<InvoiceDetailResponseDto> {
    return this.invoiceService.updateDetail(
      invoiceId,
      detailId,
      updateDetailDto,
      userId,
    );
  }

  @Delete(':id/details/:detailId')
  removeDetail(
    @Param('id', ParseUUIDPipe) invoiceId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.invoiceService.removeDetail(invoiceId, detailId, userId);
  }

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="factura.pdf"')
  async downloadPDF(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
    @UserId() userId: string,
  ): Promise<void> {
    const pdfBuffer = await this.invoiceService.downloadPDF(id, userId);
    res.send(pdfBuffer);
  }

  @Get(':id/xml')
  @Header('Content-Type', 'application/xml')
  @Header('Content-Disposition', 'attachment; filename="factura.xml"')
  async downloadXML(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
    @UserId() userId: string,
  ): Promise<void> {
    const xmlContent = await this.invoiceService.downloadXML(id, userId);
    res.send(xmlContent);
  }
}
