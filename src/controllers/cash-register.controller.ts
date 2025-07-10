import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { CashRegisterService } from '../services/cash-register.service';
import { CreateCashRegisterDto } from '../dtos/cash-register/create-cash-register.dto';
import { UpdateCashRegisterDto } from '../dtos/cash-register/update-cash-register.dto';
import { OpenCashRegisterDto } from '../dtos/cash-register/open-cash-register.dto';
import { CashRegisterResponseDto } from '../dtos/cash-register/cash-register-response.dto';
import { CashRegisterBalanceResponseDto } from '../dtos/cash-register/cash-register-balance-response.dto';
import { AuthGuard } from '../guards/auth.guard';
import { UserId } from '../decorators/user-id.decorator';

@Controller('cash-registers')
@UseGuards(AuthGuard)
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Get('current')
  getCurrentCashRegister(
    @UserId() userId: string,
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.getCurrentCashRegister(userId);
  }

  @Post()
  create(
    @Body() createCashRegisterDto: CreateCashRegisterDto,
    @UserId() userId: string,
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.create(createCashRegisterDto, userId);
  }

  @Post('open')
  openCashRegister(
    @Body() openCashRegisterDto: OpenCashRegisterDto,
    @UserId() userId: string,
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.openCashRegister(
      openCashRegisterDto,
      userId,
    );
  }

  @Post(':id/close')
  closeCashRegister(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.closeCashRegister(id, userId);
  }

  @Put(':id')
  updateCashRegister(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCashRegisterDto: UpdateCashRegisterDto,
    @UserId() userId: string,
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.updateCashRegister(
      id,
      updateCashRegisterDto,
      userId,
    );
  }

  @Get(':id/balance')
  getCashRegisterBalance(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<CashRegisterBalanceResponseDto> {
    return this.cashRegisterService.getCashRegisterBalance(id, userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<CashRegisterResponseDto> {
    return this.cashRegisterService.findOne(id, userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.cashRegisterService.remove(id, userId);
  }
} 