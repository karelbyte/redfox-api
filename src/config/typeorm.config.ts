import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const provider = process.env.APP_DB_PROVIDER || 'mysql';

  const commonConfig = {
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, '..', 'db', 'migrations', '*.{ts,js}')],
    migrationsTableName: 'migrations',
    synchronize: false,
    migrationsRun: true,
    logging: true,
  };

  if (provider === 'mysql') {
    return {
      ...commonConfig,
      type: 'mysql',
      host: process.env.MYSQL_DB_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_DB_PORT || '3306', 10) || 3306,
      username: process.env.MYSQL_DB_USER || 'root',
      password: process.env.MYSQL_DB_PASSWORD || '',
      database: process.env.MYSQL_DB_NAME || 'redfox-db',
    };
  }

  return {
    ...commonConfig,
    type: 'postgres',
    host: process.env.PG_DB_HOST || 'localhost',
    port: parseInt(process.env.PG_DB_PORT || '5432', 10) || 5432,
    username: process.env.PG_DB_USER || 'postgres',
    password: process.env.PG_DB_PASSWORD || 'postgres',
    database: process.env.PG_DB_NAME || 'redfox-db',
  };
};

export const typeOrmConfig: TypeOrmModuleOptions = getDatabaseConfig();
