/**
 * Durable Storage and Event Distribution Adapter for Ludo Royale Online Multiplayer.
 * Supports Upstash Redis REST API for serverless cross-instance state synchronization on Vercel,
 * with an in-memory fallback for local development or when credentials are not yet configured.
 */

import { GameState, HouseRules, PlayerColor } from '../game/gameTypes';

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: string;
  color: PlayerColor;
  ready: boolean;
  isHost: boolean;
  isAI: boolean;
  connected: boolean;
  lastSeen: number;
}

export interface ServerRoom {
  roomCode: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'finished';
  players: RoomPlayer[];
  rules: HouseRules;
  gameState: GameState | null;
  updatedAt: number;
}

export interface MatchmakingTicket {
  id: string;
  name: string;
  avatar: string;
  timestamp: number;
}

export type ServerMessage =
  | { type: 'WELCOME'; clientId: string; onlineCount: number }
  | { type: 'ROOM_UPDATED'; room: ServerRoom; assignedColor: PlayerColor }
  | { type: 'GAME_STATE_SYNC'; gameState: GameState }
  | { type: 'MATCHMAKING_STATUS'; status: 'searching' | 'matched'; queueSize: number }
  | { type: 'ERROR'; message: string };

type EventListener = (msg: ServerMessage) => void;

// In-Memory store for local development or fallback
const memoryRooms = new Map<string, ServerRoom>();
const memoryMatchmakingQueue: MatchmakingTicket[] = [];
const memorySubscribers = new Map<string, Set<EventListener>>();

// Global presence tracking
const activeClients = new Map<string, number>();

class MultiplayerStore {
  private upstashUrl: string | null = null;
  private upstashToken: string | null = null;
  private hasLoggedWarning: boolean = false;

  constructor() {
    if (typeof process !== 'undefined' && process.env) {
      this.upstashUrl = process.env.UPSTASH_REDIS_REST_URL || null;
      this.upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || null;
    }
  }

  private isUpstashConfigured(): boolean {
    return Boolean(this.upstashUrl && this.upstashToken);
  }

