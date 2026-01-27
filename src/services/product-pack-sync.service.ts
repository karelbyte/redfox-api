import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../models/product.entity';
import { CertificationPackFactoryService } from './certification-pack-factory.service';
import { ProductData, ProductResponse } from '../interfaces/certification-pack.interface';
import { UpdateProductDto } from '../dtos/product/update-product.dto';

@Injectable()
export class ProductPackSyncService {
  private readonly logger = new Logger(ProductPackSyncService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly certificationPackFactory: CertificationPackFactoryService,
  ) {}

  /**
   * Construye el payload ProductData desde la entidad Product.
   * Usa price=0 cuando el producto no tiene precio a nivel de catálogo (escalable: luego se puede usar list_price si se agrega).
   * product.measurement_unit debe venir cargado (relations) para unit_key/unit_name correctos.
   */
  private buildProductData(product: Product): ProductData {
    const mu = product.measurement_unit as { code?: string; description?: string } | undefined;
    const unitKey = mu?.code ?? 'H87';
    const unitName = mu?.description ?? 'Elemento';
    const productKey = product.code?.replace(/\D/g, '').slice(0, 8) || '50161800';

    return {
      description: product.description || product.name,
      product_key: productKey,
      unit_key: unitKey,
      price: 0,
      tax_included: true,
      taxability: '02',
      taxes: [{ type: 'IVA', rate: 0.16 }],
      unit_name: unitName,
      sku: product.sku ?? undefined,
    };
  }

  async syncOnCreate(
    product: Product,
  ): Promise<{
    product: Product;
    packSyncSuccess: boolean;
    packErrorMessage?: string;
  }> {
    try {
      const packService = await this.certificationPackFactory.getPackService();
      const productData = this.buildProductData(product);

      const packResponse: ProductResponse = await packService.createProduct(productData);

      product.pack_product_id = packResponse.id;
      product.pack_product_response = packResponse as unknown as Record<string, unknown>;

      const saved = await this.productRepository.save(product);

      return {
        product: saved,
        packSyncSuccess: true,
      };
    } catch (error: any) {
      this.logger.warn(
        `Failed to create product in certification pack: ${error?.message}`,
      );
      return {
        product,
        packSyncSuccess: false,
        packErrorMessage: error?.message,
      };
    }
  }

  /**
   * Sincroniza un producto actualizado con el pack activo.
   * - Si no tiene pack_product_id intenta crearlo en el pack.
   * - Si ya tiene pack_product_id lo actualiza en el pack.
   */
  async syncOnUpdate(
    product: Product,
    updateProductDto: UpdateProductDto,
  ): Promise<{
    product: Product;
    packSyncSuccess: boolean;
    packErrorMessage?: string;
  }> {
    try {
      const packService = await this.certificationPackFactory.getPackService();

      if (!product.pack_product_id) {
        const productData = this.buildProductData(product);
        const packResponse = await packService.createProduct(productData);

        product.pack_product_id = packResponse.id;
        product.pack_product_response = packResponse as unknown as Record<string, unknown>;

        const saved = await this.productRepository.save(product);
        return { product: saved, packSyncSuccess: true };
      }

      const patch: Partial<ProductData> = {};
      if (updateProductDto.description !== undefined) patch.description = updateProductDto.description;
      if (updateProductDto.code !== undefined) {
        const cleaned = String(updateProductDto.code).replace(/\D/g, '').slice(0, 8) || '50161800';
        patch.product_key = cleaned;
      }
      if (updateProductDto.sku !== undefined) patch.sku = updateProductDto.sku;
      const mu = product.measurement_unit as { code?: string; description?: string } | undefined;
      if (updateProductDto.measurement_unit_id !== undefined && mu) {
        patch.unit_key = mu.code ?? 'H87';
        patch.unit_name = mu.description ?? 'Elemento';
      }

      if (Object.keys(patch).length === 0) {
        return { product, packSyncSuccess: true };
      }

      const packResponse = await packService.updateProduct(product.pack_product_id, patch);
      product.pack_product_response = packResponse as unknown as Record<string, unknown>;

      const saved = await this.productRepository.save(product);
      return { product: saved, packSyncSuccess: true };
    } catch (error: any) {
      this.logger.warn(
        `Failed to sync product with certification pack: ${error?.message}`,
      );
      return {
        product,
        packSyncSuccess: false,
        packErrorMessage: error?.message,
      };
    }
  }
}
