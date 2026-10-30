/**
 * Durable Storage and Event Distribution Adapter for Ludo Royale Online Multiplayer.
 * Supports Upstash Redis REST API for serverless cross-instance state synchronization on Vercel,
 * with a resilient in-memory fallback for local development or when credentials are not yet configured.
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
  version: number;
}

export interface MatchmakingTicket {
  id: string;
  name: string;
  avatar: string;
  timestamp: number;
}

export interface MatchedClientRecord {
  roomCode: string;
  color: PlayerColor;
  matchedAt: number;
}

export type ServerMessage =
  | { type: 'WELCOME'; clientId: string; onlineCount: number }
  | { type: 'ROOM_UPDATED'; room: ServerRoom; assignedColor: PlayerColor }
  | { type: 'GAME_STATE_SYNC'; gameState: GameState }
  | { type: 'MATCHMAKING_STATUS'; status: 'searching' | 'matched'; queueSize: number }
  | { type: 'ERROR'; message: string };

type EventListener = (msg: ServerMessage) => void;

// Bind in-memory storage to globalThis to ensure all Next.js API routes share state in the same Node.js process
declare global {
  // eslint-disable-next-line no-var
  var __ludo_rooms__: Map<string, ServerRoom> | undefined;
  // eslint-disable-next-line no-var
  var __ludo_matchmaking__: MatchmakingTicket[] | undefined;
  // eslint-disable-next-line no-var
  var __ludo_matched_clients__: Map<string, MatchedClientRecord> | undefined;
  // eslint-disable-next-line no-var
  var __ludo_subscribers__: Map<string, Set<EventListener>> | undefined;
  // eslint-disable-next-line no-var
  var __ludo_presence__: Map<string, number> | undefined;
}

const memoryRooms: Map<string, ServerRoom> =
  globalThis.__ludo_rooms__ || (globalThis.__ludo_rooms__ = new Map());

const memoryMatchmakingQueue: MatchmakingTicket[] =
  globalThis.__ludo_matchmaking__ || (globalThis.__ludo_matchmaking__ = []);

const memoryMatchedClients: Map<string, MatchedClientRecord> =
  globalThis.__ludo_matched_clients__ || (globalThis.__ludo_matched_clients__ = new Map());

const memorySubscribers: Map<string, Set<EventListener>> =
  globalThis.__ludo_subscribers__ || (globalThis.__ludo_subscribers__ = new Map());

const activeClients: Map<string, number> =
  globalThis.__ludo_presence__ || (globalThis.__ludo_presence__ = new Map());

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

  public isUpstashConfigured(): boolean {
    return Boolean(this.upstashUrl && this.upstashToken);
  }

  public getBackendStatus(): {
    type: 'upstash' | 'memory';
    configured: boolean;
    description: string;
  } {
    if (this.isUpstashConfigured()) {
      return {
        type: 'upstash',
        configured: true,
        description: 'Durable Upstash Redis REST Backend (Multi-instance Vercel Sync Active)',
      };
    }
    return {
      type: 'memory',
      configured: false,
      description: 'Single-Instance Memory Backend (Local Dev & Testing)',
    };
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
      console.log(
        '[Ludo Multiplayer] Connected to Upstash Redis durable store for cross-instance state synchronization.'
      );
    } else {
      console.log(
        '[Ludo Multiplayer] UPSTASH_REDIS_REST_URL not configured. Operating in global in-memory mode.'
      );
    }
  }

  // Room Persistence
  public async getRoom(roomCode: string): Promise<ServerRoom | null> {
    const code = roomCode.trim().toUpperCase();
    if (this.isUpstashConfigured()) {
      const raw = await this.executeRedisCommand(['GET', `ludo:room:${code}`]);
      if (raw) {
        try {
          const room = typeof raw === 'string' ? JSON.parse(raw) : raw;
          memoryRooms.set(code, room);
          return room;
        } catch {
          // Fall through to memory
        }
      }
    }
    return memoryRooms.get(code) || null;
  }

  public async saveRoom(room: ServerRoom): Promise<void> {
    const code = room.roomCode.trim().toUpperCase();
    room.updatedAt = Date.now();
    room.version = (room.version || 0) + 1;

    // Cache locally immediately
    memoryRooms.set(code, room);

    if (this.isUpstashConfigured()) {
      await this.executeRedisCommand([
        'SET',
        `ludo:room:${code}`,
        JSON.stringify(room),
        'EX',
        86400, // 24 hours TTL
      ]);
    }
  }

  public async deleteRoom(roomCode: string): Promise<void> {
    const code = roomCode.trim().toUpperCase();
    memoryRooms.delete(code);
    if (this.isUpstashConfigured()) {
      await this.executeRedisCommand(['DEL', `ludo:room:${code}`]);
    }
  }

  // Matchmaking Queue
  public async enqueueMatchmaking(ticket: MatchmakingTicket): Promise<number> {
    // Purge expired tickets (> 2 min) and duplicate client tickets
    const now = Date.now();
    for (let i = memoryMatchmakingQueue.length - 1; i >= 0; i--) {
      const t = memoryMatchmakingQueue[i];
      if (now - t.timestamp > 120000 || t.id === ticket.id) {
        memoryMatchmakingQueue.splice(i, 1);
      }
    }
    memoryMatchmakingQueue.push(ticket);

    if (this.isUpstashConfigured()) {
      // Clean up matched record if any
      await this.executeRedisCommand(['DEL', `ludo:matched:${ticket.id}`]);
      await this.executeRedisCommand([
        'SET',
        `ludo:ticket:${ticket.id}`,
        JSON.stringify(ticket),
        'EX',
        120, // 2 minutes TTL
      ]);
    }

    return memoryMatchmakingQueue.length;
  }

  public async dequeueMatchmakingPair(): Promise<[MatchmakingTicket, MatchmakingTicket] | null> {
    const now = Date.now();
    // Filter fresh tickets
    const validTickets = memoryMatchmakingQueue.filter(
      (t) => now - t.timestamp <= 120000
    );

    // Find two distinct players
    if (validTickets.length >= 2) {
      const p1 = validTickets[0];
      const p2 = validTickets.find((t) => t.id !== p1.id);

      if (p2) {
        // Remove both from queue
        const idx1 = memoryMatchmakingQueue.indexOf(p1);
        if (idx1 !== -1) memoryMatchmakingQueue.splice(idx1, 1);
        const idx2 = memoryMatchmakingQueue.indexOf(p2);
        if (idx2 !== -1) memoryMatchmakingQueue.splice(idx2, 1);

        if (this.isUpstashConfigured()) {
          await this.executeRedisCommand(['DEL', `ludo:ticket:${p1.id}`]);
          await this.executeRedisCommand(['DEL', `ludo:ticket:${p2.id}`]);
        }

        return [p1, p2];
      }
    }

    return null;
  }

  public async removeMatchmaking(clientId: string): Promise<void> {
    const idx = memoryMatchmakingQueue.findIndex((t) => t.id === clientId);
    if (idx !== -1) {
      memoryMatchmakingQueue.splice(idx, 1);
    }
    memoryMatchedClients.delete(clientId);

    if (this.isUpstashConfigured()) {
      await this.executeRedisCommand(['DEL', `ludo:ticket:${clientId}`]);
      await this.executeRedisCommand(['DEL', `ludo:matched:${clientId}`]);
    }
  }

  public async getMatchmakingQueueSize(): Promise<number> {
    const now = Date.now();
    const count = memoryMatchmakingQueue.filter(
      (t) => now - t.timestamp <= 120000
    ).length;
    return count;
  }

  // Matched Client Pair Records
  public async setMatchForClient(
    clientId: string,
    record: MatchedClientRecord
  ): Promise<void> {
    memoryMatchedClients.set(clientId, record);
    if (this.isUpstashConfigured()) {
      await this.executeRedisCommand([
        'SET',
        `ludo:matched:${clientId}`,
        JSON.stringify(record),
        'EX',
        180, // 3 minutes TTL
      ]);
    }
  }

  public async getMatchForClient(
    clientId: string
  ): Promise<MatchedClientRecord | null> {
    if (this.isUpstashConfigured()) {
      const raw = await this.executeRedisCommand(['GET', `ludo:matched:${clientId}`]);
      if (raw) {
        try {
          return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
          // Fall through
        }
      }
    }
    return memoryMatchedClients.get(clientId) || null;
  }

  public async clearMatchForClient(clientId: string): Promise<void> {
    memoryMatchedClients.delete(clientId);
    if (this.isUpstashConfigured()) {
      await this.executeRedisCommand(['DEL', `ludo:matched:${clientId}`]);
    }
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
