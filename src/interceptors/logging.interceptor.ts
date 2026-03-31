import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, user } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(async () => {
        const duration = Date.now() - now;
        const statusCode = context.switchToHttp().getResponse().statusCode;

        // Log en consola estructurada
        this.logger.log(
          `[${method}] ${url} - ${statusCode} - ${duration}ms - User: ${user?.id || 'Anonymous'} - IP: ${ip}`,
        );
      }),
    );
  }
}
