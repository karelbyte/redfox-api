import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Put,
  Query,
} from '@nestjs/common';
import { TaxService } from '../services/tax.service';
import { CreateTaxDto } from '../dtos/tax/create-tax.dto';
import { UpdateTaxDto } from '../dtos/tax/update-tax.dto';
import { TaxResponseDto } from '../dtos/tax/tax-response.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Controller('taxes')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() createTaxDto: CreateTaxDto): Promise<TaxResponseDto> {
    return this.taxService.create(createTaxDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  findAll(
    @Query() paginationDto?: PaginationDto,
  ): Promise<PaginatedResponse<TaxResponseDto>> {
    return this.taxService.findAll(paginationDto);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@Param('id') id: string): Promise<TaxResponseDto> {
    return this.taxService.findOne(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateTaxDto: UpdateTaxDto,
  ): Promise<TaxResponseDto> {
    return this.taxService.update(id, updateTaxDto);
  }

  @Get(':id/usage')
  @UseGuards(AuthGuard)
  getTaxUsage(@Param('id') id: string) {
    return this.taxService.getTaxUsage(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string): Promise<void> {
    return this.taxService.remove(id);
  }

  @Patch(':id/activate')
  @UseGuards(AuthGuard)
  activate(@Param('id') id: string): Promise<TaxResponseDto> {
    return this.taxService.activate(id);
  }

  @Patch(':id/deactivate')
  @UseGuards(AuthGuard)
  deactivate(@Param('id') id: string): Promise<TaxResponseDto> {
    return this.taxService.deactivate(id);
  }
}
