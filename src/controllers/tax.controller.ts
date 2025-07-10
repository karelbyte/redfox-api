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
import { UserId } from '../decorators/user-id.decorator';
import { PaginationDto } from '../dtos/common/pagination.dto';
import { PaginatedResponse } from '../interfaces/pagination.interface';

@Controller('taxes')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() createTaxDto: CreateTaxDto,
    @UserId() userId: string,
  ): Promise<TaxResponseDto> {
    return this.taxService.create(createTaxDto, userId);
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
  findOne(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<TaxResponseDto> {
    return this.taxService.findOne(id, userId);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateTaxDto: UpdateTaxDto,
    @UserId() userId: string,
  ): Promise<TaxResponseDto> {
    return this.taxService.update(id, updateTaxDto, userId);
  }

  @Get(':id/usage')
  @UseGuards(AuthGuard)
  getTaxUsage(
    @Param('id') id: string,
    @UserId() userId: string,
  ) {
    return this.taxService.getTaxUsage(id, userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.taxService.remove(id, userId);
  }

  @Patch(':id/activate')
  @UseGuards(AuthGuard)
  activate(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<TaxResponseDto> {
    return this.taxService.activate(id, userId);
  }

  @Patch(':id/deactivate')
  @UseGuards(AuthGuard)
  deactivate(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<TaxResponseDto> {
    return this.taxService.deactivate(id, userId);
  }
}
