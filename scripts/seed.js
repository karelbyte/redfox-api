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

// Función para ejecutar seeders
async function runSeeders() {
  console.log('🌱 Ejecutando seeders...');
  
  const dataSource = new DataSource(getDatabaseConfig());
  
  try {
    await dataSource.initialize();
    console.log('✅ Base de datos conectada');
    
    // Importar y ejecutar el seeder principal
    const { RunSeeds } = require('../dist/db/seeds/run-seeds');
    await RunSeeds.run(dataSource);
    
    await dataSource.destroy();
    console.log('✅ Seeders completados');
  } catch (error) {
    console.error('❌ Error ejecutando seeders:', error.message);
    process.exit(1);
  }
}

// Función principal
async function main() {
  await runSeeders();
}

main().catch(console.error); 