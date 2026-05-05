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
import { EmployeeService } from '../services/employee.service';
import { CreateEmployeeDto } from '../dtos/employee/create-employee.dto';
import { UpdateEmployeeDto } from '../dtos/employee/update-employee.dto';
import { EmployeeResponseDto } from '../dtos/employee/employee-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';

@Controller('employees')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  create(
    @Body() createEmployeeDto: CreateEmployeeDto,
    @UserId() userId: string,
  ): Promise<EmployeeResponseDto> {
    return this.employeeService.create(createEmployeeDto, userId);
  }

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<EmployeeResponseDto>> {
    return this.employeeService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<EmployeeResponseDto> {
    return this.employeeService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @UserId() userId: string,
  ): Promise<EmployeeResponseDto> {
    return this.employeeService.update(id, updateEmployeeDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.employeeService.remove(id, userId);
  }

  @Get('department/:departmentId')
  findByDepartment(
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @UserId() userId: string,
  ): Promise<EmployeeResponseDto[]> {
    return this.employeeService.findByDepartment(departmentId, userId);
  }

  @Get('manager/:managerId')
  findByManager(
    @Param('managerId', ParseUUIDPipe) managerId: string,
    @UserId() userId: string,
  ): Promise<EmployeeResponseDto[]> {
    return this.employeeService.findByManager(managerId, userId);
  }

  @Get('stats/active-count')
  getActiveEmployeesCount(@UserId() userId: string): Promise<number> {
    return this.employeeService.getActiveEmployeesCount(userId);
  }

  @Get('status/:status')
  getEmployeesByStatus(
    @Param('status') status: string,
    @UserId() userId: string,
  ): Promise<EmployeeResponseDto[]> {
    return this.employeeService.getEmployeesByStatus(status, userId);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
    @UserId() userId: string,
  ): Promise<EmployeeResponseDto> {
    return this.employeeService.updateStatus(id, status, userId);
  }

  @Put(':id/toggle-active')
  toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<EmployeeResponseDto> {
    return this.employeeService.toggleActive(id, userId);
  }
}
