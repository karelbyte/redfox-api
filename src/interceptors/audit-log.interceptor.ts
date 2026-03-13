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

    // Log para debug - verificar que el interceptor se ejecuta
    console.log(`[AuditLogInterceptor] ${method} ${url}`);

    // Skip audit log endpoints to avoid recursion
    if (url.includes('/audit-logs')) {
      console.log('[AuditLogInterceptor] Skipping audit-logs endpoint');
      return next.handle();
    }

    // Skip GET requests (only log mutations)
    if (method === 'GET') {
      console.log('[AuditLogInterceptor] Skipping GET request');
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
        console.log(`[AuditLogInterceptor] User extracted from JWT: ${userId}`);
      }
    } catch (error) {
      console.log('[AuditLogInterceptor] Could not extract user from JWT');
    }

    // Also try to get user from request (if AuthGuard already ran)
    if (!userId && request.user) {
      userId = request.user.id || request.user.sub;
      console.log(`[AuditLogInterceptor] User found in request: ${userId}`);
    }

    // Skip if no user
    if (!userId) {
      console.log(`[AuditLogInterceptor] No user found for ${method} ${url}`);
      return next.handle();
    }

    console.log(
      `[AuditLogInterceptor] User found: ${userId}, proceeding with audit log`,
    );

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
            // Try different possible locations for the ID
            entityId =
              response?.id || response?.client?.id || response?.data?.id;
          }

          // Skip if still no entity ID
          if (!entityId) {
            console.warn(
              `[AuditLogInterceptor] ⚠️  Could not extract entity ID for ${action} ${entityType}. Response structure:`,
              JSON.stringify(response).substring(0, 200),
            );
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
            undefined, // oldValues - would need to fetch before update
            newValues,
            description,
            ipAddress,
          );

          console.log(
            `[AuditLogInterceptor] ✅ Audit log created: ${description}`,
          );
        } catch (error) {
          // Don't fail the request if logging fails
          console.error('[AuditLogInterceptor] ❌ Failed to log audit:', error);
        }
      }),
    );
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
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
