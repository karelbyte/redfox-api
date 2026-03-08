import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { AccountPayableService } from '../services/account-payable.service';
import { CreateAccountPayableDto } from '../dtos/account-payable/create-account-payable.dto';
import { UpdateAccountPayableDto } from '../dtos/account-payable/update-account-payable.dto';
import { CreateAccountPayablePaymentDto } from '../dtos/account-payable/create-payment.dto';
import { AuthGuard } from '../guards/auth.guard';
import { AccountPayableStatus } from '../models/account-payable.entity';

@Controller('accounts-payable')
@UseGuards(AuthGuard)
export class AccountPayableController {
  constructor(private readonly accountPayableService: AccountPayableService) { }

  @Post()
  create(@Body() createAccountPayableDto: CreateAccountPayableDto) {
    return this.accountPayableService.create(createAccountPayableDto);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: AccountPayableStatus,
    @Query('providerId') providerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.accountPayableService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
      status,
      providerId,
      startDate,
      endDate,
    );
  }

  @Get('summary')
  getAccountsPayableSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.accountPayableService.getAccountsPayableSummary(startDate, endDate);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountPayableService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAccountPayableDto: UpdateAccountPayableDto) {
    return this.accountPayableService.update(+id, updateAccountPayableDto);
  }

  @Post(':id/payments')
  addPayment(
    @Param('id') id: string,
    @Body() createPaymentDto: CreateAccountPayablePaymentDto,
    @Query('userId') userId: string, // Temporary until Auth system is unified
  ) {
    return this.accountPayableService.addPayment({
      ...createPaymentDto,
      accountPayableId: +id,
    }, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accountPayableService.remove(+id);
  }
}
