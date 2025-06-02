import { DataSource } from 'typeorm';
import { Warehouse } from '../../src/models/warehouse.entity';
import { DeepPartial } from 'typeorm';

export class WarehousesSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const warehouseRepository = dataSource.getRepository(Warehouse);

    const warehouses: DeepPartial<Warehouse>[] = [
      {
        code: 'ALM-CENTRAL',
        name: 'Almacén Central',
        address: 'Av. Principal 123, Ciudad Industrial',
        phone: '555-0001',
        isOpen: true,
        status: true,
      },
      {
        code: 'ALM-NORTE',
        name: 'Almacén Norte',
        address: 'Calle Norte 456, Zona Industrial Norte',
        phone: '555-0002',
        isOpen: true,
        status: true,
      },
      {
        code: 'ALM-SUR',
        name: 'Almacén Sur',
        address: 'Av. Sur 789, Parque Industrial Sur',
        phone: '555-0003',
        isOpen: true,
        status: true,
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
