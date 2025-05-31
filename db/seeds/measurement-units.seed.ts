import { DataSource } from 'typeorm';
import { MeasurementUnit } from '../../src/models/measurement-unit.entity';

export class MeasurementUnitsSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const measurementUnitRepository = dataSource.getRepository(MeasurementUnit);

    const measurementUnits = [
      {
        code: 'UN',
        description: 'Unidad',
        status: true,
      },
      {
        code: 'KG',
        description: 'Kilogramo',
        status: true,
      },
      {
        code: 'G',
        description: 'Gramo',
        status: true,
      },
      {
        code: 'L',
        description: 'Litro',
        status: true,
      },
      {
        code: 'ML',
        description: 'Mililitro',
        status: true,
      },
      {
        code: 'M',
        description: 'Metro',
        status: true,
      },
      {
        code: 'CM',
        description: 'Centímetro',
        status: true,
      },
      {
        code: 'M2',
        description: 'Metro cuadrado',
        status: true,
      },
      {
        code: 'M3',
        description: 'Metro cúbico',
        status: true,
      },
      {
        code: 'PZ',
        description: 'Pieza',
        status: true,
      },
    ];

    for (const measurementUnit of measurementUnits) {
      const existingUnit = await measurementUnitRepository.findOne({
        where: { code: measurementUnit.code },
      });

      if (!existingUnit) {
        await measurementUnitRepository.save(measurementUnit);
      }
    }
  }
} 