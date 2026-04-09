import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import {
  BotConnectionStatus,
  BotProvider,
  BotSettings,
} from '../models/bot-settings.entity';
import { BotConversationService } from './bot-conversation.service';
import { BaileysRedisAuthStateService } from './baileys-redis-auth-state.service';

type RuntimeSession = {
  socket: any;
};

type SupportedBotLocale = 'es' | 'en' | 'zh';

type BotCopy = {
  reconnectNeeded: string;
  unexpectedClose: string;
};

const BOT_COPY: Record<SupportedBotLocale, BotCopy> = {
  es: {
    reconnectNeeded:
      'La sesión se cerró. Escanea un nuevo código QR para volver a conectar WhatsApp.',
    unexpectedClose:
      'La conexión se cerró de forma inesperada. Intenta generar un nuevo código QR.',
  },
  en: {
    reconnectNeeded:
      'The session was closed. Scan a new QR code to reconnect WhatsApp.',
    unexpectedClose:
      'The connection closed unexpectedly. Try generating a new QR code.',
  },
  zh: {
    reconnectNeeded:
      '会话已关闭。请重新扫描二维码以重新连接 WhatsApp。',
    unexpectedClose:
      '连接意外中断。请尝试重新生成二维码。',
  },
};

@Injectable()
export class BaileysProviderService implements OnModuleInit {
  private readonly logger = new Logger(BaileysProviderService.name);
  private readonly sessions = new Map<string, RuntimeSession>();
  private readonly lastAutoReplyAt = new Map<string, number>();
  private readonly intentionalDisconnects = new Set<string>();
  private readonly reconnectableStatusCodes = new Set([408, 428, 503, 515]);

  constructor(
    @InjectRepository(BotSettings)
    private readonly botSettingsRepository: Repository<BotSettings>,
    private readonly botConversationService: BotConversationService,
    private readonly baileysRedisAuthStateService: BaileysRedisAuthStateService,
  ) {}

  async onModuleInit(): Promise<void> {
    const settingsList = await this.botSettingsRepository.find({
      where: { provider: BotProvider.BAILEYS },
    });

    for (const settings of settingsList) {
      const hasSession = await this.baileysRedisAuthStateService.hasSession(
        settings.organization_id,
      );

      if (!hasSession) {
        if (
          settings.connection_status === BotConnectionStatus.CONNECTED ||
          settings.connection_status === BotConnectionStatus.CONNECTING ||
          settings.connection_status === BotConnectionStatus.QR_READY
        ) {
          await this.persistState(settings.organization_id, {
            connection_status: BotConnectionStatus.DISCONNECTED,
            qr_code: null,
            qr_expires_at: null,
            connection_meta: null,
          });
        }
        continue;
      }

      void this.connect(settings).catch((error) => {
        this.logger.warn(
          `Unable to restore Baileys session for ${settings.organization_id}: ${String(error)}`,
        );
      });
    }
  }

  async connect(settings: BotSettings): Promise<BotSettings> {
    const organizationId = settings.organization_id;
    if (this.sessions.has(organizationId)) {
      return this.getPersistedSettings(organizationId);
    }

    try {
      const baileys = await import('@whiskeysockets/baileys');
      const pinoModule = await import('pino');
      const pino = (pinoModule.default ?? pinoModule) as any;

      const { state, saveCreds } =
        await this.baileysRedisAuthStateService.createAuthState(organizationId);
      const version = await this.getLatestBaileysVersion(baileys);

      await this.persistState(organizationId, {
        provider: BotProvider.BAILEYS,
        connection_status: BotConnectionStatus.CONNECTING,
        qr_code: null,
        qr_expires_at: null,
        last_error: null,
      });

      const socketConfig: any = {
        auth: state,
        browser: baileys.Browsers.ubuntu('Nitro Bot'),
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        markOnlineOnConnect: false,
        syncFullHistory: false,
      };

      if (version) {
        socketConfig.version = version;
      }

      const socket = baileys.default(socketConfig);

      this.sessions.set(organizationId, {
        socket,
      });

      socket.ev.on('creds.update', saveCreds);
      socket.ev.on('connection.update', async (update: any) => {
        await this.handleConnectionUpdate(organizationId, update);
      });
      socket.ev.on('messages.upsert', async (event: any) => {
        await this.handleMessagesUpsert(organizationId, event);
      });

      return this.getPersistedSettings(organizationId);
    } catch (error) {
      this.sessions.delete(organizationId);
      await this.persistState(organizationId, {
        connection_status: BotConnectionStatus.ERROR,
        last_error:
          error instanceof Error
            ? error.message
            : 'Unable to initialize the WhatsApp provider.',
      });
      throw error;
    }
  }

