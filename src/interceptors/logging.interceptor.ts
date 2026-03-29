import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '../services/audit-log.service';
import { AuditAction } from '../models/audit-log.entity';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, body, user } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(async () => {
        const duration = Date.now() - now;
        const statusCode = context.switchToHttp().getResponse().statusCode;

        // Log en consola estructurada
        this.logger.log(
          `[${method}] ${url} - ${statusCode} - ${duration}ms - User: ${user?.id || 'Anonymous'} - IP: ${ip}`,
        );

        // Solo persistimos en DB acciones de escritura (POST, PUT, DELETE) 
        // o si es una exportación/importación explícita (puedes ajustar esto)
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && user?.id) {
          // No loguear el login para no exponer credenciales
          if (url.includes('/login') || url.includes('/auth')) return;

          try {
            await this.auditLogService.log(
              user.id,
              'HTTP_REQUEST',
              url,
              method === 'DELETE' ? AuditAction.DELETE : method === 'POST' ? AuditAction.CREATE : AuditAction.UPDATE,
              undefined, // oldValues
              body, // newValues -> Guardamos el input recibido
              `HTTP ${method} to ${url}`,
              ip,
              user.organizationId,
            );
          } catch (e) {
            // No bloqueamos la respuesta si falla el log
            this.logger.error('Error persisting HTTP audit log', e.stack);
          }
        }
      }),
    );
  }
}
