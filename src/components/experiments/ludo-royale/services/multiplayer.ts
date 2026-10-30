import { GameState, HouseRules, PlayerColor } from '../game/gameTypes';

export interface OnlineRoomPlayer {
  id: string;
  name: string;
  avatar: string;
  color: PlayerColor;
  ready: boolean;
  isHost: boolean;
  isAI: boolean;
  connected: boolean;
}

export interface OnlineRoomInfo {
  roomCode: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'finished';
  players: OnlineRoomPlayer[];
  rules: HouseRules;
  gameState: GameState | null;
}

export type ServerMessage =
  | { type: 'WELCOME'; clientId: string; onlineCount: number }
  | { type: 'ROOM_UPDATED'; room: OnlineRoomInfo; assignedColor: PlayerColor }
  | { type: 'GAME_STATE_SYNC'; gameState: GameState }
  | { type: 'MATCHMAKING_STATUS'; status: 'searching' | 'matched'; queueSize: number }
  | { type: 'ERROR'; message: string };

type Listener = (msg: ServerMessage) => void;

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private listeners: Set<Listener> = new Set();
  private clientId: string = '';
  private currentRoomCode: string = '';
  private connected: boolean = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private transportMode: 'ws' | 'sse' = 'sse';

  constructor() {
    if (typeof window !== 'undefined') {
      const storedId = window.sessionStorage.getItem('ludo_client_id');
      this.clientId = storedId || `plr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      try {
        window.sessionStorage.setItem('ludo_client_id', this.clientId);
      } catch {}
    }
  }

  public connect(roomCode?: string): void {
    if (typeof window === 'undefined') return;

    if (roomCode) {
      this.currentRoomCode = roomCode.trim().toUpperCase();
    }

    const envWsUrl =
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LUDO_WS_URL) ||
      (window as any).__LUDO_WS_URL__;

    if (envWsUrl) {
      this.connectWebSocket(envWsUrl);
    } else {
      this.connectSSE();
    }
  }

  private connectWebSocket(wsUrl: string): void {
    this.transportMode = 'ws';
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
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
          }
          this.notifyListeners(data);
        } catch {
          // Ignore invalid frame
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.connected = false;
      };
    } catch {
      this.connected = false;
      this.scheduleReconnect();
    }
  }

  private connectSSE(): void {
    this.transportMode = 'sse';
    if (this.sse) {
      // If room changed, close and reconnect
      this.sse.close();
      this.sse = null;
    }

    try {
      const url = `/api/ludo/events?clientId=${encodeURIComponent(this.clientId)}&roomCode=${encodeURIComponent(
        this.currentRoomCode
      )}`;

      this.sse = new EventSource(url);

      this.sse.onopen = () => {
        this.connected = true;
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
          }
          this.notifyListeners(data);
        } catch {
          // Ignore comment or invalid ping
        }
      };

      this.sse.onerror = () => {
        this.connected = false;
        this.scheduleReconnect();
      };
    } catch {
      this.connected = false;
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
    }, 3500);
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

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.sse) {
      this.sse.close();
      this.sse = null;
    }
    this.connected = false;
  }

  public isConnected(): boolean {
    if (this.transportMode === 'ws') {
      return this.connected && this.ws?.readyState === WebSocket.OPEN;
    }
    return this.connected && this.sse?.readyState === EventSource.OPEN;
  }

  public getClientId(): string {
    return this.clientId;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async send(payload: Record<string, unknown>): Promise<boolean> {
    if (this.transportMode === 'ws' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      return true;
    }

    // Serverless HTTP Action Dispatch for Vercel
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
    const attempt = () => {
      this.send({ type: 'CREATE_ROOM', name, avatar, rules });
    };
    if (this.isConnected()) {
      attempt();
    } else {
      setTimeout(attempt, 200);
    }
  }

  public joinRoom(roomCode: string, name: string, avatar: string): void {
    const code = roomCode.trim().toUpperCase();
    this.currentRoomCode = code;
    this.connect(code);
    const attempt = () => {
      this.send({
        type: 'JOIN_ROOM',
        roomCode: code,
        name,
        avatar,
      });
    };
    if (this.isConnected()) {
      attempt();
    } else {
      setTimeout(attempt, 200);
    }
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
    this.send({ type: 'MOVE_TOKEN', roomCode: roomCode.trim().toUpperCase(), tokenId });
  }

  public joinMatchmaking(name: string, avatar: string): void {
    this.connect();
    const attempt = () => {
      this.send({ type: 'JOIN_MATCHMAKING', name, avatar });
    };
    if (this.isConnected()) {
      attempt();
    } else {
      setTimeout(attempt, 200);
    }
  }

  public leaveMatchmaking(): void {
    this.send({ type: 'LEAVE_MATCHMAKING' });
  }
}

export const multiplayerClient = new MultiplayerClient();
