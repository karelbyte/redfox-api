/**
 * Carga solo el Catálogo 25 de SUNAT, sin tocar el resto de las siembras.
 *
 * Es lo que se ejecuta después de regenerar el CSV con
 * `npm run catalog:sunat:extract`, para no arrastrar las demás siembras —que
 * crean organizaciones, usuarios y datos de demostración— cada vez que SUNAT
 * publica un catálogo nuevo.
 */
import type { DataSource } from 'typeorm';

// Se apaga el registro de consultas antes de cargar el config, que lo lee al
// construirse: son 19.475 filas en lotes de mil, y el volcado del SQL taparía
// el resultado. Por eso el `require` va aquí abajo y no como import: un
// import se evaluaría antes que esta línea.
process.env.TYPEORM_LOGGING = 'false';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dataSource: DataSource =
  require('../../config/typeorm-cli.config').default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { seedSunatProductCodes } = require('./sunat-product-codes.seed');

dataSource
  .initialize()
  .then(async () => {
    console.log('📚 Cargando el Catálogo 25 de SUNAT...');
    const { total } = await seedSunatProductCodes(dataSource);
    console.log(`✅ ${total} códigos de producto cargados`);
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error('❌ Error cargando el catálogo de SUNAT:', error);
    process.exit(1);
  });
