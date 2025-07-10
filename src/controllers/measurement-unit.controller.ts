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
import { UserId } from '../decorators/user-id.decorator';

@Controller('measurement-units')
@UseGuards(AuthGuard)
export class MeasurementUnitController {
  constructor(
    private readonly measurementUnitService: MeasurementUnitService,
  ) {}

  @Post()
  create(
    @Body() createMeasurementUnitDto: CreateMeasurementUnitDto,
    @UserId() userId: string,
  ): Promise<MeasurementUnitResponseDto> {
    return this.measurementUnitService.create(createMeasurementUnitDto, userId);
  }

  @Get()
  findAll(
    @UserId() userId: string,
    @Query() paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<MeasurementUnitResponseDto>> {
    return this.measurementUnitService.findAll(paginationDto, userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<MeasurementUnitResponseDto> {
    return this.measurementUnitService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMeasurementUnitDto: UpdateMeasurementUnitDto,
    @UserId() userId: string,
  ): Promise<MeasurementUnitResponseDto> {
    return this.measurementUnitService.update(id, updateMeasurementUnitDto, userId);
  }

  @Get(':id/usage')
  getMeasurementUnitUsage(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ) {
    return this.measurementUnitService.getMeasurementUnitUsage(id, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.measurementUnitService.remove(id, userId);
  }
}
