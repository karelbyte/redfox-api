import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const dbType = configService.get<string>('APP_DB_PROVIDER', 'mysql');
  const isPostgres = dbType === 'postgres' || dbType === 'pg';
  const prefix = isPostgres ? 'PG_DB_' : 'MYSQL_DB_';

  const host = configService.get<string>(`${prefix}HOST`, 'localhost');
  const port = configService.get<number>(
    `${prefix}PORT`,
    isPostgres ? 5432 : 3306,
  );
  const username = configService.get<string>(
    `${prefix}USER`,
    isPostgres ? 'postgres' : 'root',
  );
  const password = configService.get<string>(
    `${prefix}PASSWORD`,
    isPostgres ? 'postgres' : '',
  );
  const database = configService.get<string>(`${prefix}NAME`, 'redfox-db');

  return {
    type: isPostgres ? 'postgres' : 'mysql',
    host,
    port,
    username,
    password,
    database,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: false,
    migrations: [__dirname + '/../db/migrations/*{.ts,.js}'],
    migrationsRun: true,
    // Pool de conexiones optimizado para concurrencia
    extra: {
      max: 30,                  // máximo de conexiones simultáneas
      min: 5,                   // mínimo siempre activas (warm pool)
      idleTimeoutMillis: 30000, // cerrar conexiones inactivas tras 30s
      connectionTimeoutMillis: 5000, // timeout al obtener conexión del pool
      acquireTimeoutMillis: 10000,   // timeout máximo esperando conexión
    },
    ssl:
      process.env.NODE_ENV === 'production'
        ? {
            rejectUnauthorized: false,
            ca: process.env.PG_CA_CERT ? [process.env.PG_CA_CERT] : undefined,
          }
        : false,
  };
};
