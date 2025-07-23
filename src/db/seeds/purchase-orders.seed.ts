import { PurchaseOrder } from 'src/models/purchase-order.entity';
import { PurchaseOrderDetail } from 'src/models/purchase-order-detail.entity';
import { Provider } from 'src/models/provider.entity';
import { Product } from 'src/models/product.entity';
import { Warehouse } from 'src/models/warehouse.entity';
import { DataSource } from 'typeorm';

export class PurchaseOrdersSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const purchaseOrderRepository = dataSource.getRepository(PurchaseOrder);
    const purchaseOrderDetailRepository =
      dataSource.getRepository(PurchaseOrderDetail);
    const providerRepository = dataSource.getRepository(Provider);
    const productRepository = dataSource.getRepository(Product);
    const warehouseRepository = dataSource.getRepository(Warehouse);

    // Obtener proveedores, productos y almacenes existentes
    const providers = await providerRepository.find();
    const products = await productRepository.find();
    const warehouses = await warehouseRepository.find();

    if (
      providers.length === 0 ||
      products.length === 0 ||
      warehouses.length === 0
    ) {
      console.log(
        'Skipping purchase orders seed: missing providers, products, or warehouses',
      );
      return;
    }

    const purchaseOrders = [
      {
        code: 'PO-2024-001',
        date: new Date('2024-01-15'),
        provider: providers[0],
        warehouse: warehouses[0],
        document: 'FACT-001',
        amount: 2500.0,
        status: 'APPROVED',
        notes: 'Orden de compra para equipos de cómputo',
        expected_delivery_date: new Date('2024-01-25'),
      },
      {
        code: 'PO-2024-002',
        date: new Date('2024-01-20'),
        provider: providers[1] || providers[0],
        warehouse: warehouses[1] || warehouses[0],
        document: 'FACT-002',
        amount: 1800.0,
        status: 'PENDING',
        notes: 'Orden de compra para accesorios',
        expected_delivery_date: new Date('2024-02-05'),
      },
      {
        code: 'PO-2024-003',
        date: new Date('2024-01-25'),
        provider: providers[2] || providers[0],
        warehouse: warehouses[0],
        document: 'FACT-003',
        amount: 3200.0,
        status: 'COMPLETED',
        notes: 'Orden de compra para componentes',
        expected_delivery_date: new Date('2024-02-10'),
      },
    ];

    for (const purchaseOrderData of purchaseOrders) {
      const existingPurchaseOrder = await purchaseOrderRepository.findOne({
        where: { code: purchaseOrderData.code },
      });

      if (!existingPurchaseOrder) {
        const purchaseOrder =
          await purchaseOrderRepository.save(purchaseOrderData);

        // Crear detalles para cada orden de compra
        const numDetails = Math.floor(Math.random() * 5) + 2; // 2-6 detalles
        const selectedProducts = products
          .sort(() => 0.5 - Math.random())
          .slice(0, numDetails);

        for (const product of selectedProducts) {
          const quantity = Math.floor(Math.random() * 10) + 1;
          const price = Math.random() * 100 + 10;
          const receivedQuantity =
            purchaseOrder.status === 'COMPLETED'
              ? quantity
              : purchaseOrder.status === 'APPROVED'
                ? Math.floor(quantity * 0.7)
                : 0;

          await purchaseOrderDetailRepository.save({
            purchaseOrder,
            product,
            quantity,
            price,
            received_quantity: receivedQuantity,
          });
        }
      }
    }
  }
}
