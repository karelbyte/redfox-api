# Despliegue en Fly.io

## Configuración

Este proyecto está configurado para desplegarse en Fly.io con las siguientes características:

- **Región principal**: `cdg` (París, Francia) - región activa y estable
- **Base de datos**: PostgreSQL con alta disponibilidad
- **Almacenamiento**: Volúmenes persistentes para uploads
- **Health checks**: Monitoreo automático de la aplicación

## Archivos de Configuración

### fly.toml
Configuración principal de la aplicación:
- Puerto: 8080
- Memoria: 1024MB
- CPU: 1 core compartido
- Auto-scaling habilitado

### fly-postgres.toml
Configuración de la base de datos PostgreSQL:
- Alta disponibilidad
- Backups automáticos diarios
- Retención de 7 días

## Comandos de Despliegue

### Despliegue Completo (Recomendado)
```powershell
# Usar el script de PowerShell
.\deploy-fly-postgres.ps1
```

### Despliegue Manual
```powershell
# 1. Crear la aplicación principal
fly apps create nitro-api

# 2. Desplegar la aplicación
fly deploy

# 3. Crear la base de datos PostgreSQL
fly postgres create --name nitro-api-postgres --region cdg

# 4. Conectar la app a la base de datos
fly postgres attach --app nitro-api nitro-api-postgres

# 5. Ejecutar migraciones y seeders
fly ssh console -C "npm run migration:run && npm run seed"
```

## Variables de Entorno

Las variables de entorno se configuran automáticamente al conectar la base de datos:

```env
DATABASE_URL=postgresql://nitro_user:nitro_password@nitro-api-postgres.internal:5432/nitro_api
NODE_ENV=production
PORT=8080
JWT_SECRET=<generado_automáticamente>
JWT_EXPIRES_IN=24h
```

## Monitoreo

### Health Checks
- Endpoint: `/health`
- Intervalo: 30 segundos
- Timeout: 5 segundos

### Métricas
- Puerto: 9091
- Endpoint: `/metrics`

## Troubleshooting

### Error de Región Deprecada
Si recibes un error sobre región deprecada:
```bash
Error: failed to create volume: Region mad is deprecated
```

**Solución**: Cambiar a región activa como `cdg` (París) o `iad` (Virginia).

### Volúmenes Pinned
**Warning**: Los volúmenes están anclados a un host físico específico.

**Para desarrollo/pruebas**: Puedes usar un solo volumen.
**Para producción**: Crear múltiples volúmenes para alta disponibilidad.

### Comandos Útiles

```powershell
# Ver logs en tiempo real
fly logs

# Conectar a la consola
fly ssh console

# Ver estado de la aplicación
fly status

# Escalar la aplicación
fly scale count 2

# Ver métricas
fly dashboard
```

## Regiones Disponibles

### Regiones Activas (Recomendadas)
- `cdg` - París, Francia
- `iad` - Virginia, USA
- `lhr` - Londres, Reino Unido
- `syd` - Sídney, Australia

### Regiones Deprecadas (Evitar)
- `mad` - Madrid, España
- `ams` - Ámsterdam, Países Bajos

## Costos Estimados

- **Aplicación**: ~$5-10/mes
- **PostgreSQL**: ~$7-15/mes
- **Volúmenes**: ~$3-5/mes por GB

**Total estimado**: $15-30/mes para una aplicación pequeña.

## Seguridad

- HTTPS forzado automáticamente
- Variables de entorno seguras
- Backups automáticos de la base de datos
- Health checks para monitoreo

## Escalabilidad

- Auto-scaling basado en demanda
- Múltiples instancias para alta disponibilidad
- Base de datos con replicación
- Load balancing automático 