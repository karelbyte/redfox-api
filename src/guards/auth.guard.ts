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
import { RedisService } from '../services/redis.service';

interface JwtPayload {
  sub: string;
  id: string;
  email: string;
  role: string;
  organizationId: string;
  iat: number;
  exp: number;
}

interface RequestWithUser extends Request {
  user: JwtPayload;
}

export class CustomUnauthorizedException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    const isBlacklisted = await this.redisService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new CustomUnauthorizedException(
        'Token has been revoked. Please log in again.',
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: AppConfig().appKey,
      });

      request.user = payload;
    } catch (error) {
      console.error('JWT verification failed:', error);
      throw new CustomUnauthorizedException(
        'We feel it, the session has expired or a problem has occurred, log in again',
      );
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
