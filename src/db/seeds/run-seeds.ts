import { DataSource } from 'typeorm';
import { MeasurementUnitsSeed } from './measurement-units.seed';
import { CategoriesSeed } from './categories.seed';
import { BrandsSeed } from './brands.seed';
import { TaxesSeed } from './taxes.seed';
import { ClientsSeed } from './clients.seed';
import { ProvidersSeed } from './providers.seed';
import { ProductsSeed } from './products.seed';
import { WarehousesSeed } from './warehouses.seed';
import { CurrenciesSeed } from './currencies.seed';
import { PermissionsSeed } from './permissions.seed';
import { RolesSeed } from './roles.seed';
import { RolePermissionsSeed } from './role-permissions.seed';
import { UsersSeed } from './users.seed';
import { UserLanguagesSeed } from './user-languages.seed';
import { WarehouseAdjustmentsSeed } from './warehouse-adjustments.seed';
import { ReturnsSeed } from './returns.seed';

export class RunSeeds {
  public static async run(dataSource: DataSource): Promise<void> {
    try {
      console.log('Starting seeders...');

      // Execute seeders in order
      await MeasurementUnitsSeed.run(dataSource);
      console.log('✅ Measurement units created');

      await CategoriesSeed.run(dataSource);
      console.log('✅ Categories created');

      await BrandsSeed.run(dataSource);
      console.log('✅ Brands created');

      await TaxesSeed.run(dataSource);
      console.log('✅ Taxes created');

      await CurrenciesSeed.run(dataSource);
      console.log('✅ Currencies created');

      await ClientsSeed.run(dataSource);
      console.log('✅ Clients created');

      await ProvidersSeed.run(dataSource);
      console.log('✅ Providers created');

      await ProductsSeed.run(dataSource);
      console.log('✅ Products created');

      await WarehousesSeed.run(dataSource);
      console.log('✅ Warehouses created');

      // Authentication and permissions seeders
      await PermissionsSeed.run(dataSource);
      console.log('✅ Permissions created');

      await RolesSeed.run(dataSource);
      console.log('✅ Roles created');

      await RolePermissionsSeed.run(dataSource);
      console.log('✅ Permissions assigned to roles');

      await UsersSeed.run(dataSource);
      console.log('✅ Default users created');

      // User languages seeder
      const userLanguagesSeed = new UserLanguagesSeed(dataSource);
      await userLanguagesSeed.run();
      console.log('✅ User languages assigned');

      // Warehouse adjustments seeder
      await WarehouseAdjustmentsSeed.run(dataSource);
      console.log('✅ Warehouse adjustments created');

      // Returns seeder
      await ReturnsSeed.run(dataSource);
      console.log('✅ Returns created');

      console.log('✅ All seeders executed successfully');
    } catch (error) {
      console.error('❌ Error executing seeders:', error);
      throw error;
    }
  }
}
