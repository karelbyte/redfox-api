import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { CashTransactionService } from '../services/cash-transaction.service';
import { CreateCashTransactionDto } from '../dtos/cash-transaction/create-cash-transaction.dto';
import { CashTransactionQueryDto } from '../dtos/cash-transaction/cash-transaction-query.dto';
import { CashReportQueryDto } from '../dtos/cash-transaction/cash-report-query.dto';
import { CashTransactionResponseDto } from '../dtos/cash-transaction/cash-transaction-response.dto';
import { CashReportResponseDto } from '../dtos/cash-transaction/cash-report-response.dto';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Controller('cash-transactions')
@UseGuards(AuthGuard)
export class CashTransactionController {
  constructor(private readonly cashTransactionService: CashTransactionService) {}

  @Post()
  create(
    @Body() createCashTransactionDto: CreateCashTransactionDto,
    @UserId() userId: string,
  ): Promise<CashTransactionResponseDto> {
    return this.cashTransactionService.create(createCashTransactionDto, userId);
  }

  @Get('cash-registers/:cashRegisterId/transactions')
  getCashTransactions(
    @Param('cashRegisterId', ParseUUIDPipe) cashRegisterId: string,
    @Query() queryDto: CashTransactionQueryDto,
    @UserId() userId: string,
  ): Promise<PaginatedResponse<CashTransactionResponseDto>> {
    return this.cashTransactionService.getCashTransactions(cashRegisterId, queryDto, userId);
  }

  @Get('cash-registers/:cashRegisterId/report')
  getCashReport(
    @Param('cashRegisterId', ParseUUIDPipe) cashRegisterId: string,
    @Query() queryDto: CashReportQueryDto,
    @UserId() userId: string,
  ): Promise<CashReportResponseDto> {
    return this.cashTransactionService.getCashReport(cashRegisterId, queryDto, userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<CashTransactionResponseDto> {
    return this.cashTransactionService.findOne(id, userId);
  }
} 