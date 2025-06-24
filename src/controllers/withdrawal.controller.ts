import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Put,
} from '@nestjs/common';
import { WithdrawalService } from '../services/withdrawal.service';
import { CreateWithdrawalDto } from '../dtos/withdrawal/create-withdrawal.dto';
import { UpdateWithdrawalDto } from '../dtos/withdrawal/update-withdrawal.dto';
import { WithdrawalResponseDto } from '../dtos/withdrawal/withdrawal-response.dto';
import { CreateWithdrawalDetailDto } from '../dtos/withdrawal-detail/create-withdrawal-detail.dto';
import { UpdateWithdrawalDetailDto } from '../dtos/withdrawal-detail/update-withdrawal-detail.dto';
import { WithdrawalDetailResponseDto } from '../dtos/withdrawal-detail/withdrawal-detail-response.dto';
import { WithdrawalDetailQueryDto } from '../dtos/withdrawal-detail/withdrawal-detail-query.dto';
import { CloseWithdrawalResponseDto } from '../dtos/withdrawal/close-withdrawal-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';

@Controller('withdrawals')
@UseGuards(AuthGuard)
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

  @Put(':id')
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

  // Rutas para detalles de withdrawal
  @Post(':id/details')
  createDetail(
    @Param('id', ParseUUIDPipe) withdrawalId: string,
    @Body() createDetailDto: CreateWithdrawalDetailDto,
  ): Promise<WithdrawalDetailResponseDto> {
    return this.withdrawalService.createDetail(withdrawalId, createDetailDto);
  }

  @Get(':id/details')
  findAllDetails(
    @Param('id', ParseUUIDPipe) withdrawalId: string,
    @Query() queryDto: WithdrawalDetailQueryDto,
  ): Promise<PaginatedResponse<WithdrawalDetailResponseDto>> {
    return this.withdrawalService.findAllDetails(withdrawalId, queryDto);
  }

  @Get(':id/details/:detailId')
  findOneDetail(
    @Param('id', ParseUUIDPipe) withdrawalId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
  ): Promise<WithdrawalDetailResponseDto> {
    return this.withdrawalService.findOneDetail(withdrawalId, detailId);
  }

  @Put(':id/details/:detailId')
  updateDetail(
    @Param('id', ParseUUIDPipe) withdrawalId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @Body() updateDetailDto: UpdateWithdrawalDetailDto,
  ): Promise<WithdrawalDetailResponseDto> {
    return this.withdrawalService.updateDetail(
      withdrawalId,
      detailId,
      updateDetailDto,
    );
  }

  @Delete(':id/details/:detailId')
  removeDetail(
    @Param('id', ParseUUIDPipe) withdrawalId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
  ): Promise<void> {
    return this.withdrawalService.removeDetail(withdrawalId, detailId);
  }

  @Post(':id/close')
  closeWithdrawal(
    @Param('id', ParseUUIDPipe) withdrawalId: string,
  ): Promise<CloseWithdrawalResponseDto> {
    return this.withdrawalService.closeWithdrawal(withdrawalId);
  }
}
