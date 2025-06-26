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
import { LanguagesSeed } from './languages.seed';
import { UserLanguagesSeed } from './user-languages.seed';

export class RunSeeds {
  public static async run(dataSource: DataSource): Promise<void> {
    try {
      console.log('Iniciando seeders...');

      // Ejecutar seeders en orden
      await MeasurementUnitsSeed.run(dataSource);
      console.log('✅ Unidades de medida creadas');

      await CategoriesSeed.run(dataSource);
      console.log('✅ Categorías creadas');

      await BrandsSeed.run(dataSource);
      console.log('✅ Marcas creadas');

      await TaxesSeed.run(dataSource);
      console.log('✅ Impuestos creados');

      await CurrenciesSeed.run(dataSource);
      console.log('✅ Monedas creadas');

      await ClientsSeed.run(dataSource);
      console.log('✅ Clientes creados');

      await ProvidersSeed.run(dataSource);
      console.log('✅ Proveedores creados');

      await ProductsSeed.run(dataSource);
      console.log('✅ Productos creados');

      await WarehousesSeed.run(dataSource);
      console.log('✅ Almacenes creados');

      // Seeders de autenticación y permisos
      await PermissionsSeed.run(dataSource);
      console.log('✅ Permisos creados');

      await RolesSeed.run(dataSource);
      console.log('✅ Roles creados');

      await RolePermissionsSeed.run(dataSource);
      console.log('✅ Permisos asignados a roles');

      await UsersSeed.run(dataSource);
      console.log('✅ Usuarios por defecto creados');

      // Seeder de idiomas
      await LanguagesSeed.run(dataSource);
      console.log('✅ Idiomas creados');

      // Seeder de idiomas de usuario
      const userLanguagesSeed = new UserLanguagesSeed(dataSource);
      await userLanguagesSeed.run();
      console.log('✅ Idiomas de usuario asignados');

      console.log('✅ Todos los seeders ejecutados correctamente');
    } catch (error) {
      console.error('❌ Error ejecutando seeders:', error);
      throw error;
    }
  }
}
