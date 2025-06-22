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
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';

@Controller('receptions')
@UseGuards(AuthGuard)
export class ReceptionController {
  constructor(private readonly receptionService: ReceptionService) {}

  @Post()
  create(
    @Body() createReceptionDto: CreateReceptionDto,
  ): Promise<ReceptionResponseDto> {
    console.log(createReceptionDto);
    return this.receptionService.create(createReceptionDto);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<ReceptionResponseDto>> {
    return this.receptionService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReceptionResponseDto> {
    return this.receptionService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReceptionDto: UpdateReceptionDto,
  ): Promise<ReceptionResponseDto> {
    return this.receptionService.update(id, updateReceptionDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.receptionService.remove(id);
  }

  // Rutas para detalles de recepción
  @Post(':id/details')
  createDetail(
    @Param('id', ParseUUIDPipe) receptionId: string,
    @Body() createDetailDto: CreateReceptionDetailDto,
  ): Promise<ReceptionDetailResponseDto> {
    return this.receptionService.createDetail(receptionId, createDetailDto);
  }

  @Get(':id/details')
  findAllDetails(
    @Param('id', ParseUUIDPipe) receptionId: string,
    @Query() queryDto: ReceptionDetailQueryDto,
  ): Promise<PaginatedResponse<ReceptionDetailResponseDto>> {
    return this.receptionService.findAllDetails(receptionId, queryDto);
  }

  @Get(':id/details/:detailId')
  findOneDetail(
    @Param('id', ParseUUIDPipe) receptionId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
  ): Promise<ReceptionDetailResponseDto> {
    return this.receptionService.findOneDetail(receptionId, detailId);
  }

  @Put(':id/details/:detailId')
  updateDetail(
    @Param('id', ParseUUIDPipe) receptionId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
    @Body() updateDetailDto: UpdateReceptionDetailDto,
  ): Promise<ReceptionDetailResponseDto> {
    return this.receptionService.updateDetail(
      receptionId,
      detailId,
      updateDetailDto,
    );
  }

  @Delete(':id/details/:detailId')
  removeDetail(
    @Param('id', ParseUUIDPipe) receptionId: string,
    @Param('detailId', ParseUUIDPipe) detailId: string,
  ): Promise<void> {
    return this.receptionService.removeDetail(receptionId, detailId);
  }
}
