#!/bin/sh

# Script de entrada optimizado para Fly.io

set -e

echo "🚀 Iniciando aplicación NestJS en Fly.io..."

# Función para esperar a que la base de datos esté disponible
wait_for_db() {
    echo "⏳ Esperando a que la base de datos esté disponible..."
    
    # Intentar conectar a la base de datos
    while ! node -e "
        const { DataSource } = require('typeorm');
        const dataSource = new DataSource({
            type: process.env.APP_DB_PROVIDER === 'mysql' ? 'mysql' : 'postgres',
            host: process.env.APP_DB_PROVIDER === 'mysql' ? process.env.MYSQL_DB_HOST : process.env.PG_DB_HOST,
            port: process.env.APP_DB_PROVIDER === 'mysql' ? parseInt(process.env.MYSQL_DB_PORT || '3306') : parseInt(process.env.PG_DB_PORT || '5432'),
            username: process.env.APP_DB_PROVIDER === 'mysql' ? process.env.MYSQL_DB_USER : process.env.PG_DB_USER,
            password: process.env.APP_DB_PROVIDER === 'mysql' ? process.env.MYSQL_DB_PASSWORD : process.env.PG_DB_PASSWORD,
            database: process.env.APP_DB_PROVIDER === 'mysql' ? process.env.MYSQL_DB_NAME : process.env.PG_DB_NAME,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });
        
        dataSource.initialize()
            .then(() => {
                console.log('✅ Base de datos conectada');
                dataSource.destroy();
                process.exit(0);
            })
            .catch((error) => {
                console.log('⏳ Esperando conexión a la base de datos...', error.message);
                process.exit(1);
            });
    " 2>/dev/null; do
        sleep 5
    done
    
    echo "✅ Base de datos disponible"
}

# Función para ejecutar migraciones
run_migrations() {
    echo "🔄 Ejecutando migraciones..."
    npm run migration:run
    echo "✅ Migraciones completadas"
}

# Función para ejecutar seeders
run_seeders() {
    echo "🌱 Ejecutando seeders..."
    npm run seed
    echo "✅ Seeders completados"
}

# Función para verificar si las migraciones ya se ejecutaron
check_migrations() {
    echo "🔍 Verificando estado de migraciones..."
    # En Fly.io, siempre ejecutamos las migraciones para asegurar consistencia
    return 1
}

# Función para verificar si los seeders ya se ejecutaron
check_seeders() {
    echo "🔍 Verificando estado de seeders..."
    # En Fly.io, siempre ejecutamos los seeders para asegurar datos iniciales
    return 1
}

# Función principal
main() {
    # En Fly.io, las migraciones y seeders se ejecutan en el release_command
    # del fly.toml, por lo que aquí solo iniciamos la aplicación
    
    echo "🚀 Iniciando aplicación..."
    
    # Ejecutar la aplicación
    exec dumb-init -- node dist/main.js
}

# Ejecutar función principal
main "$@" 