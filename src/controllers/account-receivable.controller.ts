import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccountReceivableService } from '../services/account-receivable.service';
import { CreateAccountReceivableDto } from '../dtos/account-receivable/create-account-receivable.dto';
import { UpdateAccountReceivableDto } from '../dtos/account-receivable/update-account-receivable.dto';
import { CreateAccountReceivablePaymentDto } from '../dtos/account-receivable/create-payment.dto';
import { AddPaymentDto } from '../dtos/account-receivable/add-payment.dto';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';
import { AccountReceivableStatus } from '../models/account-receivable.entity';

@Controller('accounts-receivable')
@UseGuards(AuthGuard)
export class AccountReceivableController {
  constructor(
    private readonly accountReceivableService: AccountReceivableService,
  ) {}

  @Post()
  create(@Body() createAccountReceivableDto: CreateAccountReceivableDto) {
    return this.accountReceivableService.create(createAccountReceivableDto);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: AccountReceivableStatus,
    @Query('clientId') clientId?: string,
    @Query('overdue') overdue?: string,
  ) {
    return this.accountReceivableService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
      status,
      clientId,
      overdue === 'true',
    );
  }

  @Get('summary')
  getAccountsReceivableSummary() {
    return this.accountReceivableService.getAccountsReceivableSummary();
  }

  @Get('overdue')
  getOverdueAccounts() {
    return this.accountReceivableService.getOverdueAccounts();
  }

  @Get('client/:clientId/analysis')
  getClientCreditAnalysis(@Param('clientId') clientId: string) {
    return this.accountReceivableService.getClientCreditAnalysis(clientId);
  }

  @Post('update-overdue-status')
  updateOverdueStatus() {
    return this.accountReceivableService.updateOverdueStatus();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountReceivableService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAccountReceivableDto: UpdateAccountReceivableDto,
  ) {
    return this.accountReceivableService.update(id, updateAccountReceivableDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accountReceivableService.remove(id);
  }

  @Post(':id/payments')
  addPayment(
    @Param('id') id: string,
    @Body() addPaymentDto: AddPaymentDto,
    @UserId() userId: string,
  ) {
    // Crear el DTO completo con el accountReceivableId
    const createPaymentDto: CreateAccountReceivablePaymentDto = {
      ...addPaymentDto,
      accountReceivableId: id,
    };
    return this.accountReceivableService.addPayment(createPaymentDto, userId);
  }
}
