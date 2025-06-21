import { Injectable } from '@nestjs/common';
import { Warehouse } from '../../models/warehouse.entity';
import { WarehouseResponseDto } from '../../dtos/warehouse/warehouse-response.dto';
import { CurrencyMapper } from './currency.mapper';

@Injectable()
export class WarehouseMapper {
  constructor(private readonly currencyMapper: CurrencyMapper) {}

  mapToResponseDto(warehouse: Warehouse): WarehouseResponseDto {
    const {
      id,
      code,
      name,
      address,
      phone,
      status,
      isOpen,
      currency,
      created_at,
    } = warehouse;

    return {
      id,
      code,
      name,
      address,
      phone,
      status,
      is_open: isOpen,
      currency: currency
        ? this.currencyMapper.mapToResponseDto(currency)
        : null,
      created_at,
    };
  }
}
