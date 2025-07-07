import { PermissionsSeed } from './permissions.seed';
import dataSource from '../../src/config/typeorm-cli.config';

dataSource
  .initialize()
  .then(async () => {
    console.log('Database connection established');
    console.log('🔐 Running permissions seeder only...');
    await PermissionsSeed.run(dataSource);
    console.log('✅ Permissions seeder completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error during permissions seeder:', error);
    process.exit(1);
  });
