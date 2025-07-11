# Despliegue en Fly.io desde Windows

Esta guía te ayudará a desplegar tu aplicación NestJS en Fly.io desde Windows.

## 🚀 Opciones de Despliegue

### Opción 1: Script PowerShell (Recomendado)
```powershell
# Ejecutar script PowerShell
.\deploy-fly.ps1
```

### Opción 2: Script Batch (Alternativa)
```cmd
# Ejecutar script batch
deploy-fly.bat
```

### Opción 3: Comandos Manuales
```cmd
# Instalar Fly.io CLI
winget install Fly.Flyctl

# Autenticarse
flyctl auth login

# Crear aplicaciones
flyctl apps create nitro-api --org personal
flyctl apps create nitro-api-db --org personal
flyctl apps create nitro-api-redis --org personal
```

## 📋 Requisitos Previos

### 1. Instalar Fly.io CLI
```cmd
# Usando winget (recomendado)
winget install Fly.Flyctl

# O descargar manualmente
# https://fly.io/docs/hands-on/install-flyctl/
```

### 2. Autenticarse en Fly.io
```cmd
flyctl auth login
```

### 3. Verificar Instalación
```cmd
flyctl version
flyctl auth whoami
```

## 🔧 Configuración de PowerShell

### Habilitar Ejecución de Scripts
```powershell
# Abrir PowerShell como Administrador
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Verificar política
Get-ExecutionPolicy
```

### Instalar Módulos Necesarios
```powershell
# Instalar módulo para manejo de JSON
Install-Module -Name PowerShellGet -Force
```

## 🛠️ Comandos Manuales por Pasos

### Paso 1: Crear Aplicaciones
```cmd
# Aplicación principal
flyctl apps create nitro-api --org personal

# Base de datos
flyctl apps create nitro-api-db --org personal

# Redis (opcional)
flyctl apps create nitro-api-redis --org personal
```

### Paso 2: Crear Volúmenes
```cmd
# Volumen para datos de la aplicación
flyctl volumes create nitro_api_data --size 1 --region mad

# Volumen para base de datos
flyctl volumes create nitro_api_db_data --size 3 --region mad

# Volumen para Redis
flyctl volumes create nitro_api_redis_data --size 1 --region mad
```

### Paso 3: Desplegar Base de Datos
```cmd
# Crear Dockerfile temporal
echo FROM postgres:15-alpine > Dockerfile.postgres
echo ENV POSTGRES_PASSWORD=$POSTGRES_PASSWORD >> Dockerfile.postgres
echo ENV POSTGRES_USER=$POSTGRES_USER >> Dockerfile.postgres
echo ENV POSTGRES_DB=$POSTGRES_DB >> Dockerfile.postgres
echo EXPOSE 5432 >> Dockerfile.postgres

# Desplegar
flyctl deploy -a nitro-api-db -c fly-database.toml --dockerfile Dockerfile.postgres

# Limpiar
del Dockerfile.postgres
```

### Paso 4: Desplegar Redis
```cmd
# Crear Dockerfile temporal
echo FROM redis:7-alpine > Dockerfile.redis
echo EXPOSE 6379 >> Dockerfile.redis

# Desplegar
flyctl deploy -a nitro-api-redis -c fly-redis.toml --dockerfile Dockerfile.redis

# Limpiar
del Dockerfile.redis
```

### Paso 5: Configurar Variables de Entorno
```cmd
# Obtener IPs de los servicios
for /f "tokens=*" %%i in ('flyctl ips list -a nitro-api-db --json ^| powershell -Command "ConvertFrom-Json | Select-Object -ExpandProperty address | Select-Object -First 1"') do set DB_HOST=%%i

for /f "tokens=*" %%i in ('flyctl ips list -a nitro-api-redis --json ^| powershell -Command "ConvertFrom-Json | Select-Object -ExpandProperty address | Select-Object -First 1"') do set REDIS_HOST=%%i

# Generar JWT secret
for /f "tokens=*" %%i in ('powershell -Command "[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))"') do set JWT_SECRET=%%i

# Configurar secrets
flyctl secrets set -a nitro-api APP_DB_PROVIDER=postgres PG_DB_HOST=%DB_HOST% PG_DB_PORT=5432 PG_DB_USER=nitro_user PG_DB_PASSWORD=nitro_password PG_DB_NAME=nitro_api REDIS_HOST=%REDIS_HOST% REDIS_PORT=6379 REDIS_PASSWORD=nitro_redis_password JWT_SECRET=%JWT_SECRET% JWT_EXPIRES_IN=24h NODE_ENV=production
```

