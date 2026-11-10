import {
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Observable, Subscriber } from 'rxjs';

export const UPCDE_MAX_CONTENT_LENGTH = 200_000;

const ROOM_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas sin actividad
const SWEEP_INTERVAL_MS = 30 * 60 * 1000;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const MAX_ROOMS_PER_ORG = 50;
const HEARTBEAT_MS = 20_000;

export interface UpcdeEditor {
  id: string;
  name: string;
  clientId?: string;
}

export interface UpcdeRoomSnapshot {
  code: string;
  title: string;
  language: string;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: UpcdeEditor | null;
  viewers: number;
  expiresAt: string;
}

export type UpcdeEvent =
  | { type: 'snapshot' | 'update'; room: UpcdeRoomSnapshot }
  | { type: 'presence'; viewers: number }
  | { type: 'ping'; at: number }
  | { type: 'closed'; reason: string };

interface UpcdeRoom {
  code: string;
  organizationId: string;
  title: string;
  language: string;
  content: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  updatedBy: UpcdeEditor | null;
  expiresAt: number;
}

@Injectable()
export class UpcdeService implements OnModuleInit, OnModuleDestroy {
  private readonly rooms = new Map<string, UpcdeRoom>();
  private readonly subscribers = new Map<
    string,
    Set<Subscriber<UpcdeEvent>>
  >();
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  onModuleInit() {
    this.sweepTimer = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
    // No mantener vivo el proceso solo por el barrido de salas.
    (this.sweepTimer as { unref?: () => void }).unref?.();
  }

  onModuleDestroy() {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    for (const subscribers of this.subscribers.values()) {
      for (const subscriber of subscribers) {
        subscriber.next({ type: 'closed', reason: 'server_shutdown' });
        subscriber.complete();
      }
    }
    this.subscribers.clear();
    this.rooms.clear();
  }

  create(
    organizationId: string,
    options: { title?: string; language?: string; content?: string },
    editor: UpcdeEditor,
  ): UpcdeRoomSnapshot {
    this.sweep();

    this.enforceOrgLimit(organizationId);

    const code = this.generateCode(organizationId);
    const now = Date.now();
    const room: UpcdeRoom = {
      code,
      organizationId,
      title: options.title?.trim() || 'Sesión de código',
      language: options.language || 'html',
      content: options.content ?? '',
      version: 1,
      createdAt: now,
      updatedAt: now,
      updatedBy: editor,
      expiresAt: now + ROOM_TTL_MS,
    };

    this.rooms.set(this.roomKey(organizationId, code), room);
    return this.toSnapshot(room);
  }

  get(organizationId: string, code: string): UpcdeRoomSnapshot {
    return this.toSnapshot(this.requireRoom(organizationId, code));
  }

  update(
    organizationId: string,
    code: string,
    changes: { content?: string; language?: string; title?: string },
    editor: UpcdeEditor,
  ): UpcdeRoomSnapshot {
    const room = this.requireRoom(organizationId, code);

    if (typeof changes.content === 'string') {
      room.content = changes.content;
    }
    if (changes.language) {
      room.language = changes.language;
    }
    if (changes.title?.trim()) {
      room.title = changes.title.trim();
    }

    room.version += 1;
    room.updatedAt = Date.now();
    room.updatedBy = editor;
    room.expiresAt = room.updatedAt + ROOM_TTL_MS;

    const snapshot = this.toSnapshot(room);
    this.broadcast(organizationId, room.code, { type: 'update', room: snapshot });
    return snapshot;
  }

  delete(organizationId: string, code: string): { success: boolean } {
    const key = this.roomKey(organizationId, code);
    const room = this.rooms.get(key);
    if (!room) {
      throw new NotFoundException('Sala no encontrada o expirada');
    }

    this.closeRoom(key, 'room_deleted');
    return { success: true };
  }

