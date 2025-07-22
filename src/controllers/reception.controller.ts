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
import { ReceptionService } from '../services/reception.service';
import { CreateReceptionDto } from '../dtos/reception/create-reception.dto';
import { UpdateReceptionDto } from '../dtos/reception/update-reception.dto';
import { ReceptionResponseDto } from '../dtos/reception/reception-response.dto';
import { CreateReceptionDetailDto } from '../dtos/reception-detail/create-reception-detail.dto';
import { UpdateReceptionDetailDto } from '../dtos/reception-detail/update-reception-detail.dto';
import { ReceptionDetailResponseDto } from '../dtos/reception-detail/reception-detail-response.dto';
import { ReceptionDetailQueryDto } from '../dtos/reception-detail/reception-detail-query.dto';
import { CloseReceptionResponseDto } from '../dtos/reception/close-reception-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';

@Controller('receptions')
@UseGuards(AuthGuard)
export class ReceptionController {
  constructor(private readonly receptionService: ReceptionService) {}

  @Post()
  create(
    @Body() createReceptionDto: CreateReceptionDto,
    @UserId() userId: string,
  ): Promise<ReceptionResponseDto> {
    console.log(createReceptionDto);
    return this.receptionService.create(createReceptionDto, userId);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @UserId() userId: string,
  ): Promise<PaginatedResponse<ReceptionResponseDto>> {
    return this.receptionService.findAll(paginationDto, userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<ReceptionResponseDto> {
    return this.receptionService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReceptionDto: UpdateReceptionDto,
    @UserId() userId: string,
  ): Promise<ReceptionResponseDto> {
    return this.receptionService.update(id, updateReceptionDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.receptionService.remove(id, userId);
  }

  @Post(':id/close')
  closeReception(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<CloseReceptionResponseDto> {
    return this.receptionService.closeReception(id, userId);
  }

  // Rutas para detalles de recepción
  @Post(':id/details')
  createDetail(
    @Param('id', ParseUUIDPipe) receptionId: string,
    @Body() createDetailDto: CreateReceptionDetailDto,
    @UserId() userId: string,
  ): Promise<ReceptionDetailResponseDto> {
    return this.receptionService.createDetail(
      receptionId,
      createDetailDto,
      userId,
    );
  }

  @Get(':id/details')
  findAllDetails(
    @Param('id', ParseUUIDPipe) receptionId: string,
    @Query() queryDto: ReceptionDetailQueryDto,
    @UserId() userId: string,
  ): Promise<PaginatedResponse<ReceptionDetailResponseDto>> {
    return this.receptionService.findAllDetails(receptionId, queryDto, userId);
  }

  @Get(':id/details/:detailId')
  findOneDetail(
    @Param('id', ParseUUIDPipe) receptionId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @UserId() userId: string,
  ): Promise<ReceptionDetailResponseDto> {
    return this.receptionService.findOneDetail(receptionId, detailId, userId);
  }

  @Put(':id/details/:detailId')
  updateDetail(
    @Param('id', ParseUUIDPipe) receptionId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @Body() updateDetailDto: UpdateReceptionDetailDto,
    @UserId() userId: string,
  ): Promise<ReceptionDetailResponseDto> {
    return this.receptionService.updateDetail(
      receptionId,
      detailId,
      updateDetailDto,
      userId,
    );
  }

  @Delete(':id/details/:detailId')
  removeDetail(
    @Param('id', ParseUUIDPipe) receptionId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.receptionService.removeDetail(receptionId, detailId, userId);
  }
}
