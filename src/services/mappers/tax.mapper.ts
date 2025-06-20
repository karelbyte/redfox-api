import { Injectable } from '@nestjs/common';
import { Tax } from '../../models/tax.entity';
import { TaxResponseDto } from '../../dtos/tax/tax-response.dto';

@Injectable()
export class TaxMapper {
  mapToResponseDto(tax: Tax): TaxResponseDto {
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
