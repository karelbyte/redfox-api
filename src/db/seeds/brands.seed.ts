import { Brand } from 'src/models/brand.entity';
import { DataSource } from 'typeorm';

export class BrandsSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const brandRepository = dataSource.getRepository(Brand);

    const brands = [
      {
        code: 'APPLE',
        description: 'Apple Inc.',
        is_active: true,
      },
      {
        code: 'SAMSUNG',
        description: 'Samsung Electronics',
        is_active: true,
      },
      {
        code: 'SONY',
        description: 'Sony Corporation',
        is_active: true,
      },
      {
        code: 'LG',
        description: 'LG Electronics',
        is_active: true,
      },
      {
        code: 'NIKON',
        description: 'Nikon Corporation',
        is_active: true,
      },
      {
        code: 'CANON',
        description: 'Canon Inc.',
        is_active: true,
      },
      {
        code: 'DELL',
        description: 'Dell Technologies',
        is_active: true,
      },
      {
        code: 'HP',
        description: 'Hewlett-Packard',
        is_active: true,
      },
      {
        code: 'ASUS',
        description: 'ASUS',
        is_active: true,
      },
      {
        code: 'MSI',
        description: 'Micro-Star International',
        is_active: true,
      },
    ];

    for (const brand of brands) {
      const existingBrand = await brandRepository.findOne({
        where: { code: brand.code },
      });

      if (!existingBrand) {
        await brandRepository.save(brand);
      }
    }
  }
} 