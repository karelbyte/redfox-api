#!/bin/sh

# Script de entrada para Docker que ejecuta migraciones y seeders

set -e

echo "🚀 Iniciando aplicación NestJS..."

# Función para esperar a que la base de datos esté disponible
wait_for_db() {
    echo "⏳ Esperando a que la base de datos esté disponible..."
    
    # Mostrar información de debug
    echo "🔍 Información de debug:"
    echo "  APP_DB_PROVIDER: ${APP_DB_PROVIDER:-'NO CONFIGURADA'}"
    echo "  PG_DB_HOST: ${PG_DB_HOST:-'NO CONFIGURADA'}"
    echo "  PG_DB_PORT: ${PG_DB_PORT:-'NO CONFIGURADA'}"
    echo "  PG_DB_USER: ${PG_DB_USER:-'NO CONFIGURADA'}"
    echo "  PG_DB_NAME: ${PG_DB_NAME:-'NO CONFIGURADA'}"
    echo "  MYSQL_DB_HOST: ${MYSQL_DB_HOST:-'NO CONFIGURADA'}"
    echo "  MYSQL_DB_PORT: ${MYSQL_DB_PORT:-'NO CONFIGURADA'}"
    echo "  MYSQL_DB_USER: ${MYSQL_DB_USER:-'NO CONFIGURADA'}"
    echo "  MYSQL_DB_NAME: ${MYSQL_DB_NAME:-'NO CONFIGURADA'}"
    
    # Verificar que las variables necesarias estén configuradas
    if [ "$APP_DB_PROVIDER" = "postgres" ]; then
        if [ -z "$PG_DB_HOST" ] || [ -z "$PG_DB_USER" ] || [ -z "$PG_DB_NAME" ]; then
            echo "❌ Error: Variables de PostgreSQL no configuradas correctamente"
            echo "   PG_DB_HOST: $PG_DB_HOST"
            echo "   PG_DB_USER: $PG_DB_USER"
            echo "   PG_DB_NAME: $PG_DB_NAME"
            exit 1
        fi
    elif [ "$APP_DB_PROVIDER" = "mysql" ]; then
        if [ -z "$MYSQL_DB_HOST" ] || [ -z "$MYSQL_DB_USER" ] || [ -z "$MYSQL_DB_NAME" ]; then
            echo "❌ Error: Variables de MySQL no configuradas correctamente"
            echo "   MYSQL_DB_HOST: $MYSQL_DB_HOST"
            echo "   MYSQL_DB_USER: $MYSQL_DB_USER"
            echo "   MYSQL_DB_NAME: $MYSQL_DB_NAME"
            exit 1
        fi
    else
        echo "❌ Error: APP_DB_PROVIDER debe ser 'postgres' o 'mysql', actual: $APP_DB_PROVIDER"
        exit 1
    fi
    
    # Intentar conectar a la base de datos
    local attempts=0
    local max_attempts=30
    
    while [ $attempts -lt $max_attempts ]; do
        echo "🔄 Intento $((attempts + 1))/$max_attempts de conectar a la base de datos..."
        
        if node -e "
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
                    console.log('✅ Base de datos conectada exitosamente');
                    dataSource.destroy();
                    process.exit(0);
                })
                .catch((error) => {
                    console.log('❌ Error conectando a la base de datos:', error.message);
                    process.exit(1);
                });
        " 2>/dev/null; then
            echo "✅ Base de datos disponible"
            return 0
        else
            echo "⏳ Esperando conexión a la base de datos... (intento $((attempts + 1))/$max_attempts)"
            attempts=$((attempts + 1))
            sleep 5
        fi
    done
    
    echo "❌ Error: No se pudo conectar a la base de datos después de $max_attempts intentos"
    exit 1
}

# Función para ejecutar migraciones
run_migrations() {
    echo "🔄 Ejecutando migraciones..."
    if [ "$NODE_ENV" = "production" ]; then
        npm run migration:run:prod
    else
        npm run migration:run
    fi
    echo "✅ Migraciones completadas"
}

# Función para ejecutar seeders
run_seeders() {
    echo "🌱 Ejecutando seeders..."
    if [ "$NODE_ENV" = "production" ]; then
        npm run seed:prod
    else
        npm run seed
    fi
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