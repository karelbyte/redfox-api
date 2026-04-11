import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from '../models/inventory.entity';
import { Product } from '../models/product.entity';
import { CertificationPackFactoryService } from './certification-pack-factory.service';
import { ProductData } from '../interfaces/certification-pack.interface';

@Injectable()
export class InventoryPackSyncService {
  private readonly logger = new Logger(InventoryPackSyncService.name);

  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly certificationPackFactory: CertificationPackFactoryService,
  ) {}

  /**
   * Construye el ProductData normalizado desde producto + precio (del inventario).
   * Usa los impuestos reales del producto.
   */
  private buildProductData(product: Product, price: number): ProductData {
    const mu = product.measurement_unit as
      | { code?: string; description?: string }
      | undefined;
    const unitKey = mu?.code ?? 'H87';
    const unitName = mu?.description ?? 'Elemento';
    const productKey = product.code || '50161800';

    const taxes = product.taxes?.map((tax) => ({
      type: tax.name,
      rate: Number(tax.value) / 100,
    })) || [{ type: 'IVA', rate: 0.16 }];

    return {
      description: product.description || product.name,
      product_key: productKey,
      unit_key: unitKey,
      price: Number(price),
      tax_included: true,
      taxability: '02',
      taxes,
      unit_name: unitName,
      sku: product.sku ?? undefined,
    };
  }

  /**
   * Compara los campos relevantes del payload almacenado contra el nuevo payload.
   * Retorna true si hay diferencias (y por tanto hay que actualizar en el PAC).
   */
  private hasPayloadChanged(
    storedPayload: any,
    newProductData: ProductData,
  ): boolean {
    if (!storedPayload) return true;

    const normalize = (pd: ProductData | any) => ({
      description: pd.description ?? '',
      product_key: String(pd.product_key ?? ''),
      unit_key: pd.unit_key ?? '',
      price: Number(pd.price ?? 0),
      sku: pd.sku ?? null,
    });

    return (
      JSON.stringify(normalize(storedPayload)) !==
      JSON.stringify(normalize(newProductData))
    );
  }

  /**
   * Sincroniza un registro de inventario con el pack de certificación.
   *
   * Lógica:
   * - Si el producto ya tiene `product_pack_id` (ID del PAC):
   *     - Solo llama `updateProduct` si `pack_payload` está vacío o si el payload cambió.
   *     - Actualiza `pack_payload` en el producto cuando se realiza la actualización.
   * - Si el producto NO tiene `product_pack_id`:
   *     - Crea el producto en el PAC con `createProduct`.
   *     - Guarda el nuevo `product_pack_id` y `pack_payload` en el producto.
   * - Siempre actualiza `pack_product_id` en el inventario.
   */
  async syncForInventory(inventory: Inventory): Promise<{
    inventory: Inventory;
    packSyncSuccess: boolean;
    packErrorMessage?: string;
  }> {
    try {
      const packService = await this.certificationPackFactory.getPackService();
      const product = inventory.product;

      if (!product) {
        return {
          inventory,
          packSyncSuccess: false,
          packErrorMessage: 'Inventory product not loaded',
        };
      }

      const price = Number(inventory.price ?? 0);
      const productData = this.buildProductData(product, price);

      if (product.product_pack_id) {
        // ──────────────────────────────────────────────
        // El producto ya existe en el PAC — actualizar
        // solo si los datos relevantes cambiaron.
        // ──────────────────────────────────────────────
        const shouldUpdate = this.hasPayloadChanged(
          product.pack_payload,
          productData,
        );

        if (shouldUpdate) {
          this.logger.log(
            `[InventoryPackSync] Payload changed for product ${product.id} (SKU: ${product.sku}). Updating in PAC...`,
          );

          const patch: Partial<ProductData> = {
            description: productData.description,
            product_key: productData.product_key,
            unit_key: productData.unit_key,
            unit_name: productData.unit_name,
            price,
          };

          const packResponse = await packService.updateProduct(
            product.product_pack_id,
            patch,
          );

          // Persiste el nuevo payload en el producto para futuras comparaciones
          await this.productRepository.save({
            ...product,
            pack_payload: productData,
          });

          inventory.pack_product_id = product.product_pack_id;
          inventory.pack_product_response =
            packResponse as unknown as Record<string, unknown>;
        } else {
          this.logger.log(
            `[InventoryPackSync] No changes detected for product ${product.id} (SKU: ${product.sku}). Skipping PAC update.`,
          );
          inventory.pack_product_id = product.product_pack_id;
        }
      } else {
        // ──────────────────────────────────────────────
        // El producto NO existe en el PAC — crear.
        // ──────────────────────────────────────────────
        this.logger.log(
          `[InventoryPackSync] No pack_product_id for product ${product.id} (SKU: ${product.sku}). Creating in PAC...`,
        );

        const packResponse = await packService.createProduct(productData);

        // Persiste el ID del PAC y el payload en el producto
        await this.productRepository.save({
          ...product,
          product_pack_id: packResponse.id,
          pack_payload: productData,
        });

        inventory.pack_product_id = packResponse.id;
        inventory.pack_product_response =
          packResponse as unknown as Record<string, unknown>;

        this.logger.log(
          `[InventoryPackSync] Product created in PAC. pack_product_id: ${packResponse.id}`,
        );
      }

      const saved = await this.inventoryRepository.save(inventory);
      return { inventory: saved, packSyncSuccess: true };
    } catch (error: any) {
      this.logger.warn(
        `[InventoryPackSync] Failed to sync inventory with certification pack: ${error?.message}`,
      );
      return {
        inventory,
        packSyncSuccess: false,
        packErrorMessage: error?.message,
      };
    }
  }
}
