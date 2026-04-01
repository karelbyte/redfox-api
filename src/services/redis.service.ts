import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Servicio de Redis para operaciones directas:
 * - Blacklist de tokens JWT (logout real)
 * - Rate limiting distribuido
 * 
 * Si Redis no está configurado, usa un Map en memoria como fallback.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private readonly memoryStore = new Map<string, { value: string; expiresAt: number }>();

  constructor(private readonly configService: ConfigService) {
    const redisHost = this.configService.get<string>('REDIS_HOST');

    if (redisHost) {
      const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
      const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
      const redisUser = this.configService.get<string>('REDIS_USER');

      this.client = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword || undefined,
        username: redisUser || undefined,
        db: 0, // siempre usar DB 0 por defecto
        lazyConnect: true,
        retryStrategy: (times) => Math.min(times * 100, 3000),
      });

      this.client.on('connect', () => this.logger.log('✅ Redis conectado'));
      this.client.on('error', (err) => this.logger.warn(`⚠️ Redis error: ${err.message}`));
    } else {
      this.logger.warn('⚠️ REDIS_HOST no configurado — usando fallback en memoria');
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  /** Guarda un valor con TTL en segundos */
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (this.client) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      this.memoryStore.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    }
  }

  /** Obtiene un valor */
  async get(key: string): Promise<string | null> {
    if (this.client) {
      return this.client.get(key);
    }
    const entry = this.memoryStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return entry.value;
  }

  /** Verifica si una clave existe */
  async exists(key: string): Promise<boolean> {
    if (this.client) {
      return (await this.client.exists(key)) > 0;
    }
    const entry = this.memoryStore.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return false;
    }
    return true;
  }

  /** Elimina una clave */
  async del(key: string): Promise<void> {
    if (this.client) {
      await this.client.del(key);
    } else {
      this.memoryStore.delete(key);
    }
  }

  // ─── Blacklist de tokens JWT ───────────────────────────────────────────────

  /** Agrega un token a la blacklist (logout) */
  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    await this.set(`blacklist:${token}`, '1', ttlSeconds);
  }

  /** Verifica si un token está en la blacklist */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.exists(`blacklist:${token}`);
  }

  // ─── Rate limiting ─────────────────────────────────────────────────────────

  /** Incrementa un contador con TTL. Devuelve el valor actual. */
  async increment(key: string, ttlSeconds: number): Promise<number> {
    if (this.client) {
      const count = await this.client.incr(key);
      if (count === 1) {
        await this.client.expire(key, ttlSeconds);
      }
      return count;
    }
    // Fallback en memoria
    const entry = this.memoryStore.get(key);
    const now = Date.now();
    if (!entry || now > entry.expiresAt) {
      this.memoryStore.set(key, { value: '1', expiresAt: now + ttlSeconds * 1000 });
      return 1;
    }
    const newVal = parseInt(entry.value) + 1;
    entry.value = String(newVal);
    return newVal;
  }
}
