import { Injectable } from '@nestjs/common';
import { Tax } from '../../models/tax.entity';
import { TaxResponseDto } from '../../dtos/tax/tax-response.dto';

@Injectable()
export class TaxMapper {
  mapToResponseDto(tax: Tax): TaxResponseDto {
    const { id, name, code, value, type, isActive, createdAt } = tax;
    return { id, name, code, value, type, isActive, createdAt };
  }
}
