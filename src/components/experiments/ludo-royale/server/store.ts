/**
 * Durable Storage and Event Distribution Adapter for Ludo Royale Online Multiplayer.
 * Supports Upstash Redis REST API for serverless cross-instance state synchronization on Vercel,
 * with a resilient in-memory fallback for local development or when credentials are not yet configured.
 */

import {
  GameState,
  HouseRules,
  MatchLifecycleState,
  MatchmakingPlayerCount,
  PlayerColor,
} from '../game/gameTypes';

export interface BackendStatusInfo {
  type: 'upstash' | 'memory';
  configured: boolean;
  description: string;
}

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: string;
  color: PlayerColor;
  ready: boolean;
  isHost: boolean;
  isAI: boolean;
  connected: boolean;
  lastSeen?: number;
  replacedByBot?: boolean;
  originalHumanName?: string;
}

export interface ServerRoom {
  roomCode: string;
  roomType?: 'friends' | 'matchmaking';
  targetPlayers?: MatchmakingPlayerCount;
  hostId: string;
  status: 'lobby' | 'playing' | 'finished' | 'terminated';
  lifecycle?: MatchLifecycleState;
  humanCount?: number;
  players: RoomPlayer[];
  rules: HouseRules;
  gameState: GameState | null;
  terminatedReason?: string;
  terminatedTitle?: string;
  terminatedMessage?: string;
  returnTo?: 'matchmaking' | 'friends' | 'title';
  updatedAt: number;
  version: number;
}

export interface MatchmakingTicket {
  id: string;
  name: string;
  avatar: string;
  targetPlayers: MatchmakingPlayerCount;
  timestamp: number;
}

export interface MatchedClientRecord {
  roomCode: string;
  color: PlayerColor;
  matchedAt: number;
}

export interface QueuedPlayerSummary {
  id: string;
  name: string;
  avatar: string;
}

