# Script de despliegue para Fly.io en Windows PowerShell
param(
    [string]$Region = "mad",
    [string]$Org = "personal"
)

# Configurar codificación para caracteres especiales
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "🚀 Iniciando despliegue en Fly.io desde Windows..." -ForegroundColor Green

# Función para imprimir mensajes
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Verificar que flyctl esté instalado
function Test-Flyctl {
    try {
        $null = Get-Command flyctl -ErrorAction Stop
        Write-Info "flyctl encontrado"
    }
    catch {
        Write-Error "flyctl no está instalado. Por favor instala Fly.io CLI:"
        Write-Host "winget install Fly.Flyctl" -ForegroundColor Cyan
        Write-Host "O visita: https://fly.io/docs/hands-on/install-flyctl/" -ForegroundColor Cyan
        exit 1
    }
}

# Verificar que estemos logueados en Fly.io
function Test-FlyAuth {
    try {
        $null = flyctl auth whoami 2>$null
        Write-Info "Autenticado en Fly.io"
    }
    catch {
        Write-Error "No estás autenticado en Fly.io. Ejecuta:"
        Write-Host "flyctl auth login" -ForegroundColor Cyan
        exit 1
    }
}

# Crear aplicación principal
function New-MainApp {
    Write-Info "Creando aplicación principal..."
    
    $apps = flyctl apps list --json | ConvertFrom-Json
    $appExists = $apps | Where-Object { $_.Name -eq "nitro-api" }
    
    if (-not $appExists) {
        flyctl apps create nitro-api --org $Org
        Write-Info "Aplicación nitro-api creada"
    }
    else {
        Write-Info "Aplicación nitro-api ya existe"
    }
}

# Crear aplicación de base de datos
function New-DatabaseApp {
    Write-Info "Creando aplicación de base de datos..."
    
    $apps = flyctl apps list --json | ConvertFrom-Json
    $appExists = $apps | Where-Object { $_.Name -eq "nitro-api-db" }
    
    if (-not $appExists) {
        flyctl apps create nitro-api-db --org $Org
        Write-Info "Aplicación nitro-api-db creada"
    }
    else {
        Write-Info "Aplicación nitro-api-db ya existe"
    }
}

# Crear aplicación de Redis
function New-RedisApp {
    Write-Info "Creando aplicación de Redis..."
    
    $apps = flyctl apps list --json | ConvertFrom-Json
    $appExists = $apps | Where-Object { $_.Name -eq "nitro-api-redis" }
    
    if (-not $appExists) {
        flyctl apps create nitro-api-redis --org $Org
        Write-Info "Aplicación nitro-api-redis creada"
    }
    else {
        Write-Info "Aplicación nitro-api-redis ya existe"
    }
}

# Crear volúmenes
function New-Volumes {
    Write-Info "Creando volúmenes..."
    
    # Volumen para datos de la aplicación
    $volumes = flyctl volumes list -a nitro-api --json | ConvertFrom-Json
    $volumeExists = $volumes | Where-Object { $_.Name -eq "nitro_api_data" }
    
    if (-not $volumeExists) {
        flyctl volumes create nitro_api_data --size 1 --region $Region
        Write-Info "Volumen nitro_api_data creado"
    }
    else {
        Write-Info "Volumen nitro_api_data ya existe"
    }
    
    # Volumen para base de datos
    $volumes = flyctl volumes list -a nitro-api-db --json | ConvertFrom-Json
    $volumeExists = $volumes | Where-Object { $_.Name -eq "nitro_api_db_data" }
    
    if (-not $volumeExists) {
        flyctl volumes create nitro_api_db_data --size 3 --region $Region
        Write-Info "Volumen nitro_api_db_data creado"
    }
    else {
        Write-Info "Volumen nitro_api_db_data ya existe"
    }
    
    # Volumen para Redis
    $volumes = flyctl volumes list -a nitro-api-redis --json | ConvertFrom-Json
    $volumeExists = $volumes | Where-Object { $_.Name -eq "nitro_api_redis_data" }
    
    if (-not $volumeExists) {
        flyctl volumes create nitro_api_redis_data --size 1 --region $Region
        Write-Info "Volumen nitro_api_redis_data creado"
    }
    else {
        Write-Info "Volumen nitro_api_redis_data ya existe"
    }
}

