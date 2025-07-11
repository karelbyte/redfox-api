#!/bin/sh

# Script de entrada para Docker que ejecuta migraciones y seeders

set -e

echo "🚀 Iniciando aplicación NestJS..."

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
        });
        
        dataSource.initialize()
            .then(() => {
                console.log('✅ Base de datos conectada');
                dataSource.destroy();
                process.exit(0);
            })
            .catch(() => {
                console.log('⏳ Esperando conexión a la base de datos...');
                process.exit(1);
            });
    " 2>/dev/null; do
        sleep 2
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
    # Aquí podrías agregar lógica para verificar si las migraciones ya se ejecutaron
    # Por ahora, siempre ejecutamos las migraciones
    return 1
}

# Función para verificar si los seeders ya se ejecutaron
check_seeders() {
    echo "🔍 Verificando estado de seeders..."
    # Aquí podrías agregar lógica para verificar si los seeders ya se ejecutaron
    # Por ahora, siempre ejecutamos los seeders
    return 1
}

# Función principal
main() {
    # Esperar a que la base de datos esté disponible
    wait_for_db
    
    # Verificar y ejecutar migraciones si es necesario
    if check_migrations; then
        echo "ℹ️  Las migraciones ya están aplicadas"
    else
        run_migrations
    fi
    
    # Verificar y ejecutar seeders si es necesario
    if check_seeders; then
        echo "ℹ️  Los seeders ya fueron ejecutados"
    else
        run_seeders
    fi
    
    echo "🚀 Iniciando aplicación..."
    
    # Ejecutar la aplicación
    exec dumb-init -- node dist/main.js
}

# Ejecutar función principal
main "$@" 