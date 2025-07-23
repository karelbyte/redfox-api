import { Injectable } from '@nestjs/common';
import { MeasurementUnit } from '../../models/measurement-unit.entity';
import { MeasurementUnitResponseDto } from '../../dtos/measurement-unit/measurement-unit-response.dto';

@Injectable()
export class MeasurementUnitMapper {
  mapToResponseDto(
    measurementUnit: MeasurementUnit,
  ): MeasurementUnitResponseDto {
    if (!measurementUnit) {
      throw new Error('MeasurementUnit cannot be null');
    }

    const { id, code, description, status, created_at } = measurementUnit;
    return { id, code, description, status, created_at };
  }
}
