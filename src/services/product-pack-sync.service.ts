import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../models/product.entity';
import { CertificationPackFactoryService } from './certification-pack-factory.service';
import {
  ProductData,
  ProductResponse,
} from '../interfaces/certification-pack.interface';

@Injectable()
export class ProductPackSyncService {
  private readonly logger = new Logger(ProductPackSyncService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly certificationPackFactory: CertificationPackFactoryService,
  ) {}

  /**
   * Construye ProductData desde un producto de RedFox.
   * Usa los impuestos reales del producto, no hardcodeados.
   */
  private buildProductData(product: Product, price?: number): ProductData {
    const mu = product.measurement_unit as
      | { code?: string; description?: string }
      | undefined;
    const unitKey = mu?.code ?? 'E48';
    const unitName = mu?.description ?? 'Unidad de servicio';
    
    // Usar el code del producto como clave SAT
    const productKey = product.code || '01010101';

    // Mapear tipo de producto: service -> S, tangible -> P, digital -> S
    const productType = product.type === 'tangible' ? 'P' : 'S';

    // Mapear los impuestos reales del producto
    const taxes = product.taxes?.map((tax) => ({
      type: tax.name,
      rate: Number(tax.value) / 100, // Convertir de porcentaje a decimal
    })) || [{ type: 'IVA', rate: 0.16 }]; // Fallback a IVA 16%

    return {
      description: product.description || product.name,
      product_key: productKey,
      unit_key: unitKey,
      price: price !== undefined ? Number(price) : Number(product.base_price || 0),
      tax_included: false,
      taxability: '02', // Objeto de impuesto
      taxes,
      unit_name: unitName,
      sku: product.sku ?? undefined,
      type: productType,
    };
  }

  /**
   * Sincroniza un producto con el pack de certificación.
   * - Si el producto ya tiene product_pack_id, actualiza en el pack
   * - Si no tiene product_pack_id, busca por SKU o crea nuevo
   * - Guarda el product_pack_id en el producto
   */
  async syncProduct(
    product: Product,
    price?: number,
  ): Promise<{
    product: Product;
    packSyncSuccess: boolean;
    packErrorMessage?: string;
  }> {
    try {
      // Intentar obtener el servicio del pack
      let packService: any;
      try {
        packService = await this.certificationPackFactory.getPackService();
      } catch (error) {
        // Si no hay pack configurado, no es un error crítico
        this.logger.debug('No certification pack configured, skipping sync');
        return {
          product,
          packSyncSuccess: false,
          packErrorMessage: 'No certification pack configured',
        };
      }

      // Verificar que el pack soporte operaciones de productos
      if (!packService?.createProduct || !packService?.updateProduct) {
        this.logger.debug('Pack does not support product operations');
        return {
          product,
          packSyncSuccess: false,
          packErrorMessage: 'Pack does not support product operations',
        };
      }

      const productData = this.buildProductData(product, price);

      // Si ya tiene product_pack_id, actualizar en el pack
      if (product.product_pack_id) {
        try {
          const patch: Partial<ProductData> = {
            description: productData.description,
            product_key: productData.product_key,
            unit_key: productData.unit_key,
            unit_name: productData.unit_name,
            price: productData.price,
            sku: productData.sku,
            taxes: productData.taxes,
          };

          await packService.updateProduct(product.product_pack_id, patch);
          this.logger.log(
            `Product updated in pack: ${product.product_pack_id}`,
          );
        } catch (error: any) {
          this.logger.warn(
            `Failed to update product in pack: ${error?.message}`,
          );
          // Si falla la actualización, intentar crear uno nuevo
          product.product_pack_id = null as any;
        }
      }

      // Si no tiene product_pack_id, buscar por SKU o crear nuevo
      if (!product.product_pack_id) {
        let existingProduct: ProductResponse | null = null;

        // Buscar por SKU si el pack lo soporta
        if (productData.sku && packService.findProductBySku) {
          try {
            existingProduct = await packService.findProductBySku(
              productData.sku,
            );
          } catch (error) {
            // Si no encuentra o no soporta búsqueda, continuar
            this.logger.debug(`Product not found by SKU: ${productData.sku}`);
          }
        }

        if (existingProduct) {
          // Producto encontrado en el pack, vincularlo
          this.logger.log(
            `Product found in pack by SKU: ${productData.sku}. ID: ${existingProduct.id}`,
          );
          product.product_pack_id = existingProduct.id;
        } else {
          // Crear nuevo producto en el pack
          const packResponse: ProductResponse =
            await packService.createProduct(productData);
          product.product_pack_id = packResponse.id;
          this.logger.log(
            `Product created in pack: ${packResponse.id}`,
          );
        }

        // Guardar el product_pack_id en la base de datos
        await this.productRepository.save(product);
      }

      return { product, packSyncSuccess: true };
    } catch (error: any) {
      this.logger.error(
        `Failed to sync product with pack: ${error?.message}`,
        error?.stack,
      );
      return {
        product,
        packSyncSuccess: false,
        packErrorMessage: error?.message,
      };
    }
  }

  /**
   * Sincroniza múltiples productos con el pack.
   * Útil para sincronización masiva.
   */
  async syncProducts(
    products: Product[],
  ): Promise<{
    success: number;
    failed: number;
    errors: Array<{ productId: string; error: string }>;
  }> {
    let success = 0;
    let failed = 0;
    const errors: Array<{ productId: string; error: string }> = [];

    for (const product of products) {
      const result = await this.syncProduct(product);
      if (result.packSyncSuccess) {
        success++;
      } else {
        failed++;
        if (result.packErrorMessage) {
          errors.push({
            productId: product.id,
            error: result.packErrorMessage,
          });
        }
      }
    }

    return { success, failed, errors };
  }
}
