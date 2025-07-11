# Script de despliegue para Fly.io con Fly Postgres (alta disponibilidad)
param(
    [string]$Region = "cdg",
    [string]$Org = "personal"
)

# Configurar codificación para caracteres especiales
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "🚀 Iniciando despliegue en Fly.io con Fly Postgres..." -ForegroundColor Green

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

# Crear aplicación de Fly Postgres
function New-PostgresApp {
    Write-Info "Creando aplicación Fly Postgres..."
    
    $apps = flyctl apps list --json | ConvertFrom-Json
    $appExists = $apps | Where-Object { $_.Name -eq "nitro-api-postgres" }
    
    if (-not $appExists) {
        flyctl apps create nitro-api-postgres --org $Org
        Write-Info "Aplicación nitro-api-postgres creada"
    }
    else {
        Write-Info "Aplicación nitro-api-postgres ya existe"
    }
}

# Crear volúmenes solo para datos de aplicación
function New-Volumes {
    Write-Info "Creando volúmenes para datos de aplicación..."
    
    # Volumen para datos de la aplicación (uploads)
    $volumes = flyctl volumes list -a nitro-api --json | ConvertFrom-Json
    $volumeExists = $volumes | Where-Object { $_.Name -eq "nitro_api_data" }
    
    if (-not $volumeExists) {
        flyctl volumes create nitro_api_data --size 1 --region $Region
        Write-Info "Volumen nitro_api_data creado"
    }
    else {
        Write-Info "Volumen nitro_api_data ya existe"
    }
}

# Desplegar Fly Postgres
function Deploy-Postgres {
    Write-Info "Desplegando Fly Postgres..."
    
    # Crear Fly Postgres nativo
    flyctl postgres create --name nitro-api-postgres --region $Region --org $Org
    
    Write-Info "Fly Postgres creado"
}

# Configurar variables de entorno
function Set-Secrets {
    Write-Info "Configurando variables de entorno..."
    
    # Usar Fly Postgres nativo
    # Conectar la aplicación a Fly Postgres
    flyctl postgres attach --app nitro-api nitro-api-postgres
    
    # Generar JWT secret
    $JWT_SECRET = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    
    # Configurar secrets para la aplicación principal
    flyctl secrets set -a nitro-api @"
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
    Write-Info "Iniciando despliegue completo en Fly.io con Fly Postgres..."
    
    # Verificaciones iniciales
    Test-Flyctl
    Test-FlyAuth
    
    # Crear aplicaciones
    New-MainApp
    New-PostgresApp
    
    # Crear volúmenes (solo para datos de aplicación)
    New-Volumes
    
    # Desplegar servicios
    Deploy-Postgres
    
    # Configurar aplicación principal
    Set-Secrets
    Deploy-MainApp
    
    # Verificar despliegue
    Test-Deployment
    
    Write-Info "🎉 Despliegue completado con alta disponibilidad!"
    Write-Info "📊 Para ver logs: flyctl logs -a nitro-api"
    Write-Info "🔧 Para escalar: flyctl scale count 2 -a nitro-api"
    Write-Info "💾 Backup automático configurado en Fly Postgres"
}

# Ejecutar función principal
Main 