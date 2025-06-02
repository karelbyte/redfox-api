import { DataSource } from 'typeorm';
import { Product, ProductType } from '../../src/models/product.entity';
import { Brand } from '../../src/models/brand.entity';
import { Category } from '../../src/models/category.entity';
import { Tax } from '../../src/models/tax.entity';
import { MeasurementUnit } from '../../src/models/measurement-unit.entity';
import { DeepPartial } from 'typeorm';

export class ProductsSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const productRepository = dataSource.getRepository(Product);
    const brandRepository = dataSource.getRepository(Brand);
    const categoryRepository = dataSource.getRepository(Category);
    const taxRepository = dataSource.getRepository(Tax);
    const measurementUnitRepository = dataSource.getRepository(MeasurementUnit);

    const appleBrand = await brandRepository.findOne({
      where: { code: 'APPLE' },
    });
    const samsungBrand = await brandRepository.findOne({
      where: { code: 'SAMSUNG' },
    });
    const electronicsCategory = await categoryRepository.findOne({
      where: { slug: 'ELEC' },
    });
    const ivaTax = await taxRepository.findOne({ where: { code: 'IVA' } });
    const unit = await measurementUnitRepository.findOne({
      where: { code: 'UNIT' },
    });

    if (
      !appleBrand ||
      !samsungBrand ||
      !electronicsCategory ||
      !ivaTax ||
      !unit
    ) {
      throw new Error(
        'No se encontraron todas las entidades relacionadas necesarias',
      );
    }

    const products: DeepPartial<Product>[] = [
      {
        name: 'iPhone 13 Pro',
        slug: 'iphone-13-pro',
        description: 'El último iPhone con características profesionales',
        sku: 'IP13P-256-BLK',
        weight: 0.204,
        width: 0.0715,
        height: 0.1467,
        length: 0.0076,
        brand: appleBrand,
        category: electronicsCategory,
        tax: ivaTax,
        measurement_unit: unit,
        is_active: true,
        type: ProductType.TANGIBLE,
      },
      {
        name: 'Samsung Galaxy S21',
        slug: 'samsung-galaxy-s21',
        description: 'Potente smartphone Android con cámara profesional',
        sku: 'SGS21-128-BLK',
        weight: 0.169,
        width: 0.0712,
        height: 0.1517,
        length: 0.0079,
        brand: samsungBrand,
        category: electronicsCategory,
        tax: ivaTax,
        measurement_unit: unit,
        is_active: true,
        type: ProductType.TANGIBLE,
      },
      {
        name: 'Servicio de Mantenimiento',
        slug: 'servicio-mantenimiento',
        description:
          'Servicio de mantenimiento preventivo para equipos electrónicos',
        sku: 'SERV-MANT-001',
        brand: appleBrand,
        category: electronicsCategory,
        tax: ivaTax,
        measurement_unit: unit,
        is_active: true,
        type: ProductType.SERVICE,
      },
    ];

    for (const product of products) {
      const existingProduct = await productRepository.findOne({
        where: { sku: product.sku },
      });

      if (!existingProduct) {
        await productRepository.save(product);
      }
    }
  }
}
