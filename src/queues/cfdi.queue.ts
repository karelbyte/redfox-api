import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { InMemoryCfdiQueue, CfdiJob } from './in-memory-cfdi.queue';
import { CfdiProcessor } from '../processors/cfdi.processor';

export { CfdiJob };

/**
 * Facade que delega a Bull/Redis o InMemoryCfdiQueue
 * según la variable de entorno CACHE_TYPE.
 *
 * - CACHE_TYPE=redis  → usa Bull queue (con reintentos automáticos)
 * - CACHE_TYPE=memory → usa in-memory queue (default, sin dependencias externas)
 */
@Injectable()
export class CfdiQueue {
  private readonly logger = new Logger(CfdiQueue.name);
  private readonly useRedis: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly inMemoryQueue: InMemoryCfdiQueue,
    private readonly processor: CfdiProcessor,
    @Optional() @InjectQueue('generate-cfdi') private readonly bullQueue?: any,
  ) {
    const cacheType = this.configService.get<string>('CACHE_TYPE', 'memory');
    this.useRedis = cacheType === 'redis' && !!this.bullQueue;

    // Register handler for in-memory queue
    this.inMemoryQueue.registerHandler((job) => this.processor.process(job));

    if (this.useRedis) {
      this.logger.log('🔴 CFDI queue strategy: REDIS (Bull)');
    } else {
      this.logger.log('💾 CFDI queue strategy: IN-MEMORY');
      if (cacheType === 'redis' && !this.bullQueue) {
        this.logger.warn(
          '⚠️ CACHE_TYPE=redis but Bull CFDI queue is not available. Falling back to in-memory.',
        );
      }
    }
  }

  async addCfdiJob(data: CfdiJob): Promise<void> {
    if (this.useRedis) {
      await this.bullQueue.add('generate-cfdi', data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
    } else {
      await this.inMemoryQueue.addCfdiJob(data);
    }
  }
}
