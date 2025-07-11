# Script para solucionar problemas de base de datos en Railway

Write-Host "🔧 Solucionando problemas de base de datos en Railway..." -ForegroundColor Green

# Verificar si estamos logueados
try {
    railway whoami | Out-Null
} catch {
    Write-Host "🔐 Iniciando sesión en Railway..." -ForegroundColor Yellow
    railway login
}

# Verificar servicios existentes
Write-Host "🗄️  Verificando servicios existentes..." -ForegroundColor Cyan
$services = railway service list --json | ConvertFrom-Json

$hasDatabase = $false
$databaseService = $null

foreach ($service in $services) {
    if ($service.type -eq "postgresql" -or $service.type -eq "mysql") {
        $hasDatabase = $true
        $databaseService = $service
        Write-Host "✅ Base de datos encontrada: $($service.name) ($($service.type))" -ForegroundColor Green
        break
    }
}

if (-not $hasDatabase) {
    Write-Host "🗄️  Creando servicio de PostgreSQL..." -ForegroundColor Yellow
    railway service create postgresql redfox-db
    
    Write-Host "⏳ Esperando a que la base de datos esté lista..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    
    Write-Host "✅ Base de datos PostgreSQL creada" -ForegroundColor Green
}

# Configurar variables de entorno básicas
Write-Host "🔧 Configurando variables de entorno..." -ForegroundColor Yellow

railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set APP_DB_PROVIDER=postgres
railway variables set JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
railway variables set JWT_EXPIRES_IN="24h"

# Verificar variables de base de datos
Write-Host "🔍 Verificando variables de base de datos..." -ForegroundColor Cyan

$dbVariables = @(
    "PG_DB_HOST",
    "PG_DB_PORT", 
    "PG_DB_USER",
    "PG_DB_PASSWORD",
    "PG_DB_NAME"
)

$missingVariables = @()

foreach ($var in $dbVariables) {
    try {
        $value = railway variables get $var 2>$null
        if ($value) {
            Write-Host "  ✅ $var: $value" -ForegroundColor Green
        } else {
            $missingVariables += $var
            Write-Host "  ❌ $var: NO CONFIGURADA" -ForegroundColor Red
        }
    } catch {
        $missingVariables += $var
        Write-Host "  ❌ $var: NO CONFIGURADA" -ForegroundColor Red
    }
}

if ($missingVariables.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Algunas variables de base de datos no están configuradas" -ForegroundColor Yellow
    Write-Host "   Railway debería configurarlas automáticamente. Si no están disponibles:" -ForegroundColor Yellow
    Write-Host "   1. Ve al dashboard de Railway" -ForegroundColor White
    Write-Host "   2. Selecciona tu servicio de base de datos" -ForegroundColor White
    Write-Host "   3. Ve a la pestaña Variables" -ForegroundColor White
    Write-Host "   4. Copia las variables PG_DB_* a tu servicio de aplicación" -ForegroundColor White
}

# Redesplegar la aplicación
Write-Host ""
Write-Host "🚀 Redesplegando aplicación..." -ForegroundColor Green
railway up

Write-Host ""
Write-Host "✅ Proceso completado!" -ForegroundColor Green
Write-Host "📊 Para ver logs: railway logs" -ForegroundColor Cyan
Write-Host "🌐 Para abrir dashboard: railway open" -ForegroundColor Cyan 