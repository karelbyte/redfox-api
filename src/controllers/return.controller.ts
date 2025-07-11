import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ReturnService } from '../services/return.service';
import { CreateReturnDto } from '../dtos/return/create-return.dto';
import { CreateReturnDetailDto } from '../dtos/return/create-return-detail.dto';
import { UpdateReturnDetailDto } from '../dtos/return/update-return-detail.dto';
import { ReturnResponseDto } from '../dtos/return/return-response.dto';
import { ReturnDetailResponseDto } from '../dtos/return/return-detail-response.dto';
import { ReturnQueryDto } from '../dtos/return/return-query.dto';
import { ReturnDetailQueryDto } from '../dtos/return/return-detail-query.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { Public } from '../decorators/public.decorator';
import { UserId } from '../decorators/user-id.decorator';

@Controller('returns')
@UseGuards(AuthGuard)
export class ReturnController {
  constructor(private readonly returnService: ReturnService) {}

  @Post()
  async create(
    @Body() createReturnDto: CreateReturnDto,
    @UserId() userId: string,
  ): Promise<ReturnResponseDto> {
    return this.returnService.create(createReturnDto, userId);
  }

  @Post(':id/details')
  async createDetail(
    @Param('id') id: string,
    @Body() createDetailDto: CreateReturnDetailDto,
    @UserId() userId: string,
  ): Promise<ReturnDetailResponseDto> {
    return this.returnService.createDetail(id, createDetailDto, userId);
  }

  @Get(':id/details')
  async findAllDetails(
    @Param('id') id: string,
    @Query() queryDto: ReturnDetailQueryDto,
    @UserId() userId: string,
  ): Promise<PaginatedResponse<ReturnDetailResponseDto>> {
    return this.returnService.findAllDetails(id, queryDto, userId);
  }

  @Get(':id/details/:detailId')
  async findOneDetail(
    @Param('id') id: string,
    @Param('detailId') detailId: string,
    @UserId() userId: string,
  ): Promise<ReturnDetailResponseDto> {
    return this.returnService.findOneDetail(id, detailId, userId);
  }

  @Put(':id/details/:detailId')
  async updateDetail(
    @Param('id') id: string,
    @Param('detailId') detailId: string,
    @Body() updateDetailDto: UpdateReturnDetailDto,
    @UserId() userId: string,
  ): Promise<ReturnDetailResponseDto> {
    return this.returnService.updateDetail(id, detailId, updateDetailDto, userId);
  }

  @Delete(':id/details/:detailId')
  async removeDetail(
    @Param('id') id: string,
    @Param('detailId') detailId: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.returnService.removeDetail(id, detailId, userId);
  }

  @Post(':id/process')
  async processReturn(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<ReturnResponseDto> {
    return this.returnService.processReturn(id, userId);
  }

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query() queryDto?: ReturnQueryDto,
    @UserId() userId?: string,
  ): Promise<PaginatedResponse<ReturnResponseDto>> {
    return this.returnService.findAll(paginationDto, queryDto, userId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<ReturnResponseDto> {
    return this.returnService.findOne(id, userId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.returnService.remove(id, userId);
  }
} 