import { DataSource } from 'typeorm';
import { Return } from 'src/models/return.entity';
import { ReturnDetail } from 'src/models/return-detail.entity';
import { Warehouse } from 'src/models/warehouse.entity';
import { Provider } from 'src/models/provider.entity';
import { Product } from 'src/models/product.entity';
import { DeepPartial } from 'typeorm';

export class ReturnsSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const returnRepository = dataSource.getRepository(Return);
    const returnDetailRepository = dataSource.getRepository(ReturnDetail);
    const warehouseRepository = dataSource.getRepository(Warehouse);
    const providerRepository = dataSource.getRepository(Provider);
    const productRepository = dataSource.getRepository(Product);

    // Obtener almacenes existentes
    const warehouses = await warehouseRepository.find();
    if (warehouses.length === 0) {
      console.log(
        '⏭️  Se necesitan almacenes para crear devoluciones de ejemplo',
      );
      return;
    }

    // Obtener proveedores existentes
    const providers = await providerRepository.find();
    if (providers.length === 0) {
      console.log(
        '⏭️  Se necesitan proveedores para crear devoluciones de ejemplo',
      );
      return;
    }

    // Obtener productos existentes
    const products = await productRepository.find({ take: 5 });
    if (products.length === 0) {
      console.log(
        '⏭️  Se necesitan productos para crear devoluciones de ejemplo',
      );
      return;
    }

    const sourceWarehouse = warehouses[0];
    const targetProvider = providers[0];

    const returns: DeepPartial<Return>[] = [
      {
        code: 'DEV202412010001',
        sourceWarehouseId: sourceWarehouse.id,
        targetProviderId: targetProvider.id,
        date: new Date('2024-12-01'),
        description: 'Devolución de productos defectuosos al proveedor',
        status: false,
      },
      {
        code: 'DEV202412020001',
        sourceWarehouseId: sourceWarehouse.id,
        targetProviderId: targetProvider.id,
        date: new Date('2024-12-02'),
        description: 'Devolución por productos vencidos',
        status: false,
      },
    ];

    console.log('🔄 Creating returns...');

    for (const returnData of returns) {
      const existingReturn = await returnRepository.findOne({
        where: { code: returnData.code },
      });

      if (!existingReturn) {
        const return_ = await returnRepository.save(returnData);
        console.log(`✅ Return created: ${return_.code}`);

        // Crear detalles para cada devolución
        const details: DeepPartial<ReturnDetail>[] = [];
        for (let i = 0; i < Math.min(3, products.length); i++) {
          details.push({
            returnId: return_.id,
            productId: products[i].id,
            quantity: Math.floor(Math.random() * 10) + 1,
            price: Math.floor(Math.random() * 100) + 10,
          });
        }

        await returnDetailRepository.save(details);
        console.log(
          `✅ Created ${details.length} details for return ${return_.code}`,
        );
      } else {
        console.log(`⏭️  Return already exists: ${returnData.code}`);
      }
    }

    console.log('✅ Returns seed completed');
  }
}
