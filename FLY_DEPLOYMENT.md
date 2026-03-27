# Guía de Despliegue en Fly.io - NitroCore API

Esta guía describe cómo desplegar la aplicación NestJS en Fly.io con base de datos PostgreSQL.

## 📋 Requisitos Previos

- Cuenta en [Fly.io](https://fly.io)
- CLI de Fly.io instalado: `curl -L https://fly.io/install.sh | sh`
- Git instalado
- Node.js 22+ instalado localmente

## 🚀 Instalación de Fly CLI

### En Windows (PowerShell)
```powershell
# Descargar e instalar
iwr https://fly.io/install.ps1 -useb | iex
```

### En macOS/Linux
```bash
# Descargar e instalar
curl -L https://fly.io/install.sh | sh

# Agregar a PATH
export PATH="$HOME/.fly/bin:$PATH"
```

### Verificar instalación
```bash
fly version
```

## 🔑 Autenticación

```bash
# Iniciar sesión en Fly.io
fly auth login

# Verificar que estés autenticado
fly auth whoami
```

## 📦 Preparación del Proyecto

### 1. Verificar configuración de Fly.io

El archivo `fly.toml` ya está configurado con:
- App name: `nitrocore`
- Region: `mex` (México)
- Base de datos: PostgreSQL
- Migraciones automáticas en el deploy

### 2. Crear archivo de secretos

```bash
# Crear archivo .env.production.local (no commitear)
cat > .env.production.local << EOF
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=https://nitrocore-front.fly.dev
APP_KEY=tu-clave-secreta-muy-segura-cambiar-esto

# Database
APP_DB_PROVIDER=postgres
PG_DB_HOST=nitrocore-db.internal
PG_DB_PORT=5432
PG_DB_USER=postgres
PG_DB_PASSWORD=tu-contraseña-segura-aqui
PG_DB_NAME=redfox_db

# Email
EMAIL_FROM=noreply@nitro.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-app-gmail

# FacturaAPI
FACTURAPI_API_KEY=sk_test_tu_api_key_aqui

# Frontend
FRONTEND_URL=https://nitrocore-front.fly.dev
DEFAULT_ROLE_ID_FOR_USER_REGISTER=ADMIN
EOF
```

## 🗄️ Crear Base de Datos PostgreSQL

### Opción 1: Crear base de datos en Fly.io (Recomendado)

```bash
# Crear aplicación PostgreSQL
fly postgres create --name nitrocore-db --region mex

# Esto creará:
# - Una instancia PostgreSQL
# - Credenciales automáticas
# - Conexión interna entre apps
```

### Opción 2: Usar base de datos externa

Si prefieres usar una base de datos externa (AWS RDS, Azure Database, etc.):

```bash
# Actualizar PG_DB_HOST en las variables de entorno
fly secrets set PG_DB_HOST=tu-host-externo.rds.amazonaws.com
```

## 🚀 Desplegar la Aplicación

### 1. Crear la aplicación en Fly.io

```bash
# Desde el directorio redfox-api
cd redfox-api

# Crear la aplicación (si no existe)
fly launch --name nitrocore --region mex --no-deploy

# Esto creará la app pero no la desplegará aún
```

### 2. Configurar variables de entorno

```bash
# Establecer secretos (variables sensibles)
fly secrets set \
  NODE_ENV=production \
  APP_KEY=tu-clave-secreta-muy-segura \
  PG_DB_PASSWORD=tu-contraseña-segura \
  SMTP_PASS=tu-contraseña-app-gmail \
  FACTURAPI_API_KEY=sk_test_tu_api_key

# Establecer variables públicas
fly config set env.CORS_ORIGIN=https://nitrocore-front.fly.dev
fly config set env.FRONTEND_URL=https://nitrocore-front.fly.dev
fly config set env.EMAIL_FROM=noreply@nitro.com
```

### 3. Conectar base de datos

```bash
# Si creaste la BD en Fly.io, obtener la cadena de conexión
fly postgres connect --app nitrocore-db

# Esto te mostrará las credenciales
# Copiar y establecer como secreto
fly secrets set PG_DB_HOST=nitrocore-db.internal
```

### 4. Desplegar

```bash
# Desplegar la aplicación
fly deploy

# Ver logs en tiempo real
fly logs

# Verificar estado
fly status
```

## ✅ Verificar Despliegue

```bash
# Ver información de la app
fly info

# Ver logs
fly logs

# Acceder a la aplicación
fly open

# Probar endpoint
curl nitrocore.up.railway.app/health
```

## 🔄 Migraciones y Seeders

Las migraciones se ejecutan automáticamente en cada deploy gracias a:

```toml
[deploy]
  release_command = "npm run migration:run"
```

### Ejecutar migraciones manualmente

```bash
# Conectar a la app y ejecutar migraciones
fly ssh console --app nitrocore
npm run migration:run
exit
```

### Ver estado de migraciones

```bash
# Conectar a la base de datos
fly postgres connect --app nitrocore-db

# Ver migraciones ejecutadas
SELECT * FROM typeorm_metadata WHERE type = 'migration';
```

## 📊 Monitoreo y Logs

### Ver logs en tiempo real

```bash
# Logs de la aplicación
fly logs

# Logs de una máquina específica
fly logs --instance <instance-id>

# Logs de las últimas 24 horas
fly logs --since 24h
```

### Métricas

```bash
# Ver estado de máquinas
fly machines list

# Ver uso de recursos
fly status

# Ver historial de deploys
fly releases
```

## 🔧 Actualizar Aplicación

### Después de hacer cambios en el código

```bash
# Desde el directorio redfox-api
cd redfox-api

# Hacer cambios en el código
# ...

# Commitear cambios
git add .
git commit -m "Descripción de cambios"

# Desplegar
fly deploy

# Ver logs del nuevo deploy
fly logs
```

## 🔐 Gestionar Secretos

### Ver secretos

```bash
# Listar todos los secretos
fly secrets list
```

### Actualizar secretos

```bash
# Actualizar un secreto
fly secrets set VARIABLE_NAME=nuevo_valor

# Actualizar múltiples secretos
fly secrets set VAR1=valor1 VAR2=valor2
```

### Eliminar secretos

```bash
# Eliminar un secreto
fly secrets unset VARIABLE_NAME
```

## 🗄️ Gestionar Base de Datos

### Conectar a PostgreSQL

```bash
# Conectar a la base de datos
fly postgres connect --app nitrocore-db

# Comandos útiles en psql
\dt                    # Ver tablas
\d tabla_name          # Ver estructura de tabla
SELECT * FROM users;   # Consultar datos
\q                     # Salir
```

### Backup de base de datos

```bash
# Crear backup
fly postgres backup create --app nitrocore-db

# Ver backups
fly postgres backups list --app nitrocore-db

# Restaurar desde backup
fly postgres restore --app nitrocore-db --backup-id <backup-id>
```

## 🚨 Troubleshooting

### Problema: Aplicación no inicia

```bash
# Ver logs detallados
fly logs

# Verificar variables de entorno
fly config show

# Verificar conexión a BD
fly ssh console --app nitrocore
npm run typeorm -- query "SELECT 1"
```

### Problema: Migraciones fallan

```bash
# Conectar a la app
fly ssh console --app nitrocore

# Ver estado de migraciones
npm run migration:show

# Revertir última migración
npm run migration:revert

# Ejecutar migraciones nuevamente
npm run migration:run
```

### Problema: Conexión a base de datos rechazada

```bash
# Verificar que la BD está corriendo
fly status --app nitrocore-db

# Verificar credenciales
fly secrets list

# Verificar que la app puede alcanzar la BD
fly ssh console --app nitrocore
ping nitrocore-db.internal
```

### Problema: Espacio en disco lleno

```bash
# Ver uso de disco
fly ssh console --app nitrocore
df -h

# Limpiar caché
rm -rf /app/.next/cache
rm -rf /app/node_modules/.cache
```

## 📈 Escalado

### Aumentar recursos

```bash
# Aumentar CPU y memoria
fly scale vm shared-cpu-2x --memory 512

# Ver configuración actual
fly scale show
```

### Auto-scaling

```bash
# Configurar auto-scaling
fly autoscale set min=1 max=3

# Ver configuración
fly autoscale show
```

## 🔗 Conectar Frontend

En el frontend (`redfox-front/.env`):

```env
NEXT_PUBLIC_URL_API=nitrocore.up.railway.app
```

## 📝 Notas Importantes

1. **Región**: La app está configurada para la región `mex` (México)
2. **Migraciones**: Se ejecutan automáticamente en cada deploy
3. **Seeders**: Solo se ejecutan en desarrollo (no en producción)
4. **Backups**: Configurar backups automáticos de la BD
5. **SSL/TLS**: Habilitado automáticamente por Fly.io
6. **Health Checks**: Configurados en `fly.toml`

## 🔗 Enlaces Útiles

- [Documentación de Fly.io](https://fly.io/docs/)
- [Guía de PostgreSQL en Fly.io](https://fly.io/docs/postgres/)
- [CLI Reference](https://fly.io/docs/flyctl/help/)
- [Pricing](https://fly.io/pricing/)

## 💡 Tips y Mejores Prácticas

1. **Usar secretos para datos sensibles**: Nunca commitear `.env` con secretos
2. **Monitorear logs regularmente**: Detectar problemas temprano
3. **Hacer backups regulares**: Proteger datos importantes
4. **Usar staging**: Probar cambios antes de producción
5. **Documentar cambios**: Mantener registro de deploys
6. **Revisar costos**: Monitorear uso de recursos

## 🆘 Soporte

Para más ayuda:

1. Revisar [documentación de Fly.io](https://fly.io/docs/)
2. Consultar [comunidad de Fly.io](https://community.fly.io/)
3. Crear issue en el repositorio del proyecto
