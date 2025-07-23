import { Injectable } from '@nestjs/common';
import { Tax } from '../../models/tax.entity';
import { TaxResponseDto } from '../../dtos/tax/tax-response.dto';

@Injectable()
export class TaxMapper {
  mapToResponseDto(tax: Tax): TaxResponseDto {
    if (!tax) {
      throw new Error('Tax cannot be null');
    }

    const { id, code, name, value, type, isActive, createdAt } = tax;
    return {
      id,
      code,
      name,
      value,
      type,
      isActive,
      createdAt,
    };
  }
}
