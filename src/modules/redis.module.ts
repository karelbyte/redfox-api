import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';

/**
 * Módulo global de Redis/Cache.
 * Si REDIS_HOST está configurado, usa Redis.
 * Si no, usa caché en memoria como fallback.
 */
@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');
        const redisUser = configService.get<string>('REDIS_USER');

        if (redisHost) {
          const auth = redisPassword
            ? redisUser
              ? `${redisUser}:${redisPassword}@`
              : `:${redisPassword}@`
            : '';
          const url = `redis://${auth}${redisHost}:${redisPort}/0`;

          return {
            stores: [createKeyv(url)],
            ttl: 60 * 1000,
          };
        }

        return {
          ttl: 60 * 1000,
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [CacheModule],
})
export class RedisModule {}
