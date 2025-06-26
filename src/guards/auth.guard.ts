import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AppConfig } from '../config';

export class CustomUnauthorizedException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (token === undefined || token === null || token === '') {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: AppConfig().appKey,
      });

      // Establecer el usuario en el request
      request['user'] = payload;

      // Log para depuración
      console.log('JWT payload decoded:', payload);
      console.log('User ID from JWT:', payload.sub || payload.id);
    } catch (e) {
      console.error('JWT verification failed:', e);
      throw new CustomUnauthorizedException(
        'Lo sentimos, la sesión ha expirado o ha ocurrido un problema, inicia sesión nuevamente',
      );
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
