import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

type BaileysRuntime = {
  BufferJSON: {
    replacer: (key: string, value: unknown) => unknown;
    reviver: (key: string, value: unknown) => unknown;
  };
  initAuthCreds: () => any;
  proto: any;
};

@Injectable()
export class BaileysRedisAuthStateService {
  private baileysRuntimePromise?: Promise<BaileysRuntime>;

  constructor(private readonly redisService: RedisService) {}

  async hasSession(organizationId: string): Promise<boolean> {
    return this.redisService.exists(this.getCredsKey(organizationId));
  }

  async clearSession(organizationId: string): Promise<void> {
    await this.redisService.deleteByPrefix(this.getSessionPrefix(organizationId));
  }

  async createAuthState(organizationId: string): Promise<{
    state: {
      creds: any;
      keys: {
        get: (type: string, ids: string[]) => Promise<Record<string, any>>;
        set: (data: Record<string, Record<string, any>>) => Promise<void>;
      };
    };
    saveCreds: () => Promise<void>;
  }> {
    const { BufferJSON, initAuthCreds, proto } = await this.getBaileysRuntime();
    const creds =
      (await this.readJson(this.getCredsKey(organizationId), BufferJSON)) ??
      initAuthCreds();

    return {
      state: {
        creds,
        keys: {
          get: async (type: string, ids: string[]) => {
            const data: Record<string, any> = {};

            await Promise.all(
              ids.map(async (id) => {
                let value = await this.readJson(
                  this.getSignalKey(organizationId, type, id),
                  BufferJSON,
                );

                if (type === 'app-state-sync-key' && value) {
                  value = proto.Message.AppStateSyncKeyData.fromObject(value);
                }

                data[id] = value;
              }),
            );

            return data;
          },
          set: async (data: Record<string, Record<string, any>>) => {
            const tasks: Promise<void>[] = [];

            for (const category of Object.keys(data)) {
              for (const id of Object.keys(data[category] ?? {})) {
                const value = data[category][id];
                const key = this.getSignalKey(organizationId, category, id);

                if (value) {
                  tasks.push(
                    this.redisService.setPersistent(
                      key,
                      JSON.stringify(value, BufferJSON.replacer),
                    ),
                  );
                } else {
                  tasks.push(this.redisService.del(key));
                }
              }
            }

            await Promise.all(tasks);
          },
        },
      },
      saveCreds: async () => {
        await this.redisService.setPersistent(
          this.getCredsKey(organizationId),
          JSON.stringify(creds, BufferJSON.replacer),
        );
      },
    };
  }

  private getSessionPrefix(organizationId: string): string {
    return `bot:session:${organizationId}:`;
  }

  private getCredsKey(organizationId: string): string {
    return `${this.getSessionPrefix(organizationId)}creds`;
  }

  private getSignalKey(
    organizationId: string,
    type: string,
    id: string,
  ): string {
    return `${this.getSessionPrefix(organizationId)}keys:${type}:${id}`;
  }

  private async readJson(
    key: string,
    bufferJson: BaileysRuntime['BufferJSON'],
  ): Promise<any | null> {
    const raw = await this.redisService.get(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw, bufferJson.reviver);
  }

  private async getBaileysRuntime(): Promise<BaileysRuntime> {
    if (!this.baileysRuntimePromise) {
      this.baileysRuntimePromise = this.loadBaileysRuntime();
    }

    return this.baileysRuntimePromise;
  }

  private async loadBaileysRuntime(): Promise<BaileysRuntime> {
    const baileys = await import('@whiskeysockets/baileys');

    return {
      BufferJSON: baileys.BufferJSON,
      initAuthCreds: baileys.initAuthCreds,
      proto: baileys.proto,
    };
  }
}
