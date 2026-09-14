import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository, Not, IsNull } from 'typeorm';
import { Product } from '../models/product.entity';
import { Category } from '../models/category.entity';
import { CompanySettings } from '../models/company-settings.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  IStorageService,
  STORAGE_SERVICE,
} from '../services/storage/storage.interface';
import * as fs from 'fs';
import * as path from 'path';

interface MigrationStats {
  products: { migrated: number; failed: number; skipped: number };
  categories: { migrated: number; failed: number; skipped: number };
  company: { migrated: number; failed: number; skipped: number };
}

async function migrateFiles() {
  console.log('🚀 Iniciando migración de archivos...');

  const app = await NestFactory.createApplicationContext(AppModule);

  const productRepository = app.get<Repository<Product>>(
    getRepositoryToken(Product),
  );
  const categoryRepository = app.get<Repository<Category>>(
    getRepositoryToken(Category),
  );
  const companySettingsRepository = app.get<Repository<CompanySettings>>(
    getRepositoryToken(CompanySettings),
  );
  const storageService = app.get<IStorageService>(STORAGE_SERVICE);

  const stats: MigrationStats = {
    products: { migrated: 0, failed: 0, skipped: 0 },
    categories: { migrated: 0, failed: 0, skipped: 0 },
    company: { migrated: 0, failed: 0, skipped: 0 },
  };

  console.log('📦 Migrando imágenes de productos...');
  const products = await productRepository.find({
    where: { images: Not(IsNull()) },
  });

  for (const product of products) {
    try {
      if (!product.images) continue;

      const images = JSON.parse(product.images) as string[];
      const newImages: string[] = [];

      for (const imageUrl of images) {
        const match = imageUrl.match(/\/api\/uploads\/products\/(.+)$/);
        if (!match) {
          console.warn(`⚠️  URL no reconocida: ${imageUrl}`);
          continue;
        }

        const filename = match[1];
        const oldPath = path.join(
          process.cwd(),
          'uploads',
          'products',
          filename,
        );

        if (!fs.existsSync(oldPath)) {
          console.warn(`⚠️  Archivo no encontrado: ${oldPath}`);
          continue;
        }

        const fileBuffer = fs.readFileSync(oldPath);
        const mimeType = getMimeType(filename);

        const newKey = `${product.organization_id}/products/${product.id}/${Date.now()}-${filename}`;

        const { url } = await storageService.upload(
          fileBuffer,
          newKey,
          mimeType,
        );
        newImages.push(url);

        console.log(`✅ Migrado: ${filename} -> ${newKey}`);
      }

      if (newImages.length > 0) {
        product.images = JSON.stringify(newImages);
        await productRepository.save(product);
        stats.products.migrated++;
      } else {
        stats.products.skipped++;
      }
    } catch (error) {
      console.error(`❌ Error migrando producto ${product.id}:`, error);
      stats.products.failed++;
    }
  }

  console.log('📂 Migrando imágenes de categorías...');
  const categories = await categoryRepository.find({
    where: { image: Not(IsNull()) },
  });

  for (const category of categories) {
    try {
      if (!category.image) continue;

      const match = category.image.match(/\/api\/uploads\/categories\/(.+)$/);
      if (!match) {
        console.warn(`⚠️  URL no reconocida: ${category.image}`);
        continue;
      }

      const filename = match[1];
      const oldPath = path.join(
        process.cwd(),
        'uploads',
        'categories',
        filename,
      );

      if (!fs.existsSync(oldPath)) {
        console.warn(`⚠️  Archivo no encontrado: ${oldPath}`);
        continue;
      }

      const fileBuffer = fs.readFileSync(oldPath);
      const mimeType = getMimeType(filename);

      const newKey = `${category.organization_id}/categories/${category.id}/${Date.now()}-${filename}`;

      const { url } = await storageService.upload(fileBuffer, newKey, mimeType);

      category.image = url;
      await categoryRepository.save(category);

      console.log(`✅ Migrado: ${filename} -> ${newKey}`);
      stats.categories.migrated++;
    } catch (error) {
      console.error(`❌ Error migrando categoría ${category.id}:`, error);
      stats.categories.failed++;
    }
  }

  console.log('🏢 Migrando logos de empresa...');
  const companySettings = await companySettingsRepository.find({
    where: { logoUrl: Not(IsNull()) },
  });

  for (const settings of companySettings) {
    try {
      if (!settings.logoUrl) continue;

      const match = settings.logoUrl.match(
        /\/api\/uploads\/company\/([^\/]+)\/(.+)$/,
      );
      if (!match) {
        console.warn(`⚠️  URL no reconocida: ${settings.logoUrl}`);
        continue;
      }

      const [, orgId, filename] = match;

      if (orgId === settings.organization_id) {
        const oldKey = `company/${orgId}/${filename}`;
        const newKey = `${orgId}/company/${filename}`;

        try {
          const { buffer, contentType } = await storageService.getFile(oldKey);

          const { url } = await storageService.upload(
            buffer,
            newKey,
            contentType,
          );

          settings.logoUrl = url;
          await companySettingsRepository.save(settings);

          await storageService.delete(oldKey);

          console.log(`✅ Migrado: ${oldKey} -> ${newKey}`);
          stats.company.migrated++;
        } catch (error) {
          console.warn(
            `⚠️  No se pudo migrar logo de empresa ${settings.id}:`,
            error,
          );
          stats.company.skipped++;
        }
      } else {
        stats.company.skipped++;
      }
    } catch (error) {
      console.error(`❌ Error migrando logo de empresa ${settings.id}:`, error);
      stats.company.failed++;
    }
  }

  console.log('\n📊 Estadísticas de migración:');
  console.log('Productos:', stats.products);
  console.log('Categorías:', stats.categories);
  console.log('Empresa:', stats.company);

  console.log('\n✅ Migración completada');
  await app.close();
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

if (require.main === module) {
  migrateFiles().catch(console.error);
}

export { migrateFiles };
