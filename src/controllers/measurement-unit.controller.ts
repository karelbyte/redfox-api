import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  Put,
  UseGuards,
} from '@nestjs/common';
import { MeasurementUnitService } from '../services/measurement-unit.service';
import { CreateMeasurementUnitDto } from '../dtos/measurement-unit/create-measurement-unit.dto';
import { UpdateMeasurementUnitDto } from '../dtos/measurement-unit/update-measurement-unit.dto';
import { MeasurementUnitResponseDto } from '../dtos/measurement-unit/measurement-unit-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
@Controller('measurement-units')
@UseGuards(AuthGuard)
export class MeasurementUnitController {
  constructor(
    private readonly measurementUnitService: MeasurementUnitService,
  ) {}

  @Post()
  create(
    @Body() createMeasurementUnitDto: CreateMeasurementUnitDto,
  ): Promise<MeasurementUnitResponseDto> {
    return this.measurementUnitService.create(createMeasurementUnitDto);
  }

  @Get()
  findAll(
    @Query() paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<MeasurementUnitResponseDto>> {
    return this.measurementUnitService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MeasurementUnitResponseDto> {
    return this.measurementUnitService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMeasurementUnitDto: UpdateMeasurementUnitDto,
  ): Promise<MeasurementUnitResponseDto> {
    return this.measurementUnitService.update(id, updateMeasurementUnitDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.measurementUnitService.remove(id);
  }
}