  async disconnect(settings: BotSettings): Promise<BotSettings> {
    const organizationId = settings.organization_id;
    const runtimeSession = this.sessions.get(organizationId);

    if (runtimeSession) {
      this.intentionalDisconnects.add(organizationId);
      try {
        await runtimeSession.socket.logout();
      } catch (error) {
        this.logger.warn(
          `Error while logging out Baileys session for ${organizationId}: ${String(error)}`,
        );
      }
      this.sessions.delete(organizationId);
    } else {
      this.intentionalDisconnects.delete(organizationId);
    }

    await this.baileysRedisAuthStateService.clearSession(organizationId);
    this.clearAutoReplyCache(organizationId);

    await this.persistState(organizationId, {
      connection_status: BotConnectionStatus.DISCONNECTED,
      qr_code: null,
      qr_expires_at: null,
      connection_meta: null,
      last_error: null,
    });

    return this.getPersistedSettings(organizationId);
  }

  async refreshQr(settings: BotSettings): Promise<BotSettings> {
    await this.disconnect(settings);
    return this.connect(settings);
  }

  private async handleConnectionUpdate(
    organizationId: string,
    update: any,
  ): Promise<void> {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      const qrCode = await QRCode.toDataURL(qr, {
        margin: 1,
        width: 320,
      });

      await this.persistState(organizationId, {
        connection_status: BotConnectionStatus.QR_READY,
        qr_code: qrCode,
        qr_expires_at: new Date(Date.now() + 60 * 1000),
        last_error: null,
      });
    }

    if (connection === 'open') {
      const session = this.sessions.get(organizationId);
      const jid = session?.socket?.user?.id ?? null;

      await this.persistState(organizationId, {
        connection_status: BotConnectionStatus.CONNECTED,
        qr_code: null,
        qr_expires_at: null,
        last_connected_at: new Date(),
        last_error: null,
        connection_meta: {
          phoneNumber: this.extractPhoneNumber(jid),
          jid,
          displayName: session?.socket?.user?.name ?? null,
          providerLabel: 'WhatsApp Web (Beta)',
        },
      });
    }

