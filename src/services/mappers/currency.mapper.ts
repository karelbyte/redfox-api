import { Injectable } from '@nestjs/common';
import { Currency } from '../../models/currency.entity';
import { CurrencyResponseDto } from '../../dtos/currency/currency-response.dto';

@Injectable()
export class CurrencyMapper {
  mapToResponseDto(currency: Currency): CurrencyResponseDto {
    if (!currency) {
      throw new Error('Currency cannot be null');
    }

    const { id, code, name } = currency;
    return { id, code, name };
  }
}
