@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🚀 Iniciando despliegue en Fly.io desde Windows...

REM Verificar que flyctl esté instalado
where flyctl >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] flyctl no está instalado. Por favor instala Fly.io CLI:
    echo winget install Fly.Flyctl
    echo O visita: https://fly.io/docs/hands-on/install-flyctl/
    pause
    exit /b 1
)

REM Verificar autenticación
flyctl auth whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No estás autenticado en Fly.io. Ejecuta:
    echo flyctl auth login
    pause
    exit /b 1
)

echo [INFO] Verificaciones completadas

REM Crear aplicaciones
echo [INFO] Creando aplicaciones...

REM Aplicación principal
flyctl apps create nitro-api --org personal 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Aplicación nitro-api creada
) else (
    echo [INFO] Aplicación nitro-api ya existe
)

REM Base de datos
flyctl apps create nitro-api-db --org personal 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Aplicación nitro-api-db creada
) else (
    echo [INFO] Aplicación nitro-api-db ya existe
)

REM Redis
flyctl apps create nitro-api-redis --org personal 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Aplicación nitro-api-redis creada
) else (
    echo [INFO] Aplicación nitro-api-redis ya existe
)

REM Crear volúmenes
echo [INFO] Creando volúmenes...

REM Volumen para datos de la aplicación
flyctl volumes create nitro_api_data --size 1 --region mad 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Volumen nitro_api_data creado
) else (
    echo [INFO] Volumen nitro_api_data ya existe
)

REM Volumen para base de datos
flyctl volumes create nitro_api_db_data --size 3 --region mad 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Volumen nitro_api_db_data creado
) else (
    echo [INFO] Volumen nitro_api_db_data ya existe
)

REM Volumen para Redis
flyctl volumes create nitro_api_redis_data --size 1 --region mad 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Volumen nitro_api_redis_data creado
) else (
    echo [INFO] Volumen nitro_api_redis_data ya existe
)

REM Desplegar base de datos
echo [INFO] Desplegando base de datos PostgreSQL...

REM Crear Dockerfile temporal para PostgreSQL
echo FROM postgres:15-alpine > Dockerfile.postgres
echo. >> Dockerfile.postgres
echo ENV POSTGRES_PASSWORD=$POSTGRES_PASSWORD >> Dockerfile.postgres
echo ENV POSTGRES_USER=$POSTGRES_USER >> Dockerfile.postgres
echo ENV POSTGRES_DB=$POSTGRES_DB >> Dockerfile.postgres
echo. >> Dockerfile.postgres
echo EXPOSE 5432 >> Dockerfile.postgres

flyctl deploy -a nitro-api-db -c fly-database.toml --dockerfile Dockerfile.postgres

REM Limpiar archivo temporal
del Dockerfile.postgres 2>nul

echo [INFO] Base de datos desplegada

REM Desplegar Redis
echo [INFO] Desplegando Redis...

REM Crear Dockerfile temporal para Redis
echo FROM redis:7-alpine > Dockerfile.redis
echo. >> Dockerfile.redis
echo EXPOSE 6379 >> Dockerfile.redis

flyctl deploy -a nitro-api-redis -c fly-redis.toml --dockerfile Dockerfile.redis

REM Limpiar archivo temporal
del Dockerfile.redis 2>nul

echo [INFO] Redis desplegado

REM Configurar variables de entorno
echo [INFO] Configurando variables de entorno...

REM Obtener IPs de los servicios
for /f "tokens=*" %%i in ('flyctl ips list -a nitro-api-db --json ^| powershell -Command "ConvertFrom-Json | Select-Object -ExpandProperty address | Select-Object -First 1"') do set DB_HOST=%%i

for /f "tokens=*" %%i in ('flyctl ips list -a nitro-api-redis --json ^| powershell -Command "ConvertFrom-Json | Select-Object -ExpandProperty address | Select-Object -First 1"') do set REDIS_HOST=%%i

REM Generar JWT secret
for /f "tokens=*" %%i in ('powershell -Command "[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))"') do set JWT_SECRET=%%i

REM Configurar secrets
flyctl secrets set -a nitro-api APP_DB_PROVIDER=postgres PG_DB_HOST=%DB_HOST% PG_DB_PORT=5432 PG_DB_USER=nitro_user PG_DB_PASSWORD=nitro_password PG_DB_NAME=nitro_api REDIS_HOST=%REDIS_HOST% REDIS_PORT=6379 REDIS_PASSWORD=nitro_redis_password JWT_SECRET=%JWT_SECRET% JWT_EXPIRES_IN=24h NODE_ENV=production

echo [INFO] Variables de entorno configuradas

REM Desplegar aplicación principal
echo [INFO] Desplegando aplicación principal...
flyctl deploy -a nitro-api -c fly.toml --dockerfile Dockerfile.fly

echo [INFO] Aplicación principal desplegada

REM Verificar despliegue
echo [INFO] Verificando despliegue...
timeout /t 30 /nobreak >nul

REM Obtener URL de la aplicación
for /f "tokens=*" %%i in ('flyctl status -a nitro-api --json ^| powershell -Command "ConvertFrom-Json | Select-Object -ExpandProperty HostStatus | Select-Object -ExpandProperty AppURL"') do set APP_URL=%%i

echo [INFO] Verificando aplicación en: %APP_URL%/health

REM Verificar que la aplicación responda
powershell -Command "try { $response = Invoke-WebRequest -Uri '%APP_URL%/health' -UseBasicParsing -TimeoutSec 10; if ($response.StatusCode -eq 200) { Write-Host '[INFO] ✅ Aplicación desplegada exitosamente' -ForegroundColor Green } else { Write-Host '[WARNING] ⚠️ La aplicación puede estar iniciando' -ForegroundColor Yellow } } catch { Write-Host '[WARNING] ⚠️ La aplicación puede estar iniciando' -ForegroundColor Yellow }"

echo.
echo 🎉 Despliegue completado!
echo 📊 Para ver logs: flyctl logs -a nitro-api
echo 🔧 Para escalar: flyctl scale count 2 -a nitro-api
echo.
pause 