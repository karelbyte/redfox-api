import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from '../models/inventory.entity';
import { Product } from '../models/product.entity';
import { CertificationPackFactoryService } from './certification-pack-factory.service';
import { ProductData, ProductResponse } from '../interfaces/certification-pack.interface';

@Injectable()
export class InventoryPackSyncService {
  private readonly logger = new Logger(InventoryPackSyncService.name);

  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    private readonly certificationPackFactory: CertificationPackFactoryService,
  ) {}

  /**
   * Construye ProductData desde producto + precio (del inventario).
   * Se llama al aplicar recepción o cierre de almacén, cuando ya existe producto y precio.
   */
  private buildProductData(product: Product, price: number): ProductData {
    const mu = product.measurement_unit as { code?: string; description?: string } | undefined;
    const unitKey = mu?.code ?? 'H87';
    const unitName = mu?.description ?? 'Elemento';
    const productKey = product.code?.replace(/\D/g, '').slice(0, 8) || '50161800';

    return {
      description: product.description || product.name,
      product_key: productKey,
      unit_key: unitKey,
      price: Number(price),
      tax_included: true,
      taxability: '02',
      taxes: [{ type: 'IVA', rate: 0.16 }],
      unit_name: unitName,
      sku: product.sku ?? undefined,
    };
  }

  /**
   * Sincroniza un registro de inventario con el pack (Facturapi).
   * Se invoca al aplicar una recepción o al cerrar almacén, cuando ya tenemos producto y precio.
   * Escribe pack_product_id y pack_product_response en el registro de inventario.
   */
  async syncForInventory(inventory: Inventory): Promise<{
    inventory: Inventory;
    packSyncSuccess: boolean;
    packErrorMessage?: string;
  }> {
    try {
      const packService = await this.certificationPackFactory.getPackService();
      const product = inventory.product as Product;
      if (!product) {
        return {
          inventory,
          packSyncSuccess: false,
          packErrorMessage: 'Inventory product not loaded',
        };
      }
      const price = Number(inventory.price ?? 0);
      const productData = this.buildProductData(product, price);

      if (inventory.pack_product_id) {
        const patch: Partial<ProductData> = {
          description: productData.description,
          product_key: productData.product_key,
          unit_key: productData.unit_key,
          unit_name: productData.unit_name,
          price,
          sku: productData.sku,
        };
        const packResponse: ProductResponse = await packService.updateProduct(
          inventory.pack_product_id,
          patch,
        );
        inventory.pack_product_response = packResponse as unknown as Record<string, unknown>;
      } else {
        const packResponse: ProductResponse = await packService.createProduct(productData);
        inventory.pack_product_id = packResponse.id;
        inventory.pack_product_response = packResponse as unknown as Record<string, unknown>;
      }

      const saved = await this.inventoryRepository.save(inventory);
      return { inventory: saved, packSyncSuccess: true };
    } catch (error: any) {
      this.logger.warn(
        `Failed to sync inventory with certification pack: ${error?.message}`,
      );
      return {
        inventory,
        packSyncSuccess: false,
        packErrorMessage: error?.message,
      };
    }
  }
}
