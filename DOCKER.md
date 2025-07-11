# Docker Setup para Nitro API

Este documento describe cómo ejecutar la aplicación NestJS usando Docker con migraciones y seeders automáticos.

## 🚀 Inicio Rápido

### 1. Construir y ejecutar con Docker Compose

```bash
# Construir y ejecutar todos los servicios
docker-compose up --build

# Ejecutar en segundo plano
docker-compose up -d --build
```

### 2. Verificar que todo esté funcionando

```bash
# Ver logs de la aplicación
docker-compose logs -f api

# Ver logs de la base de datos
docker-compose logs -f mysql

# Verificar estado de los servicios
docker-compose ps
```

## 📋 Requisitos

- Docker
- Docker Compose
- Al menos 2GB de RAM disponible

## 🔧 Configuración

### Variables de Entorno

El archivo `docker-compose.yml` incluye las siguientes variables de entorno por defecto:

#### Base de Datos MySQL
```env
APP_DB_PROVIDER=mysql
MYSQL_DB_HOST=mysql
MYSQL_DB_PORT=3306
MYSQL_DB_USER=nitro_user
MYSQL_DB_PASSWORD=nitro_password
MYSQL_DB_NAME=nitro_api
```

#### Base de Datos PostgreSQL (alternativa)
```env
APP_DB_PROVIDER=postgres
PG_DB_HOST=postgres
PG_DB_PORT=5432
PG_DB_USER=nitro_user
PG_DB_PASSWORD=nitro_password
PG_DB_NAME=nitro_api
```

#### Aplicación
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
UPLOAD_DEST=./uploads
```

### Personalizar Configuración

1. **Crear archivo `.env`** (opcional):
```bash
cp .env.example .env
# Editar variables según necesites
```

2. **Modificar docker-compose.yml**:
```yaml
environment:
  MYSQL_DB_PASSWORD: tu_password_seguro
  JWT_SECRET: tu_jwt_secret_seguro
```

## 🗄️ Base de Datos

### MySQL (Recomendado)
- Puerto: 3306
- Usuario: nitro_user
- Contraseña: nitro_password
- Base de datos: nitro_api

### PostgreSQL (Alternativa)
- Puerto: 5432
- Usuario: nitro_user
- Contraseña: nitro_password
- Base de datos: nitro_api

## 🔄 Migraciones y Seeders

El Dockerfile incluye un script de entrada que automáticamente:

1. **Espera** a que la base de datos esté disponible
2. **Ejecuta** las migraciones de TypeORM
3. **Ejecuta** los seeders para poblar datos iniciales
4. **Inicia** la aplicación NestJS

### Migraciones Incluidas
- Creación de tablas de usuarios
- Creación de tablas de roles y permisos
- Creación de tablas de productos y categorías
- Creación de tablas de almacenes
- Y más...

### Seeders Incluidos
- Unidades de medida
- Categorías de productos
- Marcas
- Impuestos
- Monedas
- Clientes
- Proveedores
- Productos
- Almacenes
- Permisos y roles
- Usuarios por defecto
- Ajustes de almacén
- Devoluciones

## 🛠️ Comandos Útiles

### Desarrollo
```bash
# Ejecutar solo la aplicación (sin base de datos)
docker run -p 3000:3000 --env-file .env nitro-api

# Ejecutar con volúmenes para desarrollo
docker-compose -f docker-compose.dev.yml up
```

### Producción
```bash
# Ejecutar en modo producción
docker-compose -f docker-compose.prod.yml up -d

# Ver logs en tiempo real
docker-compose logs -f

# Detener todos los servicios
docker-compose down
```

### Mantenimiento
```bash
# Acceder a la base de datos MySQL
docker-compose exec mysql mysql -u nitro_user -p nitro_api

# Acceder a la base de datos PostgreSQL
docker-compose exec postgres psql -U nitro_user -d nitro_api

# Ejecutar migraciones manualmente
docker-compose exec api npm run migration:run

# Ejecutar seeders manualmente
docker-compose exec api npm run seed

# Revertir última migración
docker-compose exec api npm run migration:revert
```

### Limpieza
```bash
# Eliminar contenedores y volúmenes
docker-compose down -v

# Eliminar imágenes
docker-compose down --rmi all

# Limpieza completa
docker system prune -a
```

## 🔍 Troubleshooting

### Problemas Comunes

1. **Error de conexión a la base de datos**
   ```bash
   # Verificar que MySQL esté ejecutándose
   docker-compose logs mysql
   
   # Verificar variables de entorno
   docker-compose exec api env | grep DB
   ```

2. **Migraciones fallan**
   ```bash
   # Ver logs de migraciones
   docker-compose logs api | grep migration
   
   # Ejecutar migraciones manualmente
   docker-compose exec api npm run migration:run
   ```

3. **Seeders fallan**
   ```bash
   # Ver logs de seeders
   docker-compose logs api | grep seed
   
   # Ejecutar seeders manualmente
   docker-compose exec api npm run seed
   ```

4. **Aplicación no inicia**
   ```bash
   # Ver logs completos
   docker-compose logs api
   
   # Verificar puertos
   docker-compose ps
   ```

### Logs y Debugging

```bash
# Ver logs en tiempo real
docker-compose logs -f api

# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f mysql

# Ejecutar comando en contenedor
docker-compose exec api sh
```

## 📊 Monitoreo

### Health Checks
- **API**: `http://localhost:3000/health`
- **MySQL**: Verificación automática de conexión
- **PostgreSQL**: Verificación automática de conexión

### Métricas
```bash
# Ver uso de recursos
docker stats

# Ver información de contenedores
docker-compose ps
```

## 🔒 Seguridad

### Recomendaciones para Producción

1. **Cambiar contraseñas por defecto**
2. **Usar variables de entorno seguras**
3. **Configurar SSL/TLS**
4. **Implementar backup automático**
5. **Configurar firewall**
6. **Usar secrets de Docker**

### Variables de Entorno Seguras
```bash
# Crear archivo .env.prod
JWT_SECRET=tu_jwt_secret_muy_seguro_y_largo
MYSQL_DB_PASSWORD=tu_password_muy_seguro
PG_DB_PASSWORD=tu_password_muy_seguro
```

## 📝 Notas Adicionales

- La aplicación se ejecuta en el puerto **3000**
- La base de datos MySQL se ejecuta en el puerto **3306**
- La base de datos PostgreSQL se ejecuta en el puerto **5432**
- Los archivos subidos se almacenan en el volumen `uploads_data`
- Los datos de la base de datos se almacenan en volúmenes persistentes

## 🤝 Contribución

Para contribuir al proyecto:

1. Fork el repositorio
2. Crear una rama para tu feature
3. Hacer los cambios
4. Probar con Docker
5. Crear un Pull Request

## 📞 Soporte

Si tienes problemas con la configuración de Docker:

1. Revisar los logs: `docker-compose logs`
2. Verificar la documentación de Docker
3. Crear un issue en el repositorio 