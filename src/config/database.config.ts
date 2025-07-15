import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const dbType = configService.get<string>('APP_DB_PROVIDER', 'mysql');
  const isPostgres = dbType === 'postgres' || dbType === 'pg';
  const prefix = isPostgres ? 'PG_DB_' : 'MYSQL_DB_';

  const host = configService.get<string>(`${prefix}HOST`, 'localhost');
  const port = configService.get<number>(`${prefix}PORT`, isPostgres ? 5432 : 3306);
  const username = configService.get<string>(
    `${prefix}USER`,
    isPostgres ? 'postgres' : 'root',
  );
  const password = configService.get<string>(
    `${prefix}PASSWORD`,
    isPostgres ? 'postgres' : '',
  );
  const database = configService.get<string>(`${prefix}NAME`, 'redfox-db');

  console.log('🔧 Configuración de base de datos:');
  console.log(`   Tipo: ${dbType} (isPostgres: ${isPostgres})`);
  console.log(`   Host: ${host}`);
  console.log(`   Puerto: ${port}`);
  console.log(`   Usuario: ${username}`);
  console.log(`   Base de datos: ${database}`);

  return {
    type: isPostgres ? 'postgres' : 'mysql',
    host,
    port,
    username,
    password,
    database,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: configService.get<boolean>('DB_SYNC', false),
    logging: configService.get<boolean>('DB_LOGGING', false),
    migrations: [__dirname + '/../db/migrations/*{.ts,.js}'],
    migrationsRun: true,
  };
};