export type ServerMessage =
  | { type: 'WELCOME'; clientId: string; onlineCount: number; backend?: BackendStatusInfo }
  | { type: 'ROOM_UPDATED'; room: ServerRoom; assignedColor: PlayerColor; version?: number }
  | { type: 'GAME_STATE_SYNC'; gameState: GameState; version?: number }
  | {
      type: 'DICE_ROLLED';
      playerColor: PlayerColor;
      diceValue: number;
      gameState: GameState;
      version?: number;
    }
  | {
      type: 'TOKEN_MOVED';
      tokenId: string;
      fromSteps: number;
      toSteps: number;
      capturedIds: string[];
      reachesHome: boolean;
      gameState: GameState;
      version?: number;
    }
  | {
      type: 'MATCHMAKING_STATUS';
      status: 'idle' | 'searching' | 'matched';
      targetPlayers: MatchmakingPlayerCount;
      foundPlayers: number;
      queueSize: number;
      queuedPlayers: QueuedPlayerSummary[];
      room?: ServerRoom;
      assignedColor?: PlayerColor;
      version?: number;
    }
  | { type: 'ROOM_LEFT'; roomCode: string }
  | { type: 'ROOM_NOTIFICATION'; message: string }
  | {
      type: 'PLAYER_REPLACED_BY_BOT';
      playerName: string;
      color: PlayerColor;
      remainingHumans: number;
      message: string;
      version?: number;
    }
  | {
      type: 'MATCH_TERMINATED';
      roomCode: string;
      reasonCode: string;
      title: string;
      message: string;
      returnTo: 'matchmaking' | 'friends' | 'title';
      version?: number;
    }
  | { type: 'CONNECTION_STATUS'; status: 'connected' | 'connecting' | 'offline' }
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
    this.refreshCredentials();
  }

  public refreshCredentials(): void {
    if (typeof process !== 'undefined' && process.env) {
      let url =
        process.env.UPSTASH_REDIS_REST_URL ||
        process.env.KV_REST_API_URL ||
        null;
      let token =
        process.env.UPSTASH_REDIS_REST_TOKEN ||
        process.env.KV_REST_API_TOKEN ||
        null;
      if (url) {
        url = url.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = `https://${url}`;
        }
      }
      this.upstashUrl = url;
      this.upstashToken = token ? token.trim() : null;
    }
  }

  public isUpstashConfigured(): boolean {
    this.refreshCredentials();
    return Boolean(this.upstashUrl && this.upstashToken);
  }

  public getBackendStatus(): BackendStatusInfo {
    if (this.isUpstashConfigured()) {
      return {
        type: 'upstash',
        configured: true,
        description: 'Durable Upstash Redis (Multi-Device Cloud Sync Active)',
      };
    }
    return {
      type: 'memory',
      configured: false,
      description: 'Single-Instance Server Mode (Add UPSTASH_REDIS_REST_URL in Vercel for multi-device sync)',
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
        console.error(`Upstash Redis error: ${res.statusText} (${res.status})`);
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
  public async getTicket(clientId: string): Promise<MatchmakingTicket | null> {
    const now = Date.now();
    if (this.isUpstashConfigured()) {
      const raw = await this.executeRedisCommand(['GET', `ludo:ticket:${clientId}`]);
      if (raw) {
        try {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (now - parsed.timestamp <= 120000) {
            return parsed;
          }
        } catch {}
      }
    }
    const memTicket = memoryMatchmakingQueue.find(
      (t) => t.id === clientId && now - t.timestamp <= 120000
    );
    return memTicket || null;
  }

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
      // Remove from all queues first to avoid crosstalk
      await this.executeRedisCommand(['SREM', 'ludo:queue:2', ticket.id]);
      await this.executeRedisCommand(['SREM', 'ludo:queue:3', ticket.id]);
      await this.executeRedisCommand(['SREM', 'ludo:queue:4', ticket.id]);
      await this.executeRedisCommand(['DEL', `ludo:matched:${ticket.id}`]);

      // Set ticket with 120s TTL
      await this.executeRedisCommand([
        'SET',
        `ludo:ticket:${ticket.id}`,
        JSON.stringify(ticket),
        'EX',
        120, // 2 minutes TTL
      ]);
      // Add to target queue set
      await this.executeRedisCommand([
        'SADD',
        `ludo:queue:${ticket.targetPlayers}`,
        ticket.id,
      ]);
    }

    const bracket = await this.getMatchmakingBracket(ticket.targetPlayers);
    return bracket.length;
  }

  public async getMatchmakingBracket(
    targetPlayers: MatchmakingPlayerCount
  ): Promise<MatchmakingTicket[]> {
    const now = Date.now();
    if (this.isUpstashConfigured()) {
      const membersRaw = await this.executeRedisCommand([
        'SMEMBERS',
        `ludo:queue:${targetPlayers}`,
      ]);
      const clientIds: string[] = Array.isArray(membersRaw) ? membersRaw : [];
      if (clientIds.length === 0) {
        return [];
      }

      const ticketKeys = clientIds.map((id) => `ludo:ticket:${id}`);
      const ticketsRaw = await this.executeRedisCommand(['MGET', ...ticketKeys]);
      const validTickets: MatchmakingTicket[] = [];

      if (Array.isArray(ticketsRaw)) {
        for (let i = 0; i < clientIds.length; i++) {
          const raw = ticketsRaw[i];
          const cid = clientIds[i];
          if (!raw) {
            // Expired in Redis, remove from queue set
            await this.executeRedisCommand(['SREM', `ludo:queue:${targetPlayers}`, cid]);
          } else {
            try {
              const parsed: MatchmakingTicket =
                typeof raw === 'string' ? JSON.parse(raw) : raw;
              if (
                now - parsed.timestamp <= 120000 &&
                parsed.targetPlayers === targetPlayers
              ) {
                validTickets.push(parsed);
              } else {
                await this.executeRedisCommand([
                  'SREM',
                  `ludo:queue:${targetPlayers}`,
                  cid,
                ]);
              }
            } catch {
              await this.executeRedisCommand([
                'SREM',
                `ludo:queue:${targetPlayers}`,
                cid,
              ]);
            }
          }
        }
      }

      validTickets.sort((a, b) => a.timestamp - b.timestamp);
      return validTickets;
    }

    return memoryMatchmakingQueue
      .filter((t) => t.targetPlayers === targetPlayers && now - t.timestamp <= 120000)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  public async dequeueMatchmakingGroup(
    targetPlayers: MatchmakingPlayerCount
  ): Promise<MatchmakingTicket[] | null> {
    const valid = await this.getMatchmakingBracket(targetPlayers);

    // Group distinct player IDs
    const distinct: MatchmakingTicket[] = [];
    const seen = new Set<string>();
    for (const t of valid) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        distinct.push(t);
        if (distinct.length === targetPlayers) break;
      }
    }

    if (distinct.length >= targetPlayers) {
      const selected = distinct.slice(0, targetPlayers);
      for (const t of selected) {
        const idx = memoryMatchmakingQueue.findIndex((item) => item.id === t.id);
        if (idx !== -1) memoryMatchmakingQueue.splice(idx, 1);

        if (this.isUpstashConfigured()) {
          await this.executeRedisCommand([
            'SREM',
            `ludo:queue:${targetPlayers}`,
            t.id,
          ]);
          await this.executeRedisCommand(['DEL', `ludo:ticket:${t.id}`]);
        }
      }
      return selected;
    }
    return null;
  }

  public async dequeueMatchmakingPair(): Promise<[MatchmakingTicket, MatchmakingTicket] | null> {
    const group = await this.dequeueMatchmakingGroup(2);
    if (group && group.length === 2) {
      return [group[0], group[1]];
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
      await this.executeRedisCommand(['SREM', 'ludo:queue:2', clientId]);
      await this.executeRedisCommand(['SREM', 'ludo:queue:3', clientId]);
      await this.executeRedisCommand(['SREM', 'ludo:queue:4', clientId]);
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
