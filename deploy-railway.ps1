# Script de despliegue para Railway en PowerShell
# Requiere tener Railway CLI instalado: npm install -g @railway/cli

param(
    [switch]$Help
)

if ($Help) {
    Write-Host "Uso: .\deploy-railway.ps1"
    Write-Host "Despliega la aplicación en Railway"
    exit 0
}

Write-Host "🚀 Desplegando aplicación en Railway..." -ForegroundColor Green

# Verificar si Railway CLI está instalado
try {
    $null = Get-Command railway -ErrorAction Stop
} catch {
    Write-Host "❌ Railway CLI no está instalado" -ForegroundColor Red
    Write-Host "Instala Railway CLI con: npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

# Verificar si estamos logueados en Railway
try {
    railway whoami | Out-Null
} catch {
    Write-Host "🔐 Iniciando sesión en Railway..." -ForegroundColor Yellow
    railway login
}

# Verificar si el proyecto está inicializado
if (-not (Test-Path ".railway")) {
    Write-Host "📁 Inicializando proyecto en Railway..." -ForegroundColor Yellow
    railway init
}

# Configurar variables de entorno
Write-Host "🔧 Configurando variables de entorno..." -ForegroundColor Yellow

# Variables de entorno para la aplicación
railway variables set NODE_ENV=production
railway variables set PORT=3000

# Variables de entorno para la base de datos (ajusta según tu configuración)
Write-Host "📝 Configura las siguientes variables de entorno en Railway:" -ForegroundColor Cyan
Write-Host "  - APP_DB_PROVIDER (mysql o postgres)" -ForegroundColor White
Write-Host "  - MYSQL_DB_HOST (si usas MySQL)" -ForegroundColor White
Write-Host "  - MYSQL_DB_PORT (si usas MySQL)" -ForegroundColor White
Write-Host "  - MYSQL_DB_USER (si usas MySQL)" -ForegroundColor White
Write-Host "  - MYSQL_DB_PASSWORD (si usas MySQL)" -ForegroundColor White
Write-Host "  - MYSQL_DB_NAME (si usas MySQL)" -ForegroundColor White
Write-Host "  - PG_DB_HOST (si usas PostgreSQL)" -ForegroundColor White
Write-Host "  - PG_DB_PORT (si usas PostgreSQL)" -ForegroundColor White
Write-Host "  - PG_DB_USER (si usas PostgreSQL)" -ForegroundColor White
Write-Host "  - PG_DB_PASSWORD (si usas PostgreSQL)" -ForegroundColor White
Write-Host "  - PG_DB_NAME (si usas PostgreSQL)" -ForegroundColor White
Write-Host "  - JWT_SECRET" -ForegroundColor White
Write-Host "  - JWT_EXPIRES_IN" -ForegroundColor White

# Desplegar la aplicación
Write-Host "🚀 Desplegando aplicación..." -ForegroundColor Green
railway up

Write-Host "✅ Despliegue completado!" -ForegroundColor Green
Write-Host "🌐 Tu aplicación está disponible en:" -ForegroundColor Cyan
railway status 