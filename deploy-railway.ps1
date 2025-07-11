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
railway variables set APP_DB_PROVIDER=postgres

# Verificar si ya existe un servicio de base de datos
Write-Host "🔍 Verificando servicios de base de datos..." -ForegroundColor Yellow
$services = railway service list --json | ConvertFrom-Json

$hasDatabase = $false
foreach ($service in $services) {
    if ($service.type -eq "postgresql" -or $service.type -eq "mysql") {
        $hasDatabase = $true
        Write-Host "✅ Base de datos encontrada: $($service.name)" -ForegroundColor Green
        break
    }
}

if (-not $hasDatabase) {
    Write-Host "🗄️  Creando servicio de PostgreSQL..." -ForegroundColor Yellow
    railway service create postgresql redfox-db
    
    Write-Host "⏳ Esperando a que la base de datos esté lista..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    Write-Host "✅ Base de datos PostgreSQL creada automáticamente" -ForegroundColor Green
    Write-Host "📝 Railway configurará automáticamente las variables de entorno de la base de datos" -ForegroundColor Cyan
}

# Variables de entorno adicionales
Write-Host "🔧 Configurando variables adicionales..." -ForegroundColor Yellow
railway variables set JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
railway variables set JWT_EXPIRES_IN="24h"

Write-Host "📝 Variables de entorno configuradas:" -ForegroundColor Cyan
Write-Host "  ✅ NODE_ENV=production" -ForegroundColor Green
Write-Host "  ✅ PORT=3000" -ForegroundColor Green
Write-Host "  ✅ APP_DB_PROVIDER=postgres" -ForegroundColor Green
Write-Host "  ✅ JWT_SECRET (configurado)" -ForegroundColor Green
Write-Host "  ✅ JWT_EXPIRES_IN=24h" -ForegroundColor Green
Write-Host "  🔄 Variables de base de datos (configuradas automáticamente por Railway)" -ForegroundColor Yellow

# Desplegar la aplicación
Write-Host "🚀 Desplegando aplicación..." -ForegroundColor Green
railway up

Write-Host "✅ Despliegue completado!" -ForegroundColor Green
Write-Host "🌐 Tu aplicación está disponible en:" -ForegroundColor Cyan
railway status 