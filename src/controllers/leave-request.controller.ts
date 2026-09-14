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
import { LeaveRequestService } from '../services/leave-request.service';
import { CreateLeaveRequestDto } from '../dtos/leave-request/create-leave-request.dto';
import { UpdateLeaveRequestDto } from '../dtos/leave-request/update-leave-request.dto';
import { LeaveRequestResponseDto } from '../dtos/leave-request/leave-request-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';

@Controller('leave-requests')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class LeaveRequestController {
  constructor(private readonly leaveRequestService: LeaveRequestService) {}

  @Post()
  create(
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
    @UserId() userId: string,
  ): Promise<LeaveRequestResponseDto> {
    return this.leaveRequestService.create(createLeaveRequestDto, userId);
  }

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<LeaveRequestResponseDto>> {
    return this.leaveRequestService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<LeaveRequestResponseDto> {
    return this.leaveRequestService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLeaveRequestDto: UpdateLeaveRequestDto,
    @UserId() userId: string,
  ): Promise<LeaveRequestResponseDto> {
    return this.leaveRequestService.update(id, updateLeaveRequestDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.leaveRequestService.remove(id, userId);
  }

  @Put(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<LeaveRequestResponseDto> {
    return this.leaveRequestService.approve(id, userId);
  }

  @Put(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<LeaveRequestResponseDto> {
    return this.leaveRequestService.reject(id, userId);
  }
}