### Paso 6: Desplegar Aplicación Principal
```cmd
flyctl deploy -a nitro-api -c fly.toml --dockerfile Dockerfile.fly
```

## 🔍 Troubleshooting en Windows

### Problema: PowerShell Execution Policy
```powershell
# Solución: Habilitar ejecución de scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Problema: Codificación de Caracteres
```cmd
# En cmd, usar:
chcp 65001

# En PowerShell, usar:
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

### Problema: flyctl no encontrado
```cmd
# Verificar PATH
echo %PATH%

# Agregar flyctl al PATH manualmente
set PATH=%PATH%;C:\Users\%USERNAME%\AppData\Local\fly\bin
```

### Problema: Error de JSON en PowerShell
```powershell
# Usar ConvertFrom-Json con manejo de errores
try {
    $data = flyctl apps list --json | ConvertFrom-Json
} catch {
    Write-Host "Error procesando JSON: $_"
}
```

## 📊 Comandos de Monitoreo

### Ver Logs
```cmd
# Logs de la aplicación
flyctl logs -a nitro-api

# Logs en tiempo real
flyctl logs -a nitro-api -f

# Logs de base de datos
flyctl logs -a nitro-api-db
```

### Ver Estado
```cmd
# Estado de la aplicación
flyctl status -a nitro-api

# Listar aplicaciones
flyctl apps list

# Ver volúmenes
flyctl volumes list -a nitro-api
```

### Debugging
```cmd
# Acceder a la consola
flyctl ssh console -a nitro-api

# Ejecutar comando específico
flyctl ssh console -a nitro-api -C "npm run migration:run"
```

## 🔧 Configuración de Entorno

### Variables de Entorno en Windows
```cmd
# Establecer variable temporal
set NODE_ENV=production

# Ver variables
set

# En PowerShell
$env:NODE_ENV = "production"
```

### Archivos de Configuración
```cmd
# Crear .env para desarrollo local
echo NODE_ENV=development > .env
echo PORT=3000 >> .env
```

## 🚀 Automatización con GitHub Actions

### Workflow para Windows
```yaml
name: Deploy to Fly.io (Windows)
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Fly.io CLI
        run: |
          winget install Fly.Flyctl
          $env:PATH += ";C:\Users\$env:USERNAME\AppData\Local\fly\bin"
      
      - name: Deploy to Fly.io
        run: |
          flyctl auth token ${{ secrets.FLY_API_TOKEN }}
          .\deploy-fly.ps1
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## 📝 Notas Importantes

### Diferencias con Linux/macOS
1. **Rutas**: Usar `\` en lugar de `/`
2. **Variables**: Usar `%VAR%` en cmd, `$env:VAR` en PowerShell
3. **Codificación**: Configurar UTF-8 para caracteres especiales
4. **Ejecución**: Habilitar políticas de ejecución en PowerShell

### Mejores Prácticas
1. **Usar PowerShell** para scripts complejos
2. **Usar cmd** para comandos simples
3. **Verificar codificación** para caracteres especiales
4. **Manejar errores** apropiadamente
5. **Usar rutas absolutas** cuando sea necesario

## 🎯 Próximos Pasos

1. **Configurar CI/CD** con GitHub Actions
2. **Implementar monitoreo** con herramientas de Windows
3. **Configurar backup automático**
4. **Optimizar rendimiento** para Windows
5. **Configurar alertas** por email/Slack

## 📞 Soporte

### Recursos Útiles
- [Fly.io Windows Documentation](https://fly.io/docs/hands-on/install-flyctl/)
- [PowerShell Documentation](https://docs.microsoft.com/en-us/powershell/)
- [Windows Command Line](https://docs.microsoft.com/en-us/windows/terminal/)

### Comandos de Ayuda
```cmd
# Ayuda de flyctl
flyctl help

# Ayuda de PowerShell
Get-Help about_Execution_Policies

# Verificar instalación
flyctl version
``` 