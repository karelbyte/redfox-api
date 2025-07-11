# Configuración Automática en Railway

Este proyecto está configurado para desplegarse automáticamente en Railway con PostgreSQL incluido.

## 🚀 Despliegue Automático

### Paso 1: Conectar desde GitHub
1. Ve a [railway.app](https://railway.app)
2. Crea una cuenta o inicia sesión
3. Haz clic en **"New Project"**
4. Selecciona **"Deploy from GitHub repo"**
5. Conecta tu repositorio de GitHub
6. Selecciona este repositorio

### Paso 2: Railway detectará automáticamente
Railway detectará automáticamente:
- ✅ El Dockerfile para construir la aplicación
- ✅ La necesidad de PostgreSQL
- ✅ Las variables de entorno necesarias

### Paso 3: Configurar PostgreSQL (Automático)
1. Railway creará automáticamente un servicio de PostgreSQL
2. Las variables de entorno se configurarán automáticamente
3. La aplicación se conectará automáticamente

## 🔧 Configuración Manual (Si es necesario)

Si Railway no detecta automáticamente PostgreSQL:

### Opción 1: Desde el Dashboard
1. En tu proyecto de Railway, ve a **"New Service"**
2. Selecciona **"Database"**
3. Elige **"PostgreSQL"**
4. Railway configurará automáticamente las variables

### Opción 2: Variables de Entorno
En tu servicio de aplicación, configura estas variables:

```env
# Variables de la aplicación
NODE_ENV=production
PORT=3000
APP_DB_PROVIDER=postgres
JWT_SECRET=tu-secret-muy-seguro
JWT_EXPIRES_IN=24h

# Variables de PostgreSQL (Railway las genera automáticamente)
PG_DB_HOST=tu-host-postgres
PG_DB_PORT=5432
PG_DB_USER=tu-usuario
PG_DB_PASSWORD=tu-password
PG_DB_NAME=tu-base-de-datos
```

## 📋 Archivos de Configuración

El proyecto incluye estos archivos para configuración automática:

- `railway.json` - Configuración principal de Railway
- `railway.toml` - Configuración alternativa
- `railway-config.json` - Configuración detallada
- `railway.app.json` - Configuración específica para Railway

## 🎯 Lo que sucede automáticamente

1. **Railway detecta el Dockerfile** ✅
2. **Railway construye la aplicación** ✅
3. **Railway crea PostgreSQL** ✅
4. **Railway configura variables** ✅
5. **Railway ejecuta migraciones** ✅
6. **Railway ejecuta seeders** ✅
7. **Railway inicia la aplicación** ✅

## 🌐 URLs

- **Aplicación**: `https://tu-app.railway.app`
- **Health Check**: `https://tu-app.railway.app/health`
- **API**: `https://tu-app.railway.app/api`

## 📊 Monitoreo

- **Logs**: `railway logs`
- **Estado**: `railway status`
- **Dashboard**: `railway open`

## 🔄 Actualizaciones

- Cada push a la rama principal desplegará automáticamente
- Las migraciones se ejecutarán automáticamente
- Los seeders se ejecutarán automáticamente

## 🛠️ Solución de Problemas

### Si la base de datos no se conecta:
1. Verifica que PostgreSQL esté creado
2. Verifica las variables de entorno
3. Revisa los logs: `railway logs`

### Si las migraciones fallan:
1. Verifica que la base de datos esté disponible
2. Revisa los logs para errores específicos
3. Las migraciones se reintentarán automáticamente

### Si la aplicación no inicia:
1. Verifica el health check: `/health`
2. Revisa los logs: `railway logs`
3. Verifica las variables de entorno

## ✅ Verificación

Después del despliegue, deberías ver en los logs:

```
🚀 Iniciando aplicación NestJS...
⏳ Esperando a que la base de datos esté disponible...
✅ Base de datos conectada exitosamente
🔄 Ejecutando migraciones...
✅ Migraciones completadas
🌱 Ejecutando seeders...
✅ Seeders completados
🚀 Iniciando aplicación...
```

¡Y eso es todo! Railway se encargará de todo automáticamente. 🎉 