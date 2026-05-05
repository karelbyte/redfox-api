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
} from '@nestjs/common';
import { PayrollService } from '../services/payroll.service';
import { CreatePayrollDto } from '../dtos/payroll/create-payroll.dto';
import { UpdatePayrollDto } from '../dtos/payroll/update-payroll.dto';
import { PayrollResponseDto } from '../dtos/payroll/payroll-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';

@Controller('payroll')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post()
  create(
    @Body() createPayrollDto: CreatePayrollDto,
    @UserId() userId: string,
  ): Promise<PayrollResponseDto> {
    return this.payrollService.create(createPayrollDto, userId);
  }

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<PayrollResponseDto>> {
    return this.payrollService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<PayrollResponseDto> {
    return this.payrollService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePayrollDto: UpdatePayrollDto,
    @UserId() userId: string,
  ): Promise<PayrollResponseDto> {
    return this.payrollService.update(id, updatePayrollDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.payrollService.remove(id, userId);
  }

  @Put(':id/process')
  process(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<PayrollResponseDto> {
    return this.payrollService.process(id, userId);
  }
}
