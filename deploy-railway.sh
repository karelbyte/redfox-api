#!/bin/bash

# Script de despliegue para Railway
# Requiere tener Railway CLI instalado: npm install -g @railway/cli

set -e

echo "🚀 Desplegando aplicación en Railway..."

# Verificar si Railway CLI está instalado
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI no está instalado"
    echo "Instala Railway CLI con: npm install -g @railway/cli"
    exit 1
fi

# Verificar si estamos logueados en Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Iniciando sesión en Railway..."
    railway login
fi

# Verificar si el proyecto está inicializado
if [ ! -f ".railway" ]; then
    echo "📁 Inicializando proyecto en Railway..."
    railway init
fi

# Configurar variables de entorno
echo "🔧 Configurando variables de entorno..."

# Variables de entorno para la aplicación
railway variables set NODE_ENV=production
railway variables set PORT=3000

# Variables de entorno para la base de datos (ajusta según tu configuración)
echo "📝 Configura las siguientes variables de entorno en Railway:"
echo "  - APP_DB_PROVIDER (mysql o postgres)"
echo "  - MYSQL_DB_HOST (si usas MySQL)"
echo "  - MYSQL_DB_PORT (si usas MySQL)"
echo "  - MYSQL_DB_USER (si usas MySQL)"
echo "  - MYSQL_DB_PASSWORD (si usas MySQL)"
echo "  - MYSQL_DB_NAME (si usas MySQL)"
echo "  - PG_DB_HOST (si usas PostgreSQL)"
echo "  - PG_DB_PORT (si usas PostgreSQL)"
echo "  - PG_DB_USER (si usas PostgreSQL)"
echo "  - PG_DB_PASSWORD (si usas PostgreSQL)"
echo "  - PG_DB_NAME (si usas PostgreSQL)"
echo "  - JWT_SECRET"
echo "  - JWT_EXPIRES_IN"

# Desplegar la aplicación
echo "🚀 Desplegando aplicación..."
railway up

echo "✅ Despliegue completado!"
echo "🌐 Tu aplicación está disponible en:"
railway status 