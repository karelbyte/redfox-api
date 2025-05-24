import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TaxService } from '../services/tax.service';
import { CreateTaxDto } from '../dtos/tax/create-tax.dto';
import { UpdateTaxDto } from '../dtos/tax/update-tax.dto';
import { TaxResponseDto } from '../dtos/tax/tax-response.dto';

@Controller('taxes')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Post()
  create(@Body() createTaxDto: CreateTaxDto): Promise<TaxResponseDto> {
    return this.taxService.create(createTaxDto);
  }

  @Get()
  findAll(): Promise<TaxResponseDto[]> {
    return this.taxService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<TaxResponseDto> {
    return this.taxService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTaxDto: UpdateTaxDto,
  ): Promise<TaxResponseDto> {
    return this.taxService.update(id, updateTaxDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.taxService.remove(id);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string): Promise<TaxResponseDto> {
    return this.taxService.activate(id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string): Promise<TaxResponseDto> {
    return this.taxService.deactivate(id);
  }
}
