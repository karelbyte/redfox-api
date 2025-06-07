import { Injectable } from '@nestjs/common';
import { Currency } from '../../models/currency.entity';
import { CurrencyResponseDto } from '../../dtos/currency/currency-response.dto';

@Injectable()
export class CurrencyMapper {
  mapToResponseDto(currency: Currency): CurrencyResponseDto {
    const { id, code, name } = currency;
    return { id, code, name };
  }
} 