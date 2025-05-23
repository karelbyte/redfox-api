import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { WithdrawalService } from '../services/withdrawal.service';
import { CreateWithdrawalDto } from '../dtos/withdrawal/create-withdrawal.dto';
import { UpdateWithdrawalDto } from '../dtos/withdrawal/update-withdrawal.dto';
import { WithdrawalResponseDto } from '../dtos/withdrawal/withdrawal-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Controller('withdrawals')
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Post()
  create(
    @Body() createWithdrawalDto: CreateWithdrawalDto,
  ): Promise<WithdrawalResponseDto> {
    return this.withdrawalService.create(createWithdrawalDto);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<WithdrawalResponseDto>> {
    return this.withdrawalService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WithdrawalResponseDto> {
    return this.withdrawalService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWithdrawalDto: UpdateWithdrawalDto,
  ): Promise<WithdrawalResponseDto> {
    return this.withdrawalService.update(id, updateWithdrawalDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.withdrawalService.remove(id);
  }
} 