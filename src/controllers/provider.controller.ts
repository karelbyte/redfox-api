import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ProviderService } from '../services/provider.service';
import { CreateProviderDto } from '../dtos/provider/create-provider.dto';
import { UpdateProviderDto } from '../dtos/provider/update-provider.dto';
import { ProviderResponseDto } from '../dtos/provider/provider-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Controller('providers')
export class ProviderController {
  constructor(private readonly providerService: ProviderService) {}

  @Post()
  create(@Body() createProviderDto: CreateProviderDto): Promise<ProviderResponseDto> {
    return this.providerService.create(createProviderDto);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto): Promise<PaginatedResponse<ProviderResponseDto>> {
    return this.providerService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProviderResponseDto> {
    return this.providerService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProviderDto: UpdateProviderDto,
  ): Promise<ProviderResponseDto> {
    return this.providerService.update(id, updateProviderDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.providerService.remove(id);
  }
} 