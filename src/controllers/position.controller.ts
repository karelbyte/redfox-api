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
import { PositionService } from '../services/position.service';
import { CreatePositionDto } from '../dtos/position/create-position.dto';
import { UpdatePositionDto } from '../dtos/position/update-position.dto';
import { PositionResponseDto } from '../dtos/position/position-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';
import { TenantInterceptor } from '../interceptors/tenant.interceptor';

@Controller('positions')
@UseGuards(AuthGuard)
@UseInterceptors(TenantInterceptor)
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Post()
  create(
    @Body() createPositionDto: CreatePositionDto,
    @UserId() userId: string,
  ): Promise<PositionResponseDto> {
    return this.positionService.create(createPositionDto, userId);
  }

  @Get()
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<PositionResponseDto>> {
    return this.positionService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<PositionResponseDto> {
    return this.positionService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePositionDto: UpdatePositionDto,
    @UserId() userId: string,
  ): Promise<PositionResponseDto> {
    return this.positionService.update(id, updatePositionDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.positionService.remove(id, userId);
  }
}
