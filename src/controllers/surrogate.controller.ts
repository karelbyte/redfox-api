import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { SurrogateService } from '../services/surrogate.service';
import { UpdateSurrogateDto } from '../dtos/surrogate/update-surrogate.dto';
import { SurrogateResponseDto } from '../dtos/surrogate/surrogate-response.dto';
import { NextCodeResponseDto } from '../dtos/surrogate/next-code-response.dto';

@Controller('surrogates')
export class SurrogateController {
  constructor(private readonly surrogateService: SurrogateService) {}

  @Get()
  async findAll(): Promise<SurrogateResponseDto[]> {
    return this.surrogateService.findAll();
  }

  @Get(':code')
  async findOne(@Param('code') code: string): Promise<SurrogateResponseDto> {
    const surrogate = await this.surrogateService.findByCode(code);
    return {
      ...surrogate,
      next_code: surrogate.generateNext(),
    };
  }

  @Get(':code/next')
  async getNextCode(@Param('code') code: string): Promise<NextCodeResponseDto> {
    return this.surrogateService.getNextCode(code);
  }

  @Get(':code/next-available')
  async getNextAvailableCode(@Param('code') code: string): Promise<NextCodeResponseDto> {
    return this.surrogateService.getNextAvailableCode(code);
  }

  @Post(':code/use')
  async useNextCode(@Param('code') code: string): Promise<NextCodeResponseDto> {
    return this.surrogateService.useNextCode(code);
  }

  @Put(':code')
  async update(
    @Param('code') code: string,
    @Body() updateData: UpdateSurrogateDto,
  ): Promise<SurrogateResponseDto> {
    return this.surrogateService.update(code, updateData);
  }

  @Post(':code/reset')
  async reset(
    @Param('code') code: string,
    @Query('start', new ParseIntPipe({ optional: true })) start?: number,
  ): Promise<SurrogateResponseDto> {
    return this.surrogateService.reset(code, start);
  }
}