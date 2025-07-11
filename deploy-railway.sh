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
railway variables set APP_DB_PROVIDER=postgres

# Verificar si ya existe un servicio de base de datos
echo "🔍 Verificando servicios de base de datos..."
SERVICES=$(railway service list --json)

if echo "$SERVICES" | grep -q "postgresql\|mysql"; then
    echo "✅ Base de datos encontrada"
else
    echo "🗄️  Creando servicio de PostgreSQL..."
    railway service create postgresql redfox-db
    
    echo "⏳ Esperando a que la base de datos esté lista..."
    sleep 10
    
    echo "✅ Base de datos PostgreSQL creada automáticamente"
    echo "📝 Railway configurará automáticamente las variables de entorno de la base de datos"
fi

# Variables de entorno adicionales
echo "🔧 Configurando variables adicionales..."
railway variables set JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
railway variables set JWT_EXPIRES_IN="24h"

echo "📝 Variables de entorno configuradas:"
echo "  ✅ NODE_ENV=production"
echo "  ✅ PORT=3000"
echo "  ✅ APP_DB_PROVIDER=postgres"
echo "  ✅ JWT_SECRET (configurado)"
echo "  ✅ JWT_EXPIRES_IN=24h"
echo "  🔄 Variables de base de datos (configuradas automáticamente por Railway)"

# Desplegar la aplicación
echo "🚀 Desplegando aplicación..."
railway up

echo "✅ Despliegue completado!"
echo "🌐 Tu aplicación está disponible en:"
railway status 