import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../guards/auth.guard';
import { InvoicePaymentService, CreateInvoicePaymentDto } from '../services/invoice-payment.service';

@Controller('invoices/:invoiceId/payments')
@UseGuards(AuthGuard)
export class InvoicePaymentController {
  constructor(private readonly invoicePaymentService: InvoicePaymentService) {}

  @Get()
  getPayments(@Param('invoiceId') invoiceId: string) {
    return this.invoicePaymentService.getPayments(invoiceId);
  }

  @Post()
  registerPayment(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CreateInvoicePaymentDto,
  ) {
    return this.invoicePaymentService.registerPayment(invoiceId, dto);
  }

  @Delete(':paymentId')
  cancelPayment(
    @Param('invoiceId') invoiceId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.invoicePaymentService.cancelPayment(invoiceId, paymentId);
  }
}
