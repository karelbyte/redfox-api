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
} from '@nestjs/common';
import { ProviderService } from '../services/provider.service';
import { CreateProviderDto } from '../dtos/provider/create-provider.dto';
import { UpdateProviderDto } from '../dtos/provider/update-provider.dto';
import { ProviderResponseDto } from '../dtos/provider/provider-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';

@Controller('providers')
@UseGuards(AuthGuard)
export class ProviderController {
  constructor(private readonly providerService: ProviderService) {}

  @Post()
  create(
    @Body() createProviderDto: CreateProviderDto,
    @UserId() userId: string,
  ): Promise<ProviderResponseDto> {
    return this.providerService.create(createProviderDto, userId);
  }

  @Get()
  findAll(
    @UserId() userId: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<ProviderResponseDto>> {
    return this.providerService.findAll(paginationDto, userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<ProviderResponseDto> {
    return this.providerService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProviderDto: UpdateProviderDto,
    @UserId() userId: string,
  ): Promise<ProviderResponseDto> {
    return this.providerService.update(id, updateProviderDto, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.providerService.remove(id, userId);
  }
}
