import { DataSource } from 'typeorm';
import { Warehouse } from '../../src/models/warehouse.entity';
import { Currency } from '../../src/models/currency.entity';
import { DeepPartial } from 'typeorm';

export class WarehousesSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const warehouseRepository = dataSource.getRepository(Warehouse);
    const currencyRepository = dataSource.getRepository(Currency);

    // Get the USD currency as default
    const defaultCurrency = await currencyRepository.findOne({
      where: { code: 'USD' },
    });

    if (!defaultCurrency) {
      throw new Error(
        'Currency USD not found. Please run currencies seed first.',
      );
    }

    const warehouses: DeepPartial<Warehouse>[] = [
      {
        code: 'ALM-CENTRAL',
        name: 'Almacén Central',
        address: 'Av. Principal 123, Ciudad Industrial',
        phone: '555-0001',
        isOpen: true,
        status: true,
        currencyId: defaultCurrency.id,
      },
      {
        code: 'ALM-NORTE',
        name: 'Almacén Norte',
        address: 'Calle Norte 456, Zona Industrial Norte',
        phone: '555-0002',
        isOpen: true,
        status: true,
        currencyId: defaultCurrency.id,
      },
      {
        code: 'ALM-SUR',
        name: 'Almacén Sur',
        address: 'Av. Sur 789, Parque Industrial Sur',
        phone: '555-0003',
        isOpen: true,
        status: true,
        currencyId: defaultCurrency.id,
      },
    ];

    for (const warehouse of warehouses) {
      const existingWarehouse = await warehouseRepository.findOne({
        where: { code: warehouse.code },
      });

      if (!existingWarehouse) {
        await warehouseRepository.save(warehouse);
      }
    }
  }
}
