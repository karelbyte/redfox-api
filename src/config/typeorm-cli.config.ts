import { DataSource } from 'typeorm';
import { join } from 'path';

const provider = process.env.APP_DB_PROVIDER || 'mysql';

const dataSource = new DataSource({
  type: provider === 'mysql' ? 'mysql' : 'postgres',
  host:
    provider === 'mysql' ? process.env.MYSQL_DB_HOST : process.env.PG_DB_HOST,
  port:
    provider === 'mysql'
      ? parseInt(process.env.MYSQL_DB_PORT || '3306', 10)
      : parseInt(process.env.PG_DB_PORT || '5432', 10),
  username:
    provider === 'mysql' ? process.env.MYSQL_DB_USER : process.env.PG_DB_USER,
  password:
    provider === 'mysql'
      ? process.env.MYSQL_DB_PASSWORD
      : process.env.PG_DB_PASSWORD,
  database:
    provider === 'mysql' ? process.env.MYSQL_DB_NAME : process.env.PG_DB_NAME,
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, '..', '..', 'db', 'migrations', '*.{ts,js}')],
  synchronize: false,
});

export default dataSource;
