# Dockerfile para NestJS API con migraciones y seeders

# Etapa de construcción
FROM node:22-alpine AS builder

# Declarar variables de Railway para build time
ARG APP_DB_PROVIDER
ARG PG_DB_HOST
ARG PG_DB_PORT
ARG PG_DB_USER
ARG PG_DB_PASSWORD
ARG PG_DB_NAME
ARG NODE_ENV
ARG PORT

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Instalar dependencias (incluyendo devDependencies para el build)
RUN npm ci --no-audit --no-fund --include=dev

# Copiar código fuente
COPY src/ ./src/
COPY db/ ./db/
COPY scripts/ ./scripts/

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM node:22-alpine AS production

# Declarar variables de Railway para runtime
ARG APP_DB_PROVIDER
ARG PG_DB_HOST
ARG PG_DB_PORT
ARG PG_DB_USER
ARG PG_DB_PASSWORD
ARG PG_DB_NAME
ARG NODE_ENV
ARG PORT

# Instalar dependencias de producción
RUN apk add --no-cache dumb-init

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Establecer directorio de trabajo
WORKDIR /app

# Copiar node_modules desde la etapa de construcción
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copiar archivos construidos y necesarios
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/db ./db
COPY --from=builder /app/src/config ./src/config
COPY --from=builder /app/tsconfig*.json ./
COPY --from=builder /app/scripts ./scripts

# Copiar script de entrada y configurar permisos
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    chown nestjs:nodejs /usr/local/bin/docker-entrypoint.sh

# Cambiar propietario de archivos de la aplicación
RUN chown -R nestjs:nodejs /app

# Cambiar al usuario no-root
USER nestjs

# Exponer puerto
EXPOSE 3000

# Convertir ARG a ENV para que estén disponibles en runtime
ENV APP_DB_PROVIDER=$APP_DB_PROVIDER
ENV PG_DB_HOST=$PG_DB_HOST
ENV PG_DB_PORT=$PG_DB_PORT
ENV PG_DB_USER=$PG_DB_USER
ENV PG_DB_PASSWORD=$PG_DB_PASSWORD
ENV PG_DB_NAME=$PG_DB_NAME

# Comando de inicio
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"] 