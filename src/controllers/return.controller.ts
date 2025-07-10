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

@Controller('returns')
@UseGuards(AuthGuard)
export class ReturnController {
  constructor(private readonly returnService: ReturnService) {}

  @Post()
  async create(@Body() createReturnDto: CreateReturnDto): Promise<ReturnResponseDto> {
    return this.returnService.create(createReturnDto);
  }

  @Post(':id/details')
  async createDetail(
    @Param('id') id: string,
    @Body() createDetailDto: CreateReturnDetailDto,
  ): Promise<ReturnDetailResponseDto> {
    return this.returnService.createDetail(id, createDetailDto);
  }

  @Get(':id/details')
  async findAllDetails(
    @Param('id') id: string,
    @Query() queryDto: ReturnDetailQueryDto,
  ): Promise<PaginatedResponse<ReturnDetailResponseDto>> {
    return this.returnService.findAllDetails(id, queryDto);
  }

  @Get(':id/details/:detailId')
  async findOneDetail(
    @Param('id') id: string,
    @Param('detailId') detailId: string,
  ): Promise<ReturnDetailResponseDto> {
    return this.returnService.findOneDetail(id, detailId);
  }

  @Put(':id/details/:detailId')
  async updateDetail(
    @Param('id') id: string,
    @Param('detailId') detailId: string,
    @Body() updateDetailDto: UpdateReturnDetailDto,
  ): Promise<ReturnDetailResponseDto> {
    return this.returnService.updateDetail(id, detailId, updateDetailDto);
  }

  @Delete(':id/details/:detailId')
  async removeDetail(
    @Param('id') id: string,
    @Param('detailId') detailId: string,
  ): Promise<void> {
    return this.returnService.removeDetail(id, detailId);
  }

  @Post(':id/process')
  async processReturn(@Param('id') id: string): Promise<ReturnResponseDto> {
    return this.returnService.processReturn(id);
  }

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query() queryDto?: ReturnQueryDto,
  ): Promise<PaginatedResponse<ReturnResponseDto>> {
    return this.returnService.findAll(paginationDto, queryDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ReturnResponseDto> {
    return this.returnService.findOne(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.returnService.remove(id);
  }
} 