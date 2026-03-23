import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { JwtService } from '@nestjs/jwt';
import { AuditLogService } from '../services/audit-log.service';
import { AuditAction } from '../models/audit-log.entity';
import { AppConfig } from '../config';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private auditLogService: AuditLogService,
    private jwtService: JwtService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, params } = request;

    // Skip audit log endpoints to avoid recursion
    if (url.includes('/audit-logs')) {
      return next.handle();
    }

    // Skip GET requests (only log mutations)
    if (method === 'GET') {
      return next.handle();
    }

    // Extract user from JWT token
    let userId: string | null = null;
    try {
      const token = this.extractTokenFromHeader(request);
      if (token) {
        const payload = this.jwtService.verify(token, {
          secret: AppConfig().appKey,
        });
        userId = payload.id || payload.sub;
      }
    } catch (error) {
      // token invalid or missing
    }

    // Also try to get user from request (if AuthGuard already ran)
    if (!userId && request.user) {
      userId = request.user.id || request.user.sub;
    }

    // Extract organizationId from request.user as fallback (in case TenantContext isn't set yet)
    const organizationIdFallback: string | undefined = request.user?.organizationId;

    // Skip if no user
    if (!userId) {
      return next.handle();
    }

    // Determine action based on HTTP method
    let action: AuditAction;
    switch (method) {
      case 'POST':
        action = AuditAction.CREATE;
        break;
      case 'PUT':
      case 'PATCH':
        action = AuditAction.UPDATE;
        break;
      case 'DELETE':
        action = AuditAction.DELETE;
        break;
      default:
        return next.handle();
    }

    // Extract entity type from URL
    const urlParts = url
      .split('/')
      .filter((part: string) => part && part !== 'api');
    const entityType = urlParts[0] || 'unknown';

    // Get entity ID from params or body
    let entityId = params?.id || body?.id;

    // If no ID yet (POST), we'll get it from response
    const needsIdFromResponse = !entityId && method === 'POST';

    // Get IP address
    const ipAddress = request.ip || request.connection?.remoteAddress;

    return next.handle().pipe(
      tap(async (response) => {
        try {
          // For POST requests, get ID from response
          if (needsIdFromResponse) {
            entityId = this.extractEntityId(response);
          }

          // Skip silently if no entity ID — some endpoints return messages without IDs (e.g. onboarding)
          if (!entityId) {
            return;
          }

          // Prepare values for logging (limit size to avoid huge logs)
          let newValues = method === 'POST' ? response : body;

          // Limit the size of newValues to prevent huge logs
          const newValuesStr = JSON.stringify(newValues || {});
          if (newValuesStr && newValuesStr.length > 5000) {
            newValues = { _truncated: true, _size: newValuesStr.length };
          }

          const description = this.generateDescription(
            action,
            entityType,
            entityId,
          );

          // Log the action
          await this.auditLogService.log(
            userId,
            entityType,
            entityId,
            action,
            undefined,
            newValues,
            description,
            ipAddress,
            organizationIdFallback,
          );
        } catch (error) {
          this.logger.error('Failed to log audit', error);
        }
      }),
    );
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  /**
   * Busca recursivamente un campo UUID/ID en la respuesta.
   * Cubre patrones comunes: { id }, { data.id }, { client.id }, { user.id }, etc.
   */
  private extractEntityId(response: any): string | undefined {
    if (!response || typeof response !== 'object') return undefined;

    // Nivel raíz
    if (response.id) return response.id;

    // Objetos anidados comunes
    const nestedKeys = ['data', 'client', 'user', 'product', 'invoice', 'provider', 'result'];
    for (const key of nestedKeys) {
      if (response[key]?.id) return response[key].id;
    }

    return undefined;
  }

  private generateDescription(
    action: AuditAction,
    entityType: string,
    entityId: string,
  ): string {
    const actionText = {
      [AuditAction.CREATE]: 'created',
      [AuditAction.UPDATE]: 'updated',
      [AuditAction.DELETE]: 'deleted',
      [AuditAction.RESTORE]: 'restored',
      [AuditAction.EXPORT]: 'exported',
      [AuditAction.IMPORT]: 'imported',
    };

    return `${actionText[action]} ${entityType} ${entityId}`;
  }
}
