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
  UseInterceptors,
} from '@nestjs/common';
import { ExpenseService } from '../services/expense.service';
import { CreateExpenseDto } from '../dtos/expense/create-expense.dto';
import { UpdateExpenseDto } from '../dtos/expense/update-expense.dto';
import { CreateExpensePaymentDto } from '../dtos/expense/create-expense-payment.dto';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';
import { ExpenseStatus } from '../models/expense.entity';
import { BulkDeleteExpenseDto } from '../dtos/expense/bulk-delete-expense.dto';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';

@Controller('expenses')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  create(@Body() createExpenseDto: CreateExpenseDto, @UserId() userId: string) {
    return this.expenseService.create(createExpenseDto, userId);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: ExpenseStatus,
    @Query('categoryId') categoryId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.expenseService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
      status,
      categoryId,
      startDate,
      endDate,
    );
  }

  @Get('summary')
  getExpensesSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.expenseService.getExpensesSummary(startDate, endDate);
  }

  @Get('monthly/:year')
  getMonthlyExpenses(@Param('year') year: string) {
    return this.expenseService.getMonthlyExpenses(parseInt(year));
  }

  @Get('by-category')
  getExpensesByCategory(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.expenseService.getExpensesByCategory(startDate, endDate);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expenseService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExpenseDto: UpdateExpenseDto) {
    return this.expenseService.update(id, updateExpenseDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expenseService.remove(id);
  }

  @Post('bulk-delete')
  removeMany(@Body() bulkDeleteExpenseDto: BulkDeleteExpenseDto) {
    return this.expenseService.removeMany(bulkDeleteExpenseDto.ids);
  }

  @Post(':id/payments')
  addPayment(
    @Param('id') id: string,
    @Body() createPaymentDto: CreateExpensePaymentDto,
    @UserId() userId: string,
  ) {
    createPaymentDto.expenseId = id;
    return this.expenseService.addPayment(createPaymentDto, userId);
  }

  @Get(':id/payments')
  getPayments(@Param('id') id: string) {
    return this.expenseService.getPayments(id);
  }
}
