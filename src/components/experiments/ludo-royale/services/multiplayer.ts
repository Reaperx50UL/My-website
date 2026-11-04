import {
  GameState,
  HouseRules,
  MatchLifecycleState,
  MatchmakingPlayerCount,
  PlayerColor,
} from '../game/gameTypes';

export interface OnlineRoomPlayer {
  id: string;
  name: string;
  avatar: string;
  color: PlayerColor;
  ready: boolean;
  isHost: boolean;
  isAI: boolean;
  connected: boolean;
  replacedByBot?: boolean;
  originalHumanName?: string;
}

export interface OnlineRoomInfo {
  roomCode: string;
  roomType?: 'friends' | 'matchmaking';
  targetPlayers?: MatchmakingPlayerCount;
  hostId: string;
  status: 'lobby' | 'playing' | 'finished' | 'terminated';
  lifecycle?: MatchLifecycleState;
  humanCount?: number;
  players: OnlineRoomPlayer[];
  rules: HouseRules;
  gameState: GameState | null;
  version?: number;
}

export interface QueuedPlayerSummary {
  id: string;
  name: string;
  avatar: string;
}

export interface BackendStatusInfo {
  type: 'upstash' | 'memory';
  configured: boolean;
  description: string;
}

export type ServerMessage =
  | { type: 'WELCOME'; clientId: string; onlineCount: number; backend?: BackendStatusInfo }
  | { type: 'ROOM_UPDATED'; room: OnlineRoomInfo; assignedColor: PlayerColor }
  | { type: 'GAME_STATE_SYNC'; gameState: GameState }
  | {
      type: 'DICE_ROLLED';
      playerColor: PlayerColor;
      diceValue: number;
      gameState: GameState;
    }
  | {
      type: 'MATCHMAKING_STATUS';
      status: 'idle' | 'searching' | 'matched';
      targetPlayers: MatchmakingPlayerCount;
      foundPlayers: number;
      queueSize: number;
      queuedPlayers: QueuedPlayerSummary[];
      room?: OnlineRoomInfo;
      assignedColor?: PlayerColor;
    }
  | { type: 'ROOM_LEFT'; roomCode: string }
  | { type: 'ROOM_NOTIFICATION'; message: string }
  | {
      type: 'PLAYER_REPLACED_BY_BOT';
      playerName: string;
      color: PlayerColor;
      remainingHumans: number;
      message: string;
    }
  | {
      type: 'MATCH_TERMINATED';
      roomCode: string;
      reasonCode: string;
      title: string;
      message: string;
      returnTo: 'matchmaking' | 'friends' | 'title';
    }
  | {
      type: 'TOKEN_MOVED';
      tokenId: string;
      fromSteps: number;
      toSteps: number;
      capturedIds: string[];
      reachesHome: boolean;
      gameState: GameState;
    }
  | { type: 'CONNECTION_STATUS'; status: 'connected' | 'connecting' | 'offline' }
  | { type: 'ERROR'; message: string };

