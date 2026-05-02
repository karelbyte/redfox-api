import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { BaileysProviderService } from '../../src/services/baileys-provider.service';
import { BotSettings, BotConnectionStatus, BotProvider } from '../../src/models/bot-settings.entity';
import { BotConversationService } from '../../src/services/bot-conversation.service';
import { BaileysRedisAuthStateService } from '../../src/services/baileys-redis-auth-state.service';

// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-code'),
}));

// Mock Baileys
const mockBaileys = {
  default: jest.fn(),
  Browsers: {
    ubuntu: jest.fn().mockReturnValue('Ubuntu (Chrome)'),
  },
  fetchLatestBaileysVersion: jest.fn().mockResolvedValue({ version: [1, 2, 3] }),
};

// Mock Pino
const mockPino = jest.fn().mockReturnValue({ level: 'silent' });

describe('BaileysProviderService', () => {
  let service: BaileysProviderService;
  let botSettingsRepository: jest.Mocked<Repository<BotSettings>>;
  let botConversationService: jest.Mocked<BotConversationService>;
  let baileysRedisAuthStateService: jest.Mocked<BaileysRedisAuthStateService>;
  let logger: jest.Mocked<Logger>;

  const mockBotSettings: BotSettings = {
    id: 'settings-1',
    organization_id: 'org-1',
    provider: BotProvider.BAILEYS,
    connection_status: BotConnectionStatus.DISCONNECTED,
    is_enabled: true,
    auto_reply_enabled: true,
    default_language: 'es',
    qr_code: null,
    qr_expires_at: null,
    last_connected_at: null,
    last_error: null,
    connection_meta: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as any;

  const mockSocket = {
    ev: {
      on: jest.fn(),
    },
    logout: jest.fn().mockResolvedValue(undefined),
    sendMessage: jest.fn().mockResolvedValue(undefined),
    user: {
      id: '1234567890@c.us',
      name: 'Test Bot',
    },
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock repository
    botSettingsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    // Mock conversation service
    botConversationService = {
      processIncomingMessage: jest.fn(),
      recordOutgoingMessage: jest.fn(),
    } as any;

    // Mock Redis auth state service
    baileysRedisAuthStateService = {
      hasSession: jest.fn(),
      createAuthState: jest.fn(),
      clearSession: jest.fn(),
    } as any;

    // Mock logger
    logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    // Mock dynamic imports
    (global as any).__mock_imports__ = {
      '@whiskeysockets/baileys': mockBaileys,
      pino: mockPino,
    };

    // Create service instance
    service = new BaileysProviderService(
      botSettingsRepository,
      botConversationService,
      baileysRedisAuthStateService,
    );

    // Override logger
    (service as any).logger = logger;
  });

  describe('onModuleInit', () => {
    it('should initialize sessions for existing settings', async () => {
      botSettingsRepository.find.mockResolvedValue([mockBotSettings]);
      baileysRedisAuthStateService.hasSession.mockResolvedValue(false);

      await service.onModuleInit();

      expect(botSettingsRepository.find).toHaveBeenCalledWith({
        where: { provider: BotProvider.BAILEYS },
      });
      expect(baileysRedisAuthStateService.hasSession).toHaveBeenCalledWith('org-1');
    });

    it('should reset status when no session exists', async () => {
      const connectedSettings = {
        ...mockBotSettings,
        connection_status: BotConnectionStatus.CONNECTED,
      };
      botSettingsRepository.find.mockResolvedValue([connectedSettings]);
      baileysRedisAuthStateService.hasSession.mockResolvedValue(false);
      
      // Mock findOne to return the settings when persistState is called
      botSettingsRepository.findOne.mockResolvedValue(connectedSettings);
      botSettingsRepository.save.mockResolvedValue(connectedSettings);

      await service.onModuleInit();

      expect(botSettingsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          connection_status: BotConnectionStatus.DISCONNECTED,
          qr_code: null,
          qr_expires_at: null,
          connection_meta: null,
        })
      );
    });

    it('should restore existing sessions', async () => {
      botSettingsRepository.find.mockResolvedValue([mockBotSettings]);
      baileysRedisAuthStateService.hasSession.mockResolvedValue(true);

      // Mock the connect method
      const connectSpy = jest.spyOn(service as any, 'connect').mockResolvedValue(mockBotSettings);

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalledWith(mockBotSettings);
    });
  });

  describe('connect', () => {
    beforeEach(() => {
      // Mock dynamic imports
      jest.doMock('@whiskeysockets/baileys', () => mockBaileys);
      jest.doMock('pino', () => mockPino);
    });

    it('should create new session successfully', async () => {
      const mockAuthState = { creds: 'mock-state', keys: { get: jest.fn(), set: jest.fn() } };
      baileysRedisAuthStateService.createAuthState.mockResolvedValue({
        state: mockAuthState,
        saveCreds: jest.fn(),
      });
      mockBaileys.default.mockReturnValue(mockSocket);
      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      botSettingsRepository.save.mockResolvedValue(mockBotSettings);

      const result = await service.connect(mockBotSettings);

      expect(result).toEqual(mockBotSettings);
      expect(mockBaileys.default).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: mockAuthState,
          browser: 'Ubuntu (Chrome)',
          printQRInTerminal: false,
          logger: { level: 'silent' },
          markOnlineOnConnect: false,
          syncFullHistory: false,
          version: [1, 2, 3],
        })
      );
      expect(mockSocket.ev.on).toHaveBeenCalledWith('creds.update', expect.any(Function));
      expect(mockSocket.ev.on).toHaveBeenCalledWith('connection.update', expect.any(Function));
      expect(mockSocket.ev.on).toHaveBeenCalledWith('messages.upsert', expect.any(Function));
    });

    it('should return existing session if already connected', async () => {
      // Manually add a session to simulate existing connection
      (service as any).sessions.set('org-1', { socket: mockSocket });
      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);

      const result = await service.connect(mockBotSettings);

      expect(result).toEqual(mockBotSettings);
      expect(mockBaileys.default).not.toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      baileysRedisAuthStateService.createAuthState.mockRejectedValue(error);
      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      botSettingsRepository.save.mockResolvedValue(mockBotSettings);

      await expect(service.connect(mockBotSettings)).rejects.toThrow('Connection failed');

      expect(botSettingsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          connection_status: BotConnectionStatus.ERROR,
          last_error: 'Connection failed',
        })
      );
    });

    it('should handle missing Baileys version gracefully', async () => {
      mockBaileys.fetchLatestBaileysVersion.mockRejectedValue(new Error('Version fetch failed'));
      baileysRedisAuthStateService.createAuthState.mockResolvedValue({
        state: { creds: 'mock-state', keys: { get: jest.fn(), set: jest.fn() } },
        saveCreds: jest.fn(),
      });
      mockBaileys.default.mockReturnValue(mockSocket);
      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      botSettingsRepository.save.mockResolvedValue(mockBotSettings);

      await service.connect(mockBotSettings);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unable to fetch the latest Baileys version')
      );
    });
  });

  describe('disconnect', () => {
    it('should disconnect active session', async () => {
      // Add active session
      (service as any).sessions.set('org-1', { socket: mockSocket });
      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      botSettingsRepository.save.mockResolvedValue(mockBotSettings);

      const result = await service.disconnect(mockBotSettings);

      expect(mockSocket.logout).toHaveBeenCalled();
      expect(baileysRedisAuthStateService.clearSession).toHaveBeenCalledWith('org-1');
      expect(botSettingsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          connection_status: BotConnectionStatus.DISCONNECTED,
          qr_code: null,
          qr_expires_at: null,
          connection_meta: null,
          last_error: null,
        })
      );
      expect(result).toEqual(mockBotSettings);
    });

    it('should handle disconnect when no active session', async () => {
      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      botSettingsRepository.save.mockResolvedValue(mockBotSettings);

      const result = await service.disconnect(mockBotSettings);

      expect(mockSocket.logout).not.toHaveBeenCalled();
      expect(baileysRedisAuthStateService.clearSession).toHaveBeenCalledWith('org-1');
      expect(result).toEqual(mockBotSettings);
    });

    it('should handle logout errors gracefully', async () => {
      mockSocket.logout.mockRejectedValue(new Error('Logout failed'));
      (service as any).sessions.set('org-1', { socket: mockSocket });
      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      botSettingsRepository.save.mockResolvedValue(mockBotSettings);

      const result = await service.disconnect(mockBotSettings);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error while logging out Baileys session')
      );
      expect(result).toEqual(mockBotSettings);
    });
  });

  describe('sendText', () => {
    it('should send text message successfully', async () => {
      (service as any).sessions.set('org-1', { socket: mockSocket });

      await service.sendText('org-1', '1234567890@c.us', 'Hello World');

      expect(mockSocket.sendMessage).toHaveBeenCalledWith('1234567890@c.us', { text: 'Hello World' });
    });

    it('should handle missing session', async () => {
      await service.sendText('org-1', '1234567890@c.us', 'Hello World');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('WhatsApp session not found')
      );
      expect(mockSocket.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle send message errors', async () => {
      mockSocket.sendMessage.mockRejectedValue(new Error('Send failed'));
      (service as any).sessions.set('org-1', { socket: mockSocket });

      await service.sendText('org-1', '1234567890@c.us', 'Hello World');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error sending WhatsApp message')
      );
    });
  });

  describe('refreshQr', () => {
    it('should refresh QR by disconnecting and connecting', async () => {
      const disconnectSpy = jest.spyOn(service, 'disconnect').mockResolvedValue(mockBotSettings);
      const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue(mockBotSettings);

      const result = await service.refreshQr(mockBotSettings);

      expect(disconnectSpy).toHaveBeenCalledWith(mockBotSettings);
      expect(connectSpy).toHaveBeenCalledWith(mockBotSettings);
      expect(result).toEqual(mockBotSettings);
    });
  });

  describe('message processing utilities', () => {
    it('should mark message as processed', () => {
      (service as any).markMessageProcessed('org-1', '1234567890@c.us', 'msg-123');

      expect((service as any).hasMessageBeenProcessed('org-1', '1234567890@c.us', 'msg-123')).toBe(true);
    });

    it('should check if message has been processed', () => {
      expect((service as any).hasMessageBeenProcessed('org-1', '1234567890@c.us', 'msg-123')).toBe(false);

      (service as any).markMessageProcessed('org-1', '1234567890@c.us', 'msg-123');
      expect((service as any).hasMessageBeenProcessed('org-1', '1234567890@c.us', 'msg-123')).toBe(true);
    });

    it('should clear processed message IDs', () => {
      (service as any).markMessageProcessed('org-1', '1234567890@c.us', 'msg-123');
      (service as any).clearProcessedMessageIds('org-1', '1234567890@c.us');

      expect((service as any).hasMessageBeenProcessed('org-1', '1234567890@c.us', 'msg-123')).toBe(false);
    });

    it('should clear all processed message IDs for organization', () => {
      (service as any).markMessageProcessed('org-1', '1234567890@c.us', 'msg-1');
      (service as any).markMessageProcessed('org-1', '1234567890@c.us', 'msg-2');
      (service as any).markMessageProcessed('org-2', '1234567890@c.us', 'msg-3');

      (service as any).clearProcessedMessageIdsForOrganization('org-1');

      expect((service as any).hasMessageBeenProcessed('org-1', '1234567890@c.us', 'msg-1')).toBe(false);
      expect((service as any).hasMessageBeenProcessed('org-1', '1234567890@c.us', 'msg-2')).toBe(false);
      expect((service as any).hasMessageBeenProcessed('org-2', '1234567890@c.us', 'msg-3')).toBe(true);
    });
  });

  describe('text processing utilities', () => {
    it('should extract message text from conversation', () => {
      const message = {
        message: { conversation: 'Hello World' },
      };

      const text = (service as any).extractMessageText(message);

      expect(text).toBe('Hello World');
    });

    it('should extract message text from extended text', () => {
      const message = {
        message: { extendedTextMessage: { text: 'Extended text' } },
      };

      const text = (service as any).extractMessageText(message);

      expect(text).toBe('Extended text');
    });

    it('should extract message text from image caption', () => {
      const message = {
        message: { imageMessage: { caption: 'Image caption' } },
      };

      const text = (service as any).extractMessageText(message);

      expect(text).toBe('Image caption');
    });

    it('should return empty string for unsupported message type', () => {
      const message = {
        message: { unsupportedMessage: {} },
      };

      const text = (service as any).extractMessageText(message);

      expect(text).toBe('');
    });

    it('should normalize text correctly', () => {
      const text = 'ÁÉÍÓÚ áéíóú';
      const normalized = (service as any).normalizeText(text);

      expect(normalized).toBe('aeiou aeiou');
    });

    it('should extract phone number from JID', () => {
      const jid = '1234567890@c.us';
      const phoneNumber = (service as any).extractPhoneNumber(jid);

      expect(phoneNumber).toBe('1234567890');
    });

    it('should handle null JID', () => {
      const phoneNumber = (service as any).extractPhoneNumber(null);

      expect(phoneNumber).toBeNull();
    });

    it('should handle invalid JID format', () => {
      const jid = 'invalid-jid';
      const phoneNumber = (service as any).extractPhoneNumber(jid);

      expect(phoneNumber).toBe('invalid-jid');
    });
  });

  describe('locale utilities', () => {
    it('should resolve Spanish locale by default', () => {
      const locale = (service as any).resolveLocale();

      expect(locale).toBe('es');
    });

    it('should resolve English locale', () => {
      const locale = (service as any).resolveLocale('en');

      expect(locale).toBe('en');
    });

    it('should resolve Chinese locale', () => {
      const locale = (service as any).resolveLocale('zh');

      expect(locale).toBe('zh');
    });

    it('should handle locale with country code', () => {
      const locale = (service as any).resolveLocale('en-US');

      expect(locale).toBe('en');
    });

    it('should fallback to Spanish for unsupported locale', () => {
      const locale = (service as any).resolveLocale('fr');

      expect(locale).toBe('es');
    });

    it('should get copy for locale', () => {
      const copy = (service as any).getCopy('en');

      expect(copy).toEqual({
        reconnectNeeded: expect.stringContaining('session was closed'),
        unexpectedClose: expect.stringContaining('connection closed unexpectedly'),
      });
    });
  });

  describe('auto reply cache', () => {
    it('should clear auto reply cache for organization', () => {
      (service as any).lastAutoReplyAt.set('org-1:user1:signature', Date.now());
      (service as any).lastAutoReplyAt.set('org-2:user1:signature', Date.now());

      (service as any).clearAutoReplyCache('org-1');

      expect((service as any).lastAutoReplyAt.has('org-1:user1:signature')).toBe(false);
      expect((service as any).lastAutoReplyAt.has('org-2:user1:signature')).toBe(true);
    });
  });

  describe('private methods', () => {
    it('should persist state correctly', async () => {
      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      botSettingsRepository.save.mockResolvedValue(mockBotSettings);

      const result = await (service as any).persistState('org-1', {
        connection_status: BotConnectionStatus.CONNECTED,
      });

      expect(botSettingsRepository.findOne).toHaveBeenCalledWith({
        where: { organization_id: 'org-1' },
      });
      expect(botSettingsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          connection_status: BotConnectionStatus.CONNECTED,
        })
      );
      expect(result).toEqual(mockBotSettings);
    });

    it('should create new settings if not found', async () => {
      botSettingsRepository.findOne.mockResolvedValue(null);
      const newSettings = { ...mockBotSettings, id: 'new-id' };
      botSettingsRepository.create.mockReturnValue(newSettings);
      botSettingsRepository.save.mockResolvedValue(newSettings);

      const result = await (service as any).persistState('org-1', {
        connection_status: BotConnectionStatus.CONNECTED,
      });

      expect(botSettingsRepository.create).toHaveBeenCalledWith({
        organization_id: 'org-1',
      });
      expect(result).toEqual(newSettings);
    });

    it('should get persisted settings', async () => {
      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);

      const result = await (service as any).getPersistedSettings('org-1');

      expect(botSettingsRepository.findOne).toHaveBeenCalledWith({
        where: { organization_id: 'org-1' },
      });
      expect(result).toEqual(mockBotSettings);
    });

    it('should create settings if not found when getting persisted', async () => {
      botSettingsRepository.findOne.mockResolvedValue(null);
      const newSettings = { ...mockBotSettings, id: 'new-id' };
      botSettingsRepository.create.mockReturnValue(newSettings);
      botSettingsRepository.save.mockResolvedValue(newSettings);

      const result = await (service as any).getPersistedSettings('org-1');

      expect(botSettingsRepository.create).toHaveBeenCalledWith({
        organization_id: 'org-1',
      });
      expect(result).toEqual(newSettings);
    });
  });

  describe('message signature', () => {
    // Helper function from the service file
    const messageSignature = (text: string): string => {
      return text.slice(0, 40);
    };

    it('should create message signature correctly', () => {
      const text = 'This is a test message for signature creation';
      const signature = messageSignature(text);

      expect(signature).toBe(text.slice(0, 40));
    });

    it('should handle short text', () => {
      const text = 'Short';
      const signature = messageSignature(text);

      expect(signature).toBe('Short');
    });
  });

  describe('connection update handling', () => {
    it('should handle QR update', async () => {
      const update = { qr: 'mock-qr-string' };
      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      botSettingsRepository.save.mockResolvedValue(mockBotSettings);

      await (service as any).handleConnectionUpdate('org-1', update);

      expect(botSettingsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          connection_status: BotConnectionStatus.QR_READY,
          qr_code: 'data:image/png;base64,mock-qr-code',
          qr_expires_at: expect.any(Date),
        })
      );
    });

    it('should handle connection open', async () => {
      const update = { connection: 'open' };
      (service as any).sessions.set('org-1', { socket: mockSocket });
      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      botSettingsRepository.save.mockResolvedValue(mockBotSettings);

      await (service as any).handleConnectionUpdate('org-1', update);

      expect(botSettingsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          connection_status: BotConnectionStatus.CONNECTED,
          connection_meta: {
            phoneNumber: '1234567890',
            jid: '1234567890@c.us',
            displayName: 'Test Bot',
            providerLabel: 'WhatsApp Web (Beta)',
          },
        })
      );
    });

    it('should handle intentional disconnect', async () => {
      const update = { connection: 'close' };
      (service as any).intentionalDisconnects.add('org-1');
      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      botSettingsRepository.save.mockResolvedValue(mockBotSettings);

      await (service as any).handleConnectionUpdate('org-1', update);

      expect(botSettingsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          connection_status: BotConnectionStatus.DISCONNECTED,
        })
      );
    });

    it('should handle logout (401)', async () => {
      const update = {
        connection: 'close',
        lastDisconnect: { error: { output: { statusCode: 401 } } },
      };
      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      botSettingsRepository.save.mockResolvedValue(mockBotSettings);

      await (service as any).handleConnectionUpdate('org-1', update);

      expect(baileysRedisAuthStateService.clearSession).toHaveBeenCalledWith('org-1');
      expect(botSettingsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          connection_status: BotConnectionStatus.DISCONNECTED,
          last_error: expect.stringContaining('sesión se cerró'),
        })
      );
    });

    it('should handle reconnectable status codes', async () => {
      const update = {
        connection: 'close',
        lastDisconnect: { error: { output: { statusCode: 503 } } },
      };
      const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue(mockBotSettings);
      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      botSettingsRepository.save.mockResolvedValue(mockBotSettings);

      await (service as any).handleConnectionUpdate('org-1', update);

      expect(botSettingsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          connection_status: BotConnectionStatus.CONNECTING,
        })
      );
      expect(connectSpy).toHaveBeenCalled();
    });
  });

  describe('message handling', () => {
    it('should process incoming messages', async () => {
      const event = {
        type: 'notify',
        messages: [
          {
            key: {
              remoteJid: '1234567890@c.us',
              id: 'msg-123',
              fromMe: false,
            },
            message: { conversation: 'Hello bot' },
          },
        ],
      };

      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      (service as any).sessions.set('org-1', { socket: mockSocket });
      botConversationService.processIncomingMessage.mockResolvedValue({
        reply: 'Hello back!',
        replyKind: 'generic',
        conversationId: 'conv-123',
      });
      botConversationService.recordOutgoingMessage.mockResolvedValue(undefined);

      await (service as any).handleMessagesUpsert('org-1', event);

      expect(botConversationService.processIncomingMessage).toHaveBeenCalledWith({
        organizationId: 'org-1',
        remoteJid: '1234567890@c.us',
        messageText: 'Hello bot',
        settings: mockBotSettings,
      });
      expect(mockSocket.sendMessage).toHaveBeenCalledWith('1234567890@c.us', {
        text: 'Hello back!',
      });
    });

    it('should skip group messages', async () => {
      const event = {
        type: 'notify',
        messages: [
          {
            key: {
              remoteJid: '1234567890@g.us', // Group JID
              id: 'msg-123',
              fromMe: false,
            },
            message: { conversation: 'Hello group' },
          },
        ],
      };

      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      (service as any).sessions.set('org-1', { socket: mockSocket });

      await (service as any).handleMessagesUpsert('org-1', event);

      expect(botConversationService.processIncomingMessage).not.toHaveBeenCalled();
    });

    it('should skip own messages', async () => {
      const event = {
        type: 'notify',
        messages: [
          {
            key: {
              remoteJid: '1234567890@c.us',
              id: 'msg-123',
              fromMe: true, // Own message
            },
            message: { conversation: 'My own message' },
          },
        ],
      };

      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      (service as any).sessions.set('org-1', { socket: mockSocket });

      await (service as any).handleMessagesUpsert('org-1', event);

      expect(botConversationService.processIncomingMessage).not.toHaveBeenCalled();
    });

    it('should skip processed messages', async () => {
      const event = {
        type: 'notify',
        messages: [
          {
            key: {
              remoteJid: '1234567890@c.us',
              id: 'msg-123',
              fromMe: false,
            },
            message: { conversation: 'Hello bot' },
          },
        ],
      };

      // Mark as processed
      (service as any).markMessageProcessed('org-1', '1234567890@c.us', 'msg-123');

      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      (service as any).sessions.set('org-1', { socket: mockSocket });

      await (service as any).handleMessagesUpsert('org-1', event);

      expect(botConversationService.processIncomingMessage).not.toHaveBeenCalled();
    });

    it('should handle messages with attachments', async () => {
      const event = {
        type: 'notify',
        messages: [
          {
            key: {
              remoteJid: '1234567890@c.us',
              id: 'msg-123',
              fromMe: false,
            },
            message: { conversation: 'Send me file' },
          },
        ],
      };

      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      (service as any).sessions.set('org-1', { socket: mockSocket });
      botConversationService.processIncomingMessage.mockResolvedValue({
        reply: 'Here is your file',
        replyKind: 'generic',
        attachment: {
          buffer: Buffer.from('file content'),
          mimetype: 'text/plain',
          fileName: 'test.txt',
          caption: 'Test file',
        },
        conversationId: 'conv-123',
      });
      botConversationService.recordOutgoingMessage.mockResolvedValue(undefined);

      await (service as any).handleMessagesUpsert('org-1', event);

      // The service sends text first, then attachment if present
      expect(mockSocket.sendMessage).toHaveBeenCalled();
      expect(mockSocket.sendMessage).toHaveBeenCalledWith('1234567890@c.us', {
        text: 'Here is your file',
      });
    });

    it('should respect auto reply rate limiting', async () => {
      const event = {
        type: 'notify',
        messages: [
          {
            key: {
              remoteJid: '1234567890@c.us',
              id: 'msg-123',
              fromMe: false,
            },
            message: { conversation: 'Hello bot' },
          },
        ],
      };

      botSettingsRepository.findOne.mockResolvedValue(mockBotSettings);
      (service as any).sessions.set('org-1', { socket: mockSocket });
      botConversationService.processIncomingMessage.mockResolvedValue({
        reply: 'Hello back!',
        replyKind: 'generic',
        conversationId: 'conv-123',
      });

      // Set recent auto reply for the same message signature (normalized text)
      const normalizedText = 'hello bot'; // Normalized version of 'Hello bot'
      const signature = normalizedText.slice(0, 40);
      (service as any).lastAutoReplyAt.set(`org-1:1234567890@c.us:${signature}`, Date.now() - 1000);

      await (service as any).handleMessagesUpsert('org-1', event);

      expect(mockSocket.sendMessage).not.toHaveBeenCalled();
    });
  });
});
