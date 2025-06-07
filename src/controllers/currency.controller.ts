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
import { CurrencyService } from '../services/currency.service';
import { CreateCurrencyDto } from '../dtos/currency/create-currency.dto';
import { UpdateCurrencyDto } from '../dtos/currency/update-currency.dto';
import { CurrencyResponseDto } from '../dtos/currency/currency-response.dto';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';
import { AuthGuard } from '../guards/auth.guard';

@Controller('currencies')
@UseGuards(AuthGuard)
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Post()
  create(
    @Body() createCurrencyDto: CreateCurrencyDto,
  ): Promise<CurrencyResponseDto> {
    return this.currencyService.create(createCurrencyDto);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<CurrencyResponseDto>> {
    return this.currencyService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CurrencyResponseDto> {
    return this.currencyService.findOne(id);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string): Promise<CurrencyResponseDto> {
    return this.currencyService.findByCode(code);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCurrencyDto: UpdateCurrencyDto,
  ): Promise<CurrencyResponseDto> {
    return this.currencyService.update(id, updateCurrencyDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.currencyService.remove(id);
  }
}