    if (connection === 'close') {
      this.sessions.delete(organizationId);

      const settings = await this.getPersistedSettings(organizationId);
      const copy = this.getCopy(settings.default_language);

      if (this.intentionalDisconnects.has(organizationId)) {
        this.intentionalDisconnects.delete(organizationId);
        await this.persistState(organizationId, {
          connection_status: BotConnectionStatus.DISCONNECTED,
          qr_code: null,
          qr_expires_at: null,
          last_error: null,
        });
        return;
      }

      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const wasLoggedOut = statusCode === 401;
      const shouldReconnect =
        typeof statusCode === 'number' &&
        this.reconnectableStatusCodes.has(statusCode);
      const lastError = wasLoggedOut
        ? copy.reconnectNeeded
        : (lastDisconnect?.error as Error | undefined)?.message ??
          copy.unexpectedClose;

      if (wasLoggedOut) {
        await this.baileysRedisAuthStateService.clearSession(organizationId);
      }

      if (shouldReconnect) {
        await this.persistState(organizationId, {
          connection_status: BotConnectionStatus.CONNECTING,
          qr_code: null,
          qr_expires_at: null,
          last_error: null,
        });

        void this.connect(settings).catch((error) => {
          this.logger.warn(
            `Unable to reconnect Baileys session for ${organizationId}: ${String(error)}`,
          );
        });
        return;
      }

      await this.persistState(organizationId, {
        connection_status: BotConnectionStatus.DISCONNECTED,
        qr_code: null,
        qr_expires_at: null,
        last_error: lastError,
      });
    }
  }

  private async handleMessagesUpsert(
    organizationId: string,
    event: { messages?: any[]; type?: string },
  ): Promise<void> {
    if (event.type !== 'notify' || !event.messages?.length) {
      return;
    }

    const settings = await this.botSettingsRepository.findOne({
      where: { organization_id: organizationId },
    });

    if (!settings || !settings.is_enabled || !settings.auto_reply_enabled) {
      return;
    }

    const session = this.sessions.get(organizationId);
    if (!session) {
      return;
    }

    for (const message of event.messages) {
      const remoteJid = message?.key?.remoteJid;
      const fromMe = Boolean(message?.key?.fromMe);

      if (!remoteJid || fromMe || remoteJid.endsWith('@g.us')) {
        continue;
      }

      const text = this.extractMessageText(message);
      if (!text) {
        continue;
      }

      const result = await this.botConversationService.processIncomingMessage({
        organizationId,
        remoteJid,
        messageText: text,
        settings,
      });

      if (!result.reply) {
        continue;
      }

      if (result.replyKind === 'generic') {
        const sessionKey = `${organizationId}:${remoteJid}:${messageSignature(this.normalizeText(text))}`;
        const lastReplyAt = this.lastAutoReplyAt.get(sessionKey) ?? 0;
        if (Date.now() - lastReplyAt < 10 * 60 * 1000) {
          continue;
        }

        this.lastAutoReplyAt.set(sessionKey, Date.now());
      }

      try {
        await session.socket.sendMessage(remoteJid, { text: result.reply });
        if (result.attachment) {
          await session.socket.sendMessage(remoteJid, {
            document: result.attachment.buffer,
            mimetype: result.attachment.mimetype,
            fileName: result.attachment.fileName,
            caption: result.attachment.caption,
          });
        }
        await this.botConversationService.recordOutgoingMessage(
          result.conversationId,
          organizationId,
          settings.provider,
          result.reply,
        );
      } catch (error) {
        this.logger.warn(
          `Error sending bot reply for ${organizationId}: ${String(error)}`,
        );
      }
    }
  }

  private extractMessageText(message: any): string {
    return (
      message?.message?.conversation ||
      message?.message?.extendedTextMessage?.text ||
      message?.message?.imageMessage?.caption ||
      message?.message?.videoMessage?.caption ||
      ''
    );
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private extractPhoneNumber(jid?: string | null): string | null {
    if (!jid) {
      return null;
    }

    return jid.split('@')[0] || null;
  }

  private clearAutoReplyCache(organizationId: string): void {
    for (const key of this.lastAutoReplyAt.keys()) {
      if (key.startsWith(`${organizationId}:`)) {
        this.lastAutoReplyAt.delete(key);
      }
    }
  }

  private resolveLocale(language?: string | null): SupportedBotLocale {
    const normalized = (language || 'es').split('-')[0].toLowerCase();
    if (normalized === 'en' || normalized === 'zh') {
      return normalized;
    }

    return 'es';
  }

  private getCopy(language?: string | null): BotCopy {
    return BOT_COPY[this.resolveLocale(language)];
  }

  private async getLatestBaileysVersion(
    baileys: Record<string, any>,
  ): Promise<number[] | undefined> {
    try {
      const versionInfo = await baileys.fetchLatestBaileysVersion();
      return versionInfo.version;
    } catch (error) {
      this.logger.warn(
        `Unable to fetch the latest Baileys version, using library defaults: ${String(error)}`,
      );
      return undefined;
    }
  }

  private async persistState(
    organizationId: string,
    partial: Partial<BotSettings>,
  ): Promise<BotSettings> {
    let settings = await this.botSettingsRepository.findOne({
      where: { organization_id: organizationId },
    });

    if (!settings) {
      settings = this.botSettingsRepository.create({
        organization_id: organizationId,
      });
    }

    Object.assign(settings, partial);
    return this.botSettingsRepository.save(settings);
  }

  private async getPersistedSettings(
    organizationId: string,
  ): Promise<BotSettings> {
    let settings = await this.botSettingsRepository.findOne({
      where: { organization_id: organizationId },
    });

    if (!settings) {
      settings = this.botSettingsRepository.create({
        organization_id: organizationId,
      });
      settings = await this.botSettingsRepository.save(settings);
    }

    return settings;
  }
}

function messageSignature(text: string): string {
  return text.slice(0, 40);
}