  private async executeRedisCommand(command: (string | number)[]): Promise<any> {
    if (!this.isUpstashConfigured()) return null;
    try {
      const res = await fetch(`${this.upstashUrl}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
        cache: 'no-store',
      });
      if (!res.ok) {
        console.error(`Upstash Redis error: ${res.statusText}`);
        return null;
      }
      const data = await res.json();
      return data.result;
    } catch (err) {
      console.error('Upstash Redis request failed:', err);
      return null;
    }
  }

  public logConfigStatusOnce(): void {
    if (this.hasLoggedWarning) return;
    this.hasLoggedWarning = true;
    if (this.isUpstashConfigured()) {
      console.log('[Ludo Multiplayer] Connected to Upstash Redis durable store for Vercel multi-instance synchronization.');
    } else {
      console.warn(
        '[Ludo Multiplayer] UPSTASH_REDIS_REST_URL is not configured. Running with in-memory durable store fallback. Configure Upstash in production for serverless multi-instance state sync.'
      );
    }
  }

  // Room Persistence
  public async getRoom(roomCode: string): Promise<ServerRoom | null> {
    const code = roomCode.trim().toUpperCase();
    if (this.isUpstashConfigured()) {
      const raw = await this.executeRedisCommand(['GET', `ludo:room:${code}`]);
      if (!raw) return null;
      try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        return null;
      }
    }
    return memoryRooms.get(code) || null;
  }

  public async saveRoom(room: ServerRoom): Promise<void> {
    const code = room.roomCode.trim().toUpperCase();
    room.updatedAt = Date.now();
    if (this.isUpstashConfigured()) {
      await this.executeRedisCommand([
        'SET',
        `ludo:room:${code}`,
        JSON.stringify(room),
        'EX',
        86400, // 24 hours TTL
      ]);
    }
    memoryRooms.set(code, room);
  }

  public async deleteRoom(roomCode: string): Promise<void> {
    const code = roomCode.trim().toUpperCase();
    if (this.isUpstashConfigured()) {
      await this.executeRedisCommand(['DEL', `ludo:room:${code}`]);
    }
    memoryRooms.delete(code);
  }

  // Matchmaking Queue
  public async enqueueMatchmaking(ticket: MatchmakingTicket): Promise<number> {
    if (this.isUpstashConfigured()) {
      await this.executeRedisCommand([
        'LPUSH',
        'ludo:matchmaking',
        JSON.stringify(ticket),
      ]);
      const len = await this.executeRedisCommand(['LLEN', 'ludo:matchmaking']);
      return typeof len === 'number' ? len : 1;
    }

    const idx = memoryMatchmakingQueue.findIndex((t) => t.id === ticket.id);
    if (idx === -1) {
      memoryMatchmakingQueue.push(ticket);
    }
    return memoryMatchmakingQueue.length;
  }

  public async dequeueMatchmakingPair(): Promise<[MatchmakingTicket, MatchmakingTicket] | null> {
    if (this.isUpstashConfigured()) {
      const p1Raw = await this.executeRedisCommand(['RPOP', 'ludo:matchmaking']);
      if (!p1Raw) return null;
      const p2Raw = await this.executeRedisCommand(['RPOP', 'ludo:matchmaking']);
      if (!p2Raw) {
        // Put p1 back if no second player found
        await this.executeRedisCommand(['LPUSH', 'ludo:matchmaking', p1Raw]);
        return null;
      }
      try {
        const p1 = typeof p1Raw === 'string' ? JSON.parse(p1Raw) : p1Raw;
        const p2 = typeof p2Raw === 'string' ? JSON.parse(p2Raw) : p2Raw;
        return [p1, p2];
      } catch {
        return null;
      }
    }

    if (memoryMatchmakingQueue.length >= 2) {
      const p1 = memoryMatchmakingQueue.shift()!;
      const p2 = memoryMatchmakingQueue.shift()!;
      return [p1, p2];
    }
    return null;
  }

  public async removeMatchmaking(clientId: string): Promise<void> {
    if (this.isUpstashConfigured()) {
      // Fetch queue, filter out client, and replace
      const items = await this.executeRedisCommand(['LRANGE', 'ludo:matchmaking', 0, -1]);
      if (Array.isArray(items)) {
        await this.executeRedisCommand(['DEL', 'ludo:matchmaking']);
        for (const item of items) {
          try {
            const parsed = typeof item === 'string' ? JSON.parse(item) : item;
            if (parsed.id !== clientId) {
              await this.executeRedisCommand(['RPUSH', 'ludo:matchmaking', JSON.stringify(parsed)]);
            }
          } catch {}
        }
      }
      return;
    }

    const idx = memoryMatchmakingQueue.findIndex((t) => t.id === clientId);
    if (idx !== -1) {
      memoryMatchmakingQueue.splice(idx, 1);
    }
  }

  public async getMatchmakingQueueSize(): Promise<number> {
    if (this.isUpstashConfigured()) {
      const len = await this.executeRedisCommand(['LLEN', 'ludo:matchmaking']);
      return typeof len === 'number' ? len : 0;
    }
    return memoryMatchmakingQueue.length;
  }

  // Client Presence & Heartbeat
  public registerPresence(clientId: string): void {
    activeClients.set(clientId, Date.now());
  }

  public removePresence(clientId: string): void {
    activeClients.delete(clientId);
  }

  public getOnlineCount(): number {
    const now = Date.now();
    for (const [id, ts] of Array.from(activeClients.entries())) {
      if (now - ts > 45000) {
        activeClients.delete(id);
      }
    }
    return Math.max(1, activeClients.size);
  }

  // Real-time Event Subscription (SSE & Local Dispatch)
  public subscribe(channel: string, listener: EventListener): () => void {
    if (!memorySubscribers.has(channel)) {
      memorySubscribers.set(channel, new Set());
    }
    memorySubscribers.get(channel)!.add(listener);
    return () => {
      const set = memorySubscribers.get(channel);
      if (set) {
        set.delete(listener);
        if (set.size === 0) memorySubscribers.delete(channel);
      }
    };
  }

  public broadcast(channel: string, msg: ServerMessage): void {
    const set = memorySubscribers.get(channel);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(msg);
        } catch (err) {
          console.error('Error invoking event listener:', err);
        }
      });
    }
  }
}

export const multiplayerStore = new MultiplayerStore();