# Desplegar base de datos
function Deploy-Database {
    Write-Info "Desplegando base de datos PostgreSQL..."
    
    # Crear Dockerfile para PostgreSQL
    @"
FROM postgres:15-alpine

ENV POSTGRES_PASSWORD=`$POSTGRES_PASSWORD
ENV POSTGRES_USER=`$POSTGRES_USER
ENV POSTGRES_DB=`$POSTGRES_DB

EXPOSE 5432
"@ | Out-File -FilePath "Dockerfile.postgres" -Encoding UTF8
    
    # Desplegar base de datos
    flyctl deploy -a nitro-api-db -c fly-database.toml --dockerfile Dockerfile.postgres
    
    # Limpiar archivo temporal
    Remove-Item "Dockerfile.postgres" -ErrorAction SilentlyContinue
    
    Write-Info "Base de datos desplegada"
}

# Desplegar Redis
function Deploy-Redis {
    Write-Info "Desplegando Redis..."
    
    # Crear Dockerfile para Redis
    @"
FROM redis:7-alpine

EXPOSE 6379
"@ | Out-File -FilePath "Dockerfile.redis" -Encoding UTF8
    
    # Desplegar Redis
    flyctl deploy -a nitro-api-redis -c fly-redis.toml --dockerfile Dockerfile.redis
    
    # Limpiar archivo temporal
    Remove-Item "Dockerfile.redis" -ErrorAction SilentlyContinue
    
    Write-Info "Redis desplegado"
}

# Configurar variables de entorno
function Set-Secrets {
    Write-Info "Configurando variables de entorno..."
    
    # Obtener información de la base de datos
    $dbIps = flyctl ips list -a nitro-api-db --json | ConvertFrom-Json
    $DB_HOST = $dbIps[0].address
    
    $redisIps = flyctl ips list -a nitro-api-redis --json | ConvertFrom-Json
    $REDIS_HOST = $redisIps[0].address
    
    # Generar JWT secret
    $JWT_SECRET = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    
    # Configurar secrets para la aplicación principal
    flyctl secrets set -a nitro-api @"
APP_DB_PROVIDER=postgres
PG_DB_HOST=$DB_HOST
PG_DB_PORT=5432
PG_DB_USER=nitro_user
PG_DB_PASSWORD=nitro_password
PG_DB_NAME=nitro_api
REDIS_HOST=$REDIS_HOST
REDIS_PORT=6379
REDIS_PASSWORD=nitro_redis_password
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
NODE_ENV=production
"@
    
    Write-Info "Variables de entorno configuradas"
}

# Desplegar aplicación principal
function Deploy-MainApp {
    Write-Info "Desplegando aplicación principal..."
    
    # Usar el Dockerfile optimizado para Fly.io
    flyctl deploy -a nitro-api -c fly.toml --dockerfile Dockerfile.fly
    
    Write-Info "Aplicación principal desplegada"
}

# Verificar despliegue
function Test-Deployment {
    Write-Info "Verificando despliegue..."
    
    # Esperar a que la aplicación esté lista
    Start-Sleep -Seconds 30
    
    # Verificar que la aplicación responda
    $status = flyctl status -a nitro-api --json | ConvertFrom-Json
    $APP_URL = $status.HostStatus.AppURL
    
    try {
        $response = Invoke-WebRequest -Uri "$APP_URL/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Info "✅ Aplicación desplegada exitosamente en: $APP_URL"
        }
        else {
            Write-Warning "⚠️  La aplicación puede estar iniciando. Verifica manualmente:"
            Write-Host "flyctl status -a nitro-api" -ForegroundColor Cyan
            Write-Host "flyctl logs -a nitro-api" -ForegroundColor Cyan
        }
    }
    catch {
        Write-Warning "⚠️  La aplicación puede estar iniciando. Verifica manualmente:"
        Write-Host "flyctl status -a nitro-api" -ForegroundColor Cyan
        Write-Host "flyctl logs -a nitro-api" -ForegroundColor Cyan
    }
}

# Función principal
function Main {
    Write-Info "Iniciando despliegue completo en Fly.io desde Windows..."
    
    # Verificaciones iniciales
    Test-Flyctl
    Test-FlyAuth
    
    # Crear aplicaciones
    New-MainApp
    New-DatabaseApp
    New-RedisApp
    
    # Crear volúmenes
    New-Volumes
    
    # Desplegar servicios
    Deploy-Database
    Deploy-Redis
    
    # Configurar aplicación principal
    Set-Secrets
    Deploy-MainApp
    
    # Verificar despliegue
    Test-Deployment
    
    Write-Info "🎉 Despliegue completado!"
    Write-Info "📊 Para ver logs: flyctl logs -a nitro-api"
    Write-Info "🔧 Para escalar: flyctl scale count 2 -a nitro-api"
}

# Ejecutar función principal
Main 