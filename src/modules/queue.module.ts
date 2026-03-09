import { Module, DynamicModule, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailQueue } from '../queues/email.queue';
import { InMemoryEmailQueue } from '../queues/in-memory-email.queue';
import { EmailModule } from './email.module';

@Module({})
export class QueueModule {
  private static readonly logger = new Logger(QueueModule.name);

  static async forRootAsync(): Promise<DynamicModule> {
    const cacheType = process.env.CACHE_TYPE || 'memory';

    const imports: any[] = [ConfigModule, EmailModule];
    const providers: any[] = [InMemoryEmailQueue, EmailQueue];
    const exports: any[] = [EmailQueue];

    if (cacheType === 'redis') {
      try {
        const bullModuleName = '@nestjs/bull';
        const { BullModule } = await import(bullModuleName);
        const { EmailProcessor } = await import(
          '../processors/email.processor'
        );

        imports.push(
          BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
              redis: {
                host: configService.get('REDIS_HOST', 'localhost'),
                port: configService.get('REDIS_PORT', 6379),
                password: configService.get('REDIS_PASSWORD'),
                db: configService.get('REDIS_DB', 0),
              },
              defaultJobOptions: {
                removeOnComplete: 100,
                removeOnFail: 500,
              },
            }),
            inject: [ConfigService],
          }),
          BullModule.registerQueue({ name: 'email' }),
        );

        // Provide the Bull queue under the custom token 'BULL_EMAIL_QUEUE'
        providers.push(EmailProcessor, {
          provide: 'BULL_EMAIL_QUEUE',
          useFactory: (queue: any) => queue,
          inject: [{ token: 'BullQueue_email', optional: true } as any],
        });

        QueueModule.logger.log('🔴 QueueModule configured with Redis/Bull');
      } catch (error) {
        QueueModule.logger.warn(
          `⚠️ CACHE_TYPE=redis but @nestjs/bull is not installed. Falling back to in-memory queue. Install with: npm install @nestjs/bull bull`,
        );
      }
    } else {
      QueueModule.logger.log('💾 QueueModule configured with in-memory queue');
    }

    return {
      module: QueueModule,
      imports,
      providers,
      exports,
    };
  }
}
