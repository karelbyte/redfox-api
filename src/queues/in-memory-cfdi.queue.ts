import { Injectable, Logger } from '@nestjs/common';

export interface CfdiJob {
  invoiceId: string;
  userId?: string;
  organizationId: string;
  options?: Record<string, unknown>;
}

/**
 * Cola en memoria para procesamiento de CFDI sin Redis.
 * Ejecuta los jobs de forma asíncrona usando setImmediate.
 */
@Injectable()
export class InMemoryCfdiQueue {
  private readonly logger = new Logger(InMemoryCfdiQueue.name);
  private handler?: (job: CfdiJob) => Promise<void>;

  registerHandler(handler: (job: CfdiJob) => Promise<void>): void {
    this.handler = handler;
  }

  async addCfdiJob(data: CfdiJob): Promise<void> {
    if (!this.handler) {
      this.logger.warn('No CFDI handler registered — job dropped');
      return;
    }

    const fn = this.handler;
    setImmediate(async () => {
      try {
        await fn(data);
      } catch (err: any) {
        this.logger.error(
          `[InMemoryCfdiQueue] Error processing CFDI job for invoice ${data.invoiceId}: ${err?.message}`,
        );
      }
    });
  }
}
