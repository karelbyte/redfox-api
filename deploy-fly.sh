#!/bin/bash

# Script de despliegue para Fly.io
set -e

echo "🚀 Iniciando despliegue en Fly.io..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que flyctl esté instalado
check_flyctl() {
    if ! command -v flyctl &> /dev/null; then
        print_error "flyctl no está instalado. Por favor instala Fly.io CLI:"
        echo "curl -L https://fly.io/install.sh | sh"
        exit 1
    fi
    print_message "flyctl encontrado"
}

# Verificar que estemos logueados en Fly.io
check_auth() {
    if ! flyctl auth whoami &> /dev/null; then
        print_error "No estás autenticado en Fly.io. Ejecuta:"
        echo "flyctl auth login"
        exit 1
    fi
    print_message "Autenticado en Fly.io"
}

# Crear aplicación principal
create_main_app() {
    print_message "Creando aplicación principal..."
    
    if ! flyctl apps list | grep -q "nitro-api"; then
        flyctl apps create nitro-api --org personal
        print_message "Aplicación nitro-api creada"
    else
        print_message "Aplicación nitro-api ya existe"
    fi
}

# Crear aplicación de base de datos
create_db_app() {
    print_message "Creando aplicación de base de datos..."
    
    if ! flyctl apps list | grep -q "nitro-api-db"; then
        flyctl apps create nitro-api-db --org personal
        print_message "Aplicación nitro-api-db creada"
    else
        print_message "Aplicación nitro-api-db ya existe"
    fi
}

# Crear aplicación de Redis
create_redis_app() {
    print_message "Creando aplicación de Redis..."
    
    if ! flyctl apps list | grep -q "nitro-api-redis"; then
        flyctl apps create nitro-api-redis --org personal
        print_message "Aplicación nitro-api-redis creada"
    else
        print_message "Aplicación nitro-api-redis ya existe"
    fi
}

# Crear volúmenes
create_volumes() {
    print_message "Creando volúmenes..."
    
    # Volumen para datos de la aplicación
    if ! flyctl volumes list -a nitro-api | grep -q "nitro_api_data"; then
        flyctl volumes create nitro_api_data --size 1 --region mad
        print_message "Volumen nitro_api_data creado"
    else
        print_message "Volumen nitro_api_data ya existe"
    fi
    
    # Volumen para base de datos
    if ! flyctl volumes list -a nitro-api-db | grep -q "nitro_api_db_data"; then
        flyctl volumes create nitro_api_db_data --size 3 --region mad
        print_message "Volumen nitro_api_db_data creado"
    else
        print_message "Volumen nitro_api_db_data ya existe"
    fi
    
    # Volumen para Redis
    if ! flyctl volumes list -a nitro-api-redis | grep -q "nitro_api_redis_data"; then
        flyctl volumes create nitro_api_redis_data --size 1 --region mad
        print_message "Volumen nitro_api_redis_data creado"
    else
        print_message "Volumen nitro_api_redis_data ya existe"
    fi
}

# Desplegar base de datos
deploy_database() {
    print_message "Desplegando base de datos PostgreSQL..."
    
    # Crear Dockerfile para PostgreSQL
    cat > Dockerfile.postgres << 'EOF'
FROM postgres:15-alpine

ENV POSTGRES_PASSWORD=$POSTGRES_PASSWORD
ENV POSTGRES_USER=$POSTGRES_USER
ENV POSTGRES_DB=$POSTGRES_DB

EXPOSE 5432
EOF
    
    # Desplegar base de datos
    flyctl deploy -a nitro-api-db -c fly-database.toml --dockerfile Dockerfile.postgres
    
    # Limpiar archivo temporal
    rm Dockerfile.postgres
    
    print_message "Base de datos desplegada"
}

# Desplegar Redis
deploy_redis() {
    print_message "Desplegando Redis..."
    
    # Crear Dockerfile para Redis
    cat > Dockerfile.redis << 'EOF'
FROM redis:7-alpine

EXPOSE 6379
EOF
    
    # Desplegar Redis
    flyctl deploy -a nitro-api-redis -c fly-redis.toml --dockerfile Dockerfile.redis
    
    # Limpiar archivo temporal
    rm Dockerfile.redis
    
    print_message "Redis desplegado"
}

# Configurar variables de entorno
setup_secrets() {
    print_message "Configurando variables de entorno..."
    
    # Obtener información de la base de datos
    DB_HOST=$(flyctl ips list -a nitro-api-db --json | jq -r '.[0].address')
    REDIS_HOST=$(flyctl ips list -a nitro-api-redis --json | jq -r '.[0].address')
    
    # Configurar secrets para la aplicación principal
    flyctl secrets set -a nitro-api \
        APP_DB_PROVIDER=postgres \
        PG_DB_HOST=$DB_HOST \
        PG_DB_PORT=5432 \
        PG_DB_USER=nitro_user \
        PG_DB_PASSWORD=nitro_password \
        PG_DB_NAME=nitro_api \
        REDIS_HOST=$REDIS_HOST \
        REDIS_PORT=6379 \
        REDIS_PASSWORD=nitro_redis_password \
        JWT_SECRET=$(openssl rand -base64 32) \
        JWT_EXPIRES_IN=24h \
        NODE_ENV=production
    
    print_message "Variables de entorno configuradas"
}

# Desplegar aplicación principal
deploy_main_app() {
    print_message "Desplegando aplicación principal..."
    
    # Usar el Dockerfile optimizado para Fly.io
    flyctl deploy -a nitro-api -c fly.toml --dockerfile Dockerfile.fly
    
    print_message "Aplicación principal desplegada"
}

# Verificar despliegue
verify_deployment() {
    print_message "Verificando despliegue..."
    
    # Esperar a que la aplicación esté lista
    sleep 30
    
    # Verificar que la aplicación responda
    APP_URL=$(flyctl status -a nitro-api --json | jq -r '.HostStatus.AppURL')
    
    if curl -f "$APP_URL/health" &> /dev/null; then
        print_message "✅ Aplicación desplegada exitosamente en: $APP_URL"
    else
        print_warning "⚠️  La aplicación puede estar iniciando. Verifica manualmente:"
        echo "flyctl status -a nitro-api"
        echo "flyctl logs -a nitro-api"
    fi
}

# Función principal
main() {
    print_message "Iniciando despliegue completo en Fly.io..."
    
    # Verificaciones iniciales
    check_flyctl
    check_auth
    
    # Crear aplicaciones
    create_main_app
    create_db_app
    create_redis_app
    
    # Crear volúmenes
    create_volumes
    
    # Desplegar servicios
    deploy_database
    deploy_redis
    
    # Configurar aplicación principal
    setup_secrets
    deploy_main_app
    
    # Verificar despliegue
    verify_deployment
    
    print_message "🎉 Despliegue completado!"
    print_message "📊 Para ver logs: flyctl logs -a nitro-api"
    print_message "🔧 Para escalar: flyctl scale count 2 -a nitro-api"
}

# Ejecutar función principal
main "$@" 