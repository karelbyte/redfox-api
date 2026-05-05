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
import { AttendanceService } from '../services/attendance.service';
import { CreateAttendanceDto } from '../dtos/attendance/create-attendance.dto';
import { UpdateAttendanceDto } from '../dtos/attendance/update-attendance.dto';
import { AttendanceResponseDto } from '../dtos/attendance/attendance-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';

@Controller('attendance')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  create(
    @Body() createAttendanceDto: CreateAttendanceDto,
    @UserId() userId: string,
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.create(createAttendanceDto, userId);
  }

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<AttendanceResponseDto>> {
    return this.attendanceService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
    @UserId() userId: string,
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.update(id, updateAttendanceDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.attendanceService.remove(id, userId);
  }
}
