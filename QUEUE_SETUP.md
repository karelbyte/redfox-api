# 🚀 Configuración de Sistema de Colas para Emails

## 📦 Instalación de Dependencias

Ejecuta el siguiente comando en el directorio `redfox-api`:

```bash
npm install @nestjs/bull bull
```

## 🐳 Configuración de Redis

### Opción 1: Docker (Recomendado para desarrollo)

```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

### Opción 2: Instalación Local

**Windows:**
```bash
# Usar WSL2 o descargar desde:
# https://github.com/microsoftarchive/redis/releases
```

**Linux/Mac:**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# Mac
brew install redis
```

## ⚙️ Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## 🔧 Verificar que Redis está corriendo

```bash
# Probar conexión
redis-cli ping
# Debería responder: PONG
```

## ✅ Verificación de Funcionamiento

1. Inicia el servidor:
```bash
npm run start:dev
```

2. Registra un nuevo usuario
3. El correo se enviará en segundo plano
4. El frontend recibirá respuesta inmediata

## 📊 Monitoreo de Colas (Opcional)

### Bull Board - Dashboard Web

```bash
npm install @bull-board/api @bull-board/express
```

Luego agrega en `app.module.ts` o crea un módulo separado:

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

// En el método configure de tu AppModule
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullAdapter(emailQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

Accede a: `http://localhost:4000/admin/queues`

## 🎯 Características Implementadas

### ✅ Envío Asíncrono de Emails
- Registro de usuarios
- Activación de cuentas
- Recuperación de contraseña
- Reset de contraseña

### ✅ Reintentos Automáticos
- 3 intentos por defecto
- Backoff exponencial (2s, 4s, 8s)
- Logs detallados de errores

### ✅ Gestión de Jobs
- Elimina jobs completados automáticamente
- Mantiene últimos 500 jobs fallidos para debugging
- Mantiene últimos 100 jobs completados

## 🔍 Debugging

### Ver jobs en la cola:
```bash
redis-cli
> KEYS bull:email:*
> LRANGE bull:email:waiting 0 -1
```

### Ver logs del procesador:
Los logs aparecerán en la consola del servidor:
```
[EmailProcessor] Processing email job 1 to user@example.com
[EmailProcessor] Email sent successfully to user@example.com
```

## 🚨 Troubleshooting

### Error: "Cannot connect to Redis"
- Verifica que Redis esté corriendo: `redis-cli ping`
- Verifica las variables de entorno
- Verifica el puerto (por defecto 6379)

### Error: "Module not found: @nestjs/bull"
- Ejecuta: `npm install @nestjs/bull bull`
- Reinicia el servidor

### Los emails no se envían
- Verifica los logs del EmailProcessor
- Verifica la configuración de email en la base de datos
- Revisa los jobs fallidos en Redis

## 📈 Ventajas del Sistema de Colas

1. **Respuesta Inmediata**: El frontend no espera el envío del email
2. **Reintentos Automáticos**: Si falla, se reintenta automáticamente
3. **Escalabilidad**: Puedes procesar miles de emails sin bloquear el servidor
4. **Monitoreo**: Puedes ver el estado de todos los jobs
5. **Priorización**: Puedes dar prioridad a ciertos emails
6. **Programación**: Puedes programar emails para enviar más tarde

## 🔄 Próximos Pasos (Opcional)

### 1. Agregar más tipos de jobs:
- Notificaciones push
- Generación de reportes
- Procesamiento de imágenes
- Sincronización con servicios externos

### 2. Configurar múltiples workers:
```typescript
// En queue.module.ts
BullModule.registerQueue({
  name: 'email',
  processors: [
    { name: 'send-email', concurrency: 5 }, // 5 workers simultáneos
  ],
}),
```

### 3. Agregar prioridad a emails:
```typescript
await this.emailQueue.addEmailJob(emailData, {
  priority: 1, // Mayor prioridad
});
```

## 📝 Notas Importantes

- Redis debe estar corriendo ANTES de iniciar el servidor
- En producción, usa Redis con persistencia configurada
- Considera usar Redis Cluster para alta disponibilidad
- Monitorea el uso de memoria de Redis
- Configura límites de memoria en Redis para evitar OOM

## 🎉 ¡Listo!

El sistema de colas está configurado y funcionando. Los emails ahora se envían en segundo plano sin bloquear las respuestas del API.
