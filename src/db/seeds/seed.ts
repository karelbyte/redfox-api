import { RunSeeds } from './run-seeds';
import dataSource from '../../config/typeorm-cli.config';

dataSource
  .initialize()
  .then(async () => {
    console.log('Database connection established');
    await RunSeeds.run(dataSource);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during initialization:', error);
    process.exit(1);
  });
