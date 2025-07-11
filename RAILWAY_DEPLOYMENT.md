# Despliegue en Railway

Railway es una plataforma de despliegue muy sencilla que permite desplegar aplicaciones rápidamente con integración automática de bases de datos.

## 📋 Prerrequisitos

1. **Cuenta en Railway**: Regístrate en [railway.app](https://railway.app)
2. **Railway CLI**: Instala el CLI de Railway
   ```bash
   npm install -g @railway/cli
   ```
3. **Git**: Asegúrate de que tu código esté en un repositorio Git

## 🚀 Despliegue Automático

### Opción 1: Despliegue desde GitHub (Recomendado)

1. **Conecta tu repositorio**:
   - Ve a [railway.app](https://railway.app)
   - Crea un nuevo proyecto
   - Selecciona "Deploy from GitHub repo"
   - Conecta tu repositorio de GitHub

2. **Railway detectará automáticamente**:
   - ✅ El Dockerfile para construir la aplicación
   - ✅ La necesidad de una base de datos PostgreSQL
   - ✅ Las variables de entorno necesarias

3. **Configuración automática**:
   - Railway creará automáticamente un servicio de PostgreSQL
   - Las variables de entorno de la base de datos se configurarán automáticamente
   - Solo necesitas configurar variables adicionales:

   ```env
   # Variables adicionales (opcionales)
   JWT_SECRET=tu-secret-muy-seguro
   JWT_EXPIRES_IN=24h
   ```

4. **Despliega**:
   - Railway detectará automáticamente el Dockerfile
   - El despliegue comenzará automáticamente
   - Las migraciones y seeders se ejecutarán automáticamente

### Opción 2: Despliegue Manual con CLI

1. **Inicializa el proyecto**:
   ```bash
   # En Windows (PowerShell)
   .\deploy-railway.ps1
   
   # En Linux/Mac
   ./deploy-railway.sh
   ```

2. **Configura las variables de entorno manualmente**:
   ```bash
   railway variables set NODE_ENV=production
   railway variables set PORT=3000
   railway variables set APP_DB_PROVIDER=postgres
   # ... configura las demás variables
   ```

3. **Despliega**:
   ```bash
   railway up
   ```

## 🔧 Configuración de Base de Datos

### Detección Automática de Base de Datos

Railway detectará automáticamente que tu aplicación necesita una base de datos PostgreSQL basándose en:

1. **Archivos de configuración**:
   - `railway.json` - Especifica `APP_DB_PROVIDER=postgres`
   - `railway.toml` - Incluye configuración de servicios de base de datos
   - `railway-config.json` - Define explícitamente el servicio PostgreSQL

2. **Scripts de despliegue**:
   - Los scripts `deploy-railway.sh` y `deploy-railway.ps1` crean automáticamente el servicio PostgreSQL
   - Verifican si ya existe una base de datos antes de crear una nueva

### PostgreSQL (Recomendado)

Railway ofrece PostgreSQL como servicio integrado:

1. **Creación automática**:
   - Los scripts de despliegue crean automáticamente el servicio PostgreSQL
   - Railway detecta la necesidad basándose en la configuración

2. **Variables automáticas**:
   - Railway generará automáticamente las variables de entorno
   - Las variables tendrán el formato: `PG_DB_HOST`, `PG_DB_USER`, etc.

### MySQL (Alternativa)

Si prefieres MySQL:

1. **Modifica la configuración**:
   - Cambia `APP_DB_PROVIDER` a `mysql` en las variables de entorno
   - Modifica los scripts para crear un servicio MySQL en lugar de PostgreSQL

2. **Configura las variables**:
   - Usa las variables `MYSQL_DB_*` generadas por Railway

## 📊 Monitoreo y Logs

### Ver logs en tiempo real:
```bash
railway logs
```

### Ver estado del servicio:
```bash
railway status
```

### Abrir el dashboard:
```bash
railway open
```

## 🔄 Actualizaciones

### Despliegue automático:
- Railway se conecta automáticamente a tu repositorio de GitHub
- Cada push a la rama principal desplegará automáticamente

### Despliegue manual:
```bash
railway up
```

## 🛠️ Solución de Problemas

### Error de permisos en Dockerfile:
- Railway usa el Dockerfile que ya configuramos
- Si hay problemas, verifica que el archivo `docker-entrypoint.sh` existe

### Error de conexión a la base de datos:
- Verifica que las variables de entorno estén configuradas correctamente
- Asegúrate de que el servicio de base de datos esté activo

### Error de migraciones:
- Las migraciones se ejecutan automáticamente al iniciar
- Revisa los logs para ver si hay errores específicos

### Health check fallando:
- El endpoint `/health` debe responder correctamente
- Verifica que la aplicación esté iniciando correctamente

## 🌐 URLs y Dominios

Railway asigna automáticamente un dominio a tu aplicación:
- Formato: `https://tu-app.railway.app`
- Puedes configurar un dominio personalizado en la configuración del proyecto

## 💰 Costos

Railway tiene un plan gratuito generoso:
- **Gratuito**: $5 de crédito mensual
- **Pro**: $20/mes para más recursos
- **Team**: $20/mes por usuario

## 🔐 Seguridad

### Variables de entorno:
- Railway encripta automáticamente las variables de entorno
- No incluyas secretos en el código

### HTTPS:
- Railway proporciona HTTPS automáticamente
- No necesitas configuración adicional

## 📈 Escalabilidad

Railway permite escalar fácilmente:
- **Vertical**: Aumentar recursos de CPU/memoria
- **Horizontal**: Agregar más instancias
- **Auto-scaling**: Configurar escalado automático

## 🆚 Comparación con Fly.io

| Característica | Railway | Fly.io |
|----------------|---------|--------|
| Facilidad de uso | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Integración de BD | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Costo | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Control | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Documentación | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

**Railway es ideal para**:
- Despliegues rápidos
- Equipos pequeños
- Aplicaciones que necesitan base de datos integrada
- Menos configuración manual

**Fly.io es ideal para**:
- Más control sobre la infraestructura
- Aplicaciones complejas
- Equipos con experiencia en DevOps 