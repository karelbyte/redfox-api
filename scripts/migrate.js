#!/usr/bin/env node

const { DataSource } = require('typeorm');
const path = require('path');

// Configuración de la base de datos
const getDatabaseConfig = () => {
  const dbType = process.env.APP_DB_PROVIDER || 'mysql';
  const isPostgres = dbType === 'postgres';
  const prefix = isPostgres ? 'PG_DB_' : 'MYSQL_DB_';

  return {
    type: isPostgres ? 'postgres' : 'mysql',
    host: process.env[`${prefix}HOST`] || 'localhost',
    port: parseInt(process.env[`${prefix}PORT`] || (isPostgres ? '5432' : '3306')),
    username: process.env[`${prefix}USER`] || (isPostgres ? 'postgres' : 'root'),
    password: process.env[`${prefix}PASSWORD`] || (isPostgres ? 'postgres' : ''),
    database: process.env[`${prefix}NAME`] || 'redfox-db',
    entities: [path.join(__dirname, '../dist/**/*.entity{.js}')],
    migrations: [path.join(__dirname, '../dist/db/migrations/*{.js}')],
    migrationsRun: false,
    synchronize: false,
    logging: process.env.NODE_ENV === 'development'
  };
};

// Función para ejecutar migraciones
async function runMigrations() {
  console.log('🔄 Ejecutando migraciones...');
  
  const dataSource = new DataSource(getDatabaseConfig());
  
  try {
    await dataSource.initialize();
    console.log('✅ Base de datos conectada');
    
    const migrations = await dataSource.runMigrations();
    console.log(`✅ ${migrations.length} migraciones ejecutadas`);
    
    await dataSource.destroy();
    console.log('✅ Migraciones completadas');
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error.message);
    process.exit(1);
  }
}

// Función principal
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      await runMigrations();
      break;
    case 'migrate-and-seed':
      await runMigrations();
      // Ejecutar seeder separado
      const { spawn } = require('child_process');
      const seedProcess = spawn('node', ['scripts/seed.js'], { stdio: 'inherit' });
      seedProcess.on('close', (code) => {
        if (code !== 0) {
          process.exit(code);
        }
      });
      break;
    default:
      console.log('Uso: node scripts/migrate.js [migrate|migrate-and-seed]');
      process.exit(1);
  }
}

main().catch(console.error); 