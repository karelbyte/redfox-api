import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const dbType = configService.get<string>('APP_DB_PROVIDER', 'mysql');
  const isPostgres = dbType === 'postgres';
  const prefix = isPostgres ? 'PG_DB_' : 'MYSQL_DB_';

  return {
    type: isPostgres ? 'postgres' : 'mysql',
    host: configService.get<string>(`${prefix}HOST`, 'localhost'),
    port: configService.get<number>(`${prefix}PORT`, isPostgres ? 5432 : 3306),
    username: configService.get<string>(
      `${prefix}USER`,
      isPostgres ? 'postgres' : 'root',
    ),
    password: configService.get<string>(
      `${prefix}PASSWORD`,
      isPostgres ? 'postgres' : '',
    ),
    database: configService.get<string>(`${prefix}NAME`, 'redfox-db'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: configService.get<boolean>('DB_SYNC', false),
    logging: configService.get<boolean>('DB_LOGGING', false),
    migrations: [__dirname + '/../db/migrations/*{.ts,.js}'],
    migrationsRun: true,
  };
};
