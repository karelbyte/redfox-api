#!/bin/bash

# Script de debug para Railway - verificar variables de entorno

echo "🔍 Debug: Verificando variables de entorno en Railway..."

echo "📋 Variables de entorno disponibles:"
railway variables list

echo ""
echo "🗄️  Servicios disponibles:"
railway service list

echo ""
echo "🔧 Variables específicas de base de datos:"
echo "APP_DB_PROVIDER: $(railway variables get APP_DB_PROVIDER 2>/dev/null || echo 'NO CONFIGURADA')"
echo "PG_DB_HOST: $(railway variables get PG_DB_HOST 2>/dev/null || echo 'NO CONFIGURADA')"
echo "PG_DB_PORT: $(railway variables get PG_DB_PORT 2>/dev/null || echo 'NO CONFIGURADA')"
echo "PG_DB_USER: $(railway variables get PG_DB_USER 2>/dev/null || echo 'NO CONFIGURADA')"
echo "PG_DB_NAME: $(railway variables get PG_DB_NAME 2>/dev/null || echo 'NO CONFIGURADA')"

echo ""
echo "📊 Logs recientes:"
railway logs --tail 20 