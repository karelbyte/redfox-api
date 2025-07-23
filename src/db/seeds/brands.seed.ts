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
      {
        code: 'LENOVO',
        description: 'Lenovo Group Limited',
        is_active: true,
      },
      {
        code: 'ACER',
        description: 'Acer Inc.',
        is_active: true,
      },
      {
        code: 'RAZER',
        description: 'Razer Inc.',
        is_active: true,
      },
      {
        code: 'LOGITECH',
        description: 'Logitech International',
        is_active: true,
      },
      {
        code: 'STEELSERIES',
        description: 'SteelSeries',
        is_active: true,
      },
      {
        code: 'CORSAIR',
        description: 'Corsair Components',
        is_active: true,
      },
      {
        code: 'GIGABYTE',
        description: 'GIGABYTE Technology',
        is_active: true,
      },
      {
        code: 'INTEL',
        description: 'Intel Corporation',
        is_active: true,
      },
      {
        code: 'AMD',
        description: 'Advanced Micro Devices',
        is_active: true,
      },
      {
        code: 'NVIDIA',
        description: 'NVIDIA Corporation',
        is_active: true,
      },
      {
        code: 'WESTERN_DIGITAL',
        description: 'Western Digital',
        is_active: true,
      },
      {
        code: 'SEAGATE',
        description: 'Seagate Technology',
        is_active: true,
      },
      {
        code: 'KINGSTON',
        description: 'Kingston Technology',
        is_active: true,
      },
      {
        code: 'CRUCIAL',
        description: 'Crucial Technology',
        is_active: true,
      },
      {
        code: 'SANDISK',
        description: 'SanDisk Corporation',
        is_active: true,
      },
      {
        code: 'BOSE',
        description: 'Bose Corporation',
        is_active: true,
      },
      {
        code: 'JBL',
        description: 'JBL (Harman International)',
        is_active: true,
      },
      {
        code: 'SENNHEISER',
        description: 'Sennheiser Electronic',
        is_active: true,
      },
      {
        code: 'BEATS',
        description: 'Beats Electronics',
        is_active: true,
      },
      {
        code: 'SHURE',
        description: 'Shure Incorporated',
        is_active: true,
      },
      {
        code: 'GOOGLE',
        description: 'Google LLC',
        is_active: true,
      },
      {
        code: 'MICROSOFT',
        description: 'Microsoft Corporation',
        is_active: true,
      },
      {
        code: 'XIAOMI',
        description: 'Xiaomi Corporation',
        is_active: true,
      },
      {
        code: 'HUAWEI',
        description: 'Huawei Technologies',
        is_active: true,
      },
      {
        code: 'ONEPLUS',
        description: 'OnePlus Technology',
        is_active: true,
      },
      {
        code: 'OPPO',
        description: 'OPPO Electronics',
        is_active: true,
      },
      {
        code: 'VIVO',
        description: 'Vivo Communication',
        is_active: true,
      },
      {
        code: 'REALME',
        description: 'Realme Mobile',
        is_active: true,
      },
      {
        code: 'NOTHING',
        description: 'Nothing Technology',
        is_active: true,
      },
      {
        code: 'MOTOROLA',
        description: 'Motorola Mobility',
        is_active: true,
      },
      {
        code: 'BLACKBERRY',
        description: 'BlackBerry Limited',
        is_active: true,
      },
      {
        code: 'HTC',
        description: 'HTC Corporation',
        is_active: true,
      },
      {
        code: 'ASUS_ROG',
        description: 'ASUS Republic of Gamers',
        is_active: true,
      },
      {
        code: 'ALIENWARE',
        description: 'Alienware (Dell)',
        is_active: true,
      },
      {
        code: 'PREDATOR',
        description: 'Acer Predator',
        is_active: true,
      },
      {
        code: 'ROG_STRIX',
        description: 'ASUS ROG Strix',
        is_active: true,
      },
      {
        code: 'GAMING',
        description: 'Gaming Brand',
        is_active: true,
      },
      {
        code: 'GENERIC',
        description: 'Marca Genérica',
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
