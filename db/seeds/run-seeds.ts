import { DataSource } from 'typeorm';
import { MeasurementUnitsSeed } from './measurement-units.seed';
import { CategoriesSeed } from './categories.seed';
import { BrandsSeed } from './brands.seed';
import { TaxesSeed } from './taxes.seed';
import { ClientsSeed } from './clients.seed';
import { ProvidersSeed } from './providers.seed';

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

      await ClientsSeed.run(dataSource);
      console.log('✅ Clientes creados');

      await ProvidersSeed.run(dataSource);
      console.log('✅ Proveedores creados');

      console.log('✅ Todos los seeders ejecutados correctamente');
    } catch (error) {
      console.error('❌ Error ejecutando seeders:', error);
      throw error;
    }
  }
}
