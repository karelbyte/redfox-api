#!/bin/sh

# Script de entrada para Docker que ejecuta migraciones y seeders - VERSION 2.0

set -e

echo "🚀 Iniciando aplicación NestJS - VERSION 2.0..."
echo "📁 Contenido del directorio actual:"
ls -la
echo "📁 Contenido del directorio scripts:"
ls -la scripts/
echo "🔍 Variables de entorno:"
echo "  NODE_ENV: $NODE_ENV"
echo "  PWD: $PWD"

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
    echo "🔍 NODE_ENV: $NODE_ENV"
    echo "📁 Verificando que scripts/migrate.js existe..."
    
    if [ -f "scripts/migrate.js" ]; then
        echo "✅ scripts/migrate.js encontrado"
        echo "📦 Usando scripts de producción..."
        node scripts/migrate.js migrate
    else
        echo "❌ scripts/migrate.js no encontrado"
        echo "📁 Contenido del directorio scripts:"
        ls -la scripts/
        echo "📁 Contenido del directorio actual:"
        ls -la
        exit 1
    fi
    echo "✅ Migraciones completadas"
}

# Función para ejecutar seeders
run_seeders() {
    echo "🌱 Ejecutando seeders..."
    echo "🔍 NODE_ENV: $NODE_ENV"
    echo "📁 Verificando que scripts/seed.js existe..."
    
    if [ -f "scripts/seed.js" ]; then
        echo "✅ scripts/seed.js encontrado"
        echo "📦 Usando scripts de producción..."
        node scripts/seed.js
    else
        echo "❌ scripts/seed.js no encontrado"
        echo "📁 Contenido del directorio scripts:"
        ls -la scripts/
        echo "📁 Contenido del directorio actual:"
        ls -la
        exit 1
    fi
    echo "✅ Seeders completados"
}

# Función principal
main() {
    # Esperar a que la base de datos esté disponible
    wait_for_db
    
    # Ejecutar migraciones
    run_migrations
    
    # Ejecutar seeders
    run_seeders
    
    echo "🚀 Iniciando aplicación..."
    
    # Ejecutar la aplicación
    exec dumb-init -- node dist/main.js
}

# Ejecutar función principal
main "$@" 