type Listener = (msg: ServerMessage) => void;

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private listeners: Set<Listener> = new Set();
  private clientId: string = '';
  private currentRoomCode: string = '';
  private assignedColor: PlayerColor = 'red';
  private lastVersion: number = 0;
  private connected: boolean = false;
  private connectionStatus: 'connected' | 'connecting' | 'offline' = 'offline';
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private transportMode: 'ws' | 'sse' = 'sse';
  private backendStatus: BackendStatusInfo | null = null;
  private currentMatchmakingCount: MatchmakingPlayerCount = 2;

  constructor() {
    if (typeof window !== 'undefined') {
      const storedId = window.sessionStorage.getItem('ludo_client_id');
      this.clientId =
        storedId || `plr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      try {
        window.sessionStorage.setItem('ludo_client_id', this.clientId);
      } catch {}

      const storedRoom = window.sessionStorage.getItem('ludo_active_room');
      if (storedRoom) {
        this.currentRoomCode = storedRoom.trim().toUpperCase();
      }
    }
  }

  public getClientId(): string {
    return this.clientId;
  }

  public getCurrentRoomCode(): string {
    return this.currentRoomCode;
  }

  public getAssignedColor(): PlayerColor {
    return this.assignedColor;
  }

  public getConnectionStatus(): 'connected' | 'connecting' | 'offline' {
    return this.connectionStatus;
  }

  public getBackendStatus(): BackendStatusInfo | null {
    return this.backendStatus;
  }

  private setConnectionStatus(status: 'connected' | 'connecting' | 'offline'): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.connected = status === 'connected';
      this.notifyListeners({ type: 'CONNECTION_STATUS', status });
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(data: ServerMessage): void {
    this.listeners.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error('Error in multiplayer event listener:', err);
      }
    });
  }

  public connect(roomCode?: string): void {
    if (typeof window === 'undefined') return;

    if (roomCode) {
      this.currentRoomCode = roomCode.trim().toUpperCase();
      try {
        window.sessionStorage.setItem('ludo_active_room', this.currentRoomCode);
      } catch {}
    }

    const envWsUrl =
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LUDO_WS_URL) ||
      (window as any).__LUDO_WS_URL__;

    if (envWsUrl) {
      this.connectWebSocket(envWsUrl);
    } else {
      this.connectSSE();
    }

    // Always start real-time sync polling loop for guaranteed consistency
    this.startSyncLoop();
  }

  private connectWebSocket(wsUrl: string): void {
    this.transportMode = 'ws';
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.setConnectionStatus('connecting');

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setConnectionStatus('connected');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ServerMessage;
          if (data.type === 'WELCOME') {
            this.clientId = data.clientId;
            if (data.backend) this.backendStatus = data.backend;
          } else if (data.type === 'ROOM_UPDATED') {
            this.assignedColor = data.assignedColor;
            this.currentRoomCode = data.room.roomCode;
          }
          this.notifyListeners(data);
        } catch {
          // Ignore invalid frame
        }
      };

      this.ws.onclose = () => {
        this.setConnectionStatus('offline');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.setConnectionStatus('offline');
      };
    } catch {
      this.setConnectionStatus('offline');
      this.scheduleReconnect();
    }
  }

  private connectSSE(): void {
    this.transportMode = 'sse';
    if (this.sse) {
      this.sse.close();
      this.sse = null;
    }

    this.setConnectionStatus('connecting');

    try {
      const url = `/api/ludo/events?clientId=${encodeURIComponent(
        this.clientId
      )}&roomCode=${encodeURIComponent(this.currentRoomCode)}`;

      this.sse = new EventSource(url);

      this.sse.onopen = () => {
        this.setConnectionStatus('connected');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ServerMessage;
          if (data.type === 'WELCOME') {
            this.clientId = data.clientId;
            if (data.backend) this.backendStatus = data.backend;
          } else if (data.type === 'ROOM_UPDATED') {
            this.assignedColor = data.assignedColor;
            this.currentRoomCode = data.room.roomCode;
          }
          this.notifyListeners(data);
        } catch {
          // Ignore ping or invalid frame
        }
      };

      this.sse.onerror = () => {
        this.setConnectionStatus('offline');
        this.scheduleReconnect();
      };
    } catch {
      this.setConnectionStatus('offline');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.connected) {
        this.connect();
      }
    }, 3000);
  }

  /**
   * Resilient Short-Poll Sync Loop.
   * Guarantees zero missed states across serverless Vercel function instances.
   */
  public startSyncLoop(): void {
    if (this.syncInterval) return;

    const poll = async () => {
      // If idle (no active room and not in matchmaking), skip
      if (!this.currentRoomCode && this.connectionStatus === 'offline') {
        return;
      }

      try {
        const query = new URLSearchParams({
          clientId: this.clientId,
          roomCode: this.currentRoomCode,
          version: String(this.lastVersion),
        });

        const res = await fetch(`/api/ludo/sync?${query.toString()}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          if (res.status === 404 && this.currentRoomCode) {
            // Room expired or deleted
            this.currentRoomCode = '';
            try {
              window.sessionStorage.removeItem('ludo_active_room');
            } catch {}
            this.notifyListeners({
              type: 'ERROR',
              message: 'Room session has expired or was closed by host.',
            });
          }
          return;
        }

        const data = await res.json();
        this.setConnectionStatus('connected');
        if (data.backend) this.backendStatus = data.backend;

        if (data.unchanged) {
          return;
        }

        if (data.status === 'matched' && data.room) {
          this.currentRoomCode = data.room.roomCode;
          this.lastVersion = data.version || 1;
          this.assignedColor = data.assignedColor || 'red';
          try {
            window.sessionStorage.setItem('ludo_active_room', this.currentRoomCode);
          } catch {}
          this.notifyListeners({
            type: 'MATCHMAKING_STATUS',
            status: 'matched',
            targetPlayers: data.room.targetPlayers || this.currentMatchmakingCount,
            foundPlayers: data.room.players.length,
            queueSize: 0,
            queuedPlayers: [],
            room: data.room,
            assignedColor: this.assignedColor,
          });
          this.notifyListeners({
            type: 'ROOM_UPDATED',
            room: data.room,
            assignedColor: this.assignedColor,
          });
          if (data.gameState) {
            this.notifyListeners({
              type: 'GAME_STATE_SYNC',
              gameState: data.gameState,
            });
          }
          return;
        }

        if (data.status === 'searching') {
          this.notifyListeners({
            type: 'MATCHMAKING_STATUS',
            status: 'searching',
            targetPlayers: data.targetPlayers || this.currentMatchmakingCount,
            foundPlayers: data.foundPlayers || 1,
            queueSize: data.queueSize || 1,
            queuedPlayers: data.queuedPlayers || [],
          });
          return;
        }

        if (data.room) {
          this.lastVersion = data.version || 0;
          if (data.assignedColor) this.assignedColor = data.assignedColor;
          this.notifyListeners({
            type: 'ROOM_UPDATED',
            room: data.room,
            assignedColor: this.assignedColor,
          });
          if (data.gameState) {
            this.notifyListeners({
              type: 'GAME_STATE_SYNC',
              gameState: data.gameState,
            });
          }
        }
      } catch {
        // Transient network jitter
      }
    };

    this.syncInterval = setInterval(poll, 700);
    // Trigger immediate first poll
    poll();
  }

  public stopSyncLoop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  public async send(payload: Record<string, unknown>): Promise<boolean> {
    if (
      this.transportMode === 'ws' &&
      this.ws &&
      this.ws.readyState === WebSocket.OPEN
    ) {
      this.ws.send(JSON.stringify(payload));
      return true;
    }

    // Direct HTTP Action Dispatch with Immediate Authoritative State Application
    try {
      const res = await fetch('/api/ludo/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          clientId: this.clientId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        this.notifyListeners({
          type: 'ERROR',
          message: errorData.error || `Server error (${res.status})`,
        });
        return false;
      }

      const result = await res.json();
      if (result.error) {
        this.notifyListeners({
          type: 'ERROR',
          message: result.error,
        });
        return false;
      }

      // Immediately process returned authoritative data
      if (result.room) {
        this.currentRoomCode = result.room.roomCode;
        this.lastVersion = result.room.version || 1;
        if (result.assignedColor) {
          this.assignedColor = result.assignedColor;
        }
        try {
          window.sessionStorage.setItem('ludo_active_room', this.currentRoomCode);
        } catch {}
        this.notifyListeners({
          type: 'ROOM_UPDATED',
          room: result.room,
          assignedColor: this.assignedColor,
        });
      }

      if (result.gameState) {
        if (result.rollOutcome || payload.type === 'ROLL_DICE') {
          this.notifyListeners({
            type: 'DICE_ROLLED',
            playerColor:
              result.gameState.players[result.gameState.activePlayerIndex]
                ?.color || 'red',
            diceValue:
              result.rollOutcome || result.gameState.diceValue || 1,
            gameState: result.gameState,
          });
        } else if (payload.type === 'MOVE_TOKEN' && result.moveResult) {
          this.notifyListeners({
            type: 'TOKEN_MOVED',
            tokenId: result.moveResult.tokenId,
            fromSteps: result.moveResult.fromSteps,
            toSteps: result.moveResult.toSteps,
            capturedIds: result.moveResult.capturedIds || [],
            reachesHome: result.moveResult.reachesHome || false,
            gameState: result.gameState,
          });
        } else {
          this.notifyListeners({
            type: 'GAME_STATE_SYNC',
            gameState: result.gameState,
          });
        }
      }

      if (result.status === 'matched' && result.room) {
        this.currentRoomCode = result.room.roomCode;
        this.lastVersion = result.room.version || 1;
        if (result.assignedColor) {
          this.assignedColor = result.assignedColor;
        }
        try {
          window.sessionStorage.setItem('ludo_active_room', this.currentRoomCode);
        } catch {}
        this.notifyListeners({
          type: 'MATCHMAKING_STATUS',
          status: 'matched',
          targetPlayers: result.room.targetPlayers || this.currentMatchmakingCount,
          foundPlayers: result.room.players.length,
          queueSize: 0,
          queuedPlayers: [],
          room: result.room,
          assignedColor: this.assignedColor,
        });
        this.notifyListeners({
          type: 'ROOM_UPDATED',
          room: result.room,
          assignedColor: this.assignedColor,
        });
        if (result.room.gameState) {
          this.notifyListeners({
            type: 'GAME_STATE_SYNC',
            gameState: result.room.gameState,
          });
        }
      } else if (result.status === 'searching') {
        this.notifyListeners({
          type: 'MATCHMAKING_STATUS',
          status: 'searching',
          targetPlayers: result.targetPlayers || this.currentMatchmakingCount,
          foundPlayers: result.foundPlayers || 1,
          queueSize: result.queueSize || 1,
          queuedPlayers: result.queuedPlayers || [],
        });
      }

      return true;
    } catch {
      this.notifyListeners({
        type: 'ERROR',
        message: 'Network request failed. Check server connection.',
      });
      return false;
    }
  }

  public createRoom(name: string, avatar: string, rules: HouseRules): void {
    this.connect();
    this.send({ type: 'CREATE_ROOM', name, avatar, rules });
  }

  public joinRoom(roomCode: string, name: string, avatar: string): void {
    const code = roomCode.trim().toUpperCase();
    this.currentRoomCode = code;
    this.connect(code);
    this.send({
      type: 'JOIN_ROOM',
      roomCode: code,
      name,
      avatar,
    });
  }

  public toggleReady(roomCode: string): void {
    this.send({ type: 'TOGGLE_READY', roomCode: roomCode.trim().toUpperCase() });
  }

  public addBotToRoom(roomCode: string): void {
    this.send({ type: 'ADD_BOT', roomCode: roomCode.trim().toUpperCase() });
  }

  public startOnlineMatch(roomCode: string): void {
    this.send({ type: 'START_MATCH', roomCode: roomCode.trim().toUpperCase() });
  }

  public requestRollDice(roomCode: string): void {
    this.send({ type: 'ROLL_DICE', roomCode: roomCode.trim().toUpperCase() });
  }

  public requestMoveToken(roomCode: string, tokenId: string): void {
    this.send({
      type: 'MOVE_TOKEN',
      roomCode: roomCode.trim().toUpperCase(),
      tokenId,
    });
  }

  public requestAdvanceTurn(roomCode: string): void {
    this.send({ type: 'ADVANCE_TURN', roomCode: roomCode.trim().toUpperCase() });
  }

  public joinMatchmaking(
    name: string,
    avatar: string,
    targetPlayers: MatchmakingPlayerCount = 2
  ): void {
    this.currentMatchmakingCount = targetPlayers;
    this.currentRoomCode = '';
    this.connect();
    this.send({ type: 'JOIN_MATCHMAKING', name, avatar, targetPlayers });
  }

  public leaveMatchmaking(): void {
    this.send({ type: 'LEAVE_MATCHMAKING' });
    this.notifyListeners({
      type: 'MATCHMAKING_STATUS',
      status: 'idle',
      targetPlayers: this.currentMatchmakingCount,
      foundPlayers: 0,
      queueSize: 0,
      queuedPlayers: [],
    });
  }

  public leaveRoom(roomCode?: string): void {
    const code = (roomCode || this.currentRoomCode || '').trim().toUpperCase();
    if (code) {
      this.send({ type: 'LEAVE_ROOM', roomCode: code });
      this.currentRoomCode = '';
      try {
        window.sessionStorage.removeItem('ludo_active_room');
      } catch {}
    }
    this.stopSyncLoop();
    this.notifyListeners({ type: 'ROOM_LEFT', roomCode: code });
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopSyncLoop();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.sse) {
      this.sse.close();
      this.sse = null;
    }
    this.setConnectionStatus('offline');
  }

  public isConnected(): boolean {
    return this.connected;
  }
}

export const multiplayerClient = new MultiplayerClient();
