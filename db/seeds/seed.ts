import { RunSeeds } from './run-seeds';
import dataSource from '../../src/config/typeorm-cli.config';

dataSource
  .initialize()
  .then(async () => {
    console.log('Conexión a la base de datos establecida');
    await RunSeeds.run(dataSource);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error durante la inicialización:', error);
    process.exit(1);
  });
