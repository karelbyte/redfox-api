import { DataSource } from 'typeorm';
import { WarehouseAdjustment } from 'src/models/warehouse-adjustment.entity';
import { WarehouseAdjustmentDetail } from 'src/models/warehouse-adjustment-detail.entity';
import { Warehouse } from 'src/models/warehouse.entity';
import { Product } from 'src/models/product.entity';
import { DeepPartial } from 'typeorm';

export class WarehouseAdjustmentsSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const warehouseAdjustmentRepository =
      dataSource.getRepository(WarehouseAdjustment);
    const warehouseAdjustmentDetailRepository = dataSource.getRepository(
      WarehouseAdjustmentDetail,
    );
    const warehouseRepository = dataSource.getRepository(Warehouse);
    const productRepository = dataSource.getRepository(Product);

    // Obtener almacenes existentes
    const warehouses = await warehouseRepository.find();
    if (warehouses.length < 2) {
      console.log(
        '⏭️  Se necesitan al menos 2 almacenes para crear ajustes de ejemplo',
      );
      return;
    }

    // Obtener productos existentes
    const products = await productRepository.find({ take: 5 });
    if (products.length === 0) {
      console.log('⏭️  Se necesitan productos para crear ajustes de ejemplo');
      return;
    }

    const sourceWarehouse = warehouses[0];
    const targetWarehouse = warehouses[1];

    const adjustments: DeepPartial<WarehouseAdjustment>[] = [
      {
        code: 'AJU202412010001',
        sourceWarehouseId: sourceWarehouse.id,
        targetWarehouseId: targetWarehouse.id,
        date: new Date('2024-12-01'),
        description:
          'Ajuste de inventario entre almacenes - Transferencia mensual',
        status: true,
      },
      {
        code: 'AJU202412020001',
        sourceWarehouseId: targetWarehouse.id,
        targetWarehouseId: sourceWarehouse.id,
        date: new Date('2024-12-02'),
        description: 'Devolución de productos al almacén central',
        status: true,
      },
    ];

    console.log('🔄 Creating warehouse adjustments...');

    for (const adjustmentData of adjustments) {
      const existingAdjustment = await warehouseAdjustmentRepository.findOne({
        where: { code: adjustmentData.code },
      });

      if (!existingAdjustment) {
        const adjustment =
          await warehouseAdjustmentRepository.save(adjustmentData);
        console.log(`✅ Warehouse adjustment created: ${adjustment.code}`);

        // Crear detalles para cada ajuste
        const details: DeepPartial<WarehouseAdjustmentDetail>[] = [];
        for (let i = 0; i < Math.min(3, products.length); i++) {
          details.push({
            warehouseAdjustmentId: adjustment.id,
            productId: products[i].id,
            quantity: Math.floor(Math.random() * 10) + 1,
            price: Math.floor(Math.random() * 100) + 10,
          });
        }

        await warehouseAdjustmentDetailRepository.save(details);
        console.log(
          `✅ Created ${details.length} details for adjustment ${adjustment.code}`,
        );
      } else {
        console.log(
          `⏭️  Warehouse adjustment already exists: ${adjustmentData.code}`,
        );
      }
    }

    console.log('✅ Warehouse adjustments seed completed');
  }
}
