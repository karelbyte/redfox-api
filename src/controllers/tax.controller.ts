import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TaxService } from '../services/tax.service';
import { CreateTaxDto } from '../dtos/tax/create-tax.dto';
import { UpdateTaxDto } from '../dtos/tax/update-tax.dto';
import { TaxResponseDto } from '../dtos/tax/tax-response.dto';
import { AuthGuard } from 'src/guards/auth.guard';

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
  findAll(): Promise<TaxResponseDto[]> {
    return this.taxService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@Param('id') id: string): Promise<TaxResponseDto> {
    return this.taxService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateTaxDto: UpdateTaxDto,
  ): Promise<TaxResponseDto> {
    return this.taxService.update(id, updateTaxDto);
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