  stream(organizationId: string, code: string): Observable<UpcdeEvent> {
    const key = this.roomKey(organizationId, code);

    return new Observable<UpcdeEvent>((subscriber) => {
      const room = this.rooms.get(key);
      if (!room) {
        subscriber.next({ type: 'closed', reason: 'not_found' });
        subscriber.complete();
        return () => undefined;
      }

      let roomSubscribers = this.subscribers.get(key);
      if (!roomSubscribers) {
        roomSubscribers = new Set();
        this.subscribers.set(key, roomSubscribers);
      }
      roomSubscribers.add(subscriber);

      subscriber.next({ type: 'snapshot', room: this.toSnapshot(room) });
      this.broadcastPresence(key);

      const heartbeat = setInterval(() => {
        subscriber.next({ type: 'ping', at: Date.now() });
      }, HEARTBEAT_MS);
      (heartbeat as { unref?: () => void }).unref?.();

      return () => {
        clearInterval(heartbeat);
        const current = this.subscribers.get(key);
        current?.delete(subscriber);
        if (current && current.size === 0) {
          this.subscribers.delete(key);
        }
        this.broadcastPresence(key);
      };
    });
  }

  private requireRoom(organizationId: string, code: string): UpcdeRoom {
    const key = this.roomKey(organizationId, code);
    const room = this.rooms.get(key);

    if (!room || room.expiresAt <= Date.now()) {
      if (room) this.closeRoom(key, 'expired');
      throw new NotFoundException('Sala no encontrada o expirada');
    }

    return room;
  }

  private broadcastPresence(key: string) {
    const room = this.rooms.get(key);
    if (!room) return;
    this.broadcast(room.organizationId, room.code, {
      type: 'presence',
      viewers: this.subscribers.get(key)?.size ?? 0,
    });
  }

  private broadcast(
    organizationId: string,
    code: string,
    event: UpcdeEvent,
  ) {
    const key = this.roomKey(organizationId, code);
    const subscribers = this.subscribers.get(key);
    if (!subscribers) return;
    for (const subscriber of subscribers) {
      subscriber.next(event);
    }
  }

  private closeRoom(key: string, reason: string) {
    this.rooms.delete(key);
    const subscribers = this.subscribers.get(key);
    if (!subscribers) return;
    for (const subscriber of subscribers) {
      subscriber.next({ type: 'closed', reason });
      subscriber.complete();
    }
    this.subscribers.delete(key);
  }

  private sweep() {
    const now = Date.now();
    for (const [key, room] of this.rooms.entries()) {
      if (room.expiresAt <= now) {
        this.closeRoom(key, 'expired');
      }
    }
  }

  private enforceOrgLimit(organizationId: string) {
    const orgRooms = [...this.rooms.entries()].filter(
      ([, room]) => room.organizationId === organizationId,
    );

    if (orgRooms.length < MAX_ROOMS_PER_ORG) return;

    orgRooms.sort(([, a], [, b]) => a.updatedAt - b.updatedAt);
    const roomsToRemove = orgRooms.length - MAX_ROOMS_PER_ORG + 1;
    for (let index = 0; index < roomsToRemove; index += 1) {
      this.closeRoom(orgRooms[index][0], 'room_limit');
    }
  }

  private generateCode(organizationId: string): string {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      let code = '';
      for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
        code += ROOM_CODE_ALPHABET.charAt(
          Math.floor(Math.random() * ROOM_CODE_ALPHABET.length),
        );
      }
      if (!this.rooms.has(this.roomKey(organizationId, code))) {
        return code;
      }
    }
    throw new Error('No se pudo generar un código de sala único');
  }

  private roomKey(organizationId: string, code: string): string {
    return `${organizationId}::${this.normalizeCode(code)}`;
  }

  private normalizeCode(code: string): string {
    return (code || '').trim().toUpperCase();
  }

  private toSnapshot(room: UpcdeRoom): UpcdeRoomSnapshot {
    const key = this.roomKey(room.organizationId, room.code);
    return {
      code: room.code,
      title: room.title,
      language: room.language,
      content: room.content,
      version: room.version,
      createdAt: new Date(room.createdAt).toISOString(),
      updatedAt: new Date(room.updatedAt).toISOString(),
      updatedBy: room.updatedBy,
      viewers: this.subscribers.get(key)?.size ?? 0,
      expiresAt: new Date(room.expiresAt).toISOString(),
    };
  }
}
