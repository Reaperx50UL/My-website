// @ts-nocheck
/**
 * Standalone WebSocket & HTTP server for Ludo Royale.
 * Can be run independently with: npx tsx scripts/ludo-server.ts
 * Compatible with Railway, Render, Fly.io, or standalone Node.js environments.
 */

import express from 'express';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { chooseAIMove } from '../src/components/experiments/ludo-royale/game/aiStrategy';
import { DEFAULT_HOUSE_RULES, PLAYER_COLORS } from '../src/components/experiments/ludo-royale/game/constants';
import {
  commitDiceRoll,
  completeTurnTransition,
  createInitialGameState,
  executeTokenMove,
  generateFairDiceRoll,
} from '../src/components/experiments/ludo-royale/game/gameEngine';
import {
  GameState,
  HouseRules,
  PlayerColor,
  PlayerConfig,
} from '../src/components/experiments/ludo-royale/game/gameTypes';
import { normalizeRules } from '../src/components/experiments/ludo-royale/game/rules';

interface RoomPlayer {
  id: string;
  ws: WebSocket | null;
  name: string;
  avatar: string;
  color: PlayerColor;
  ready: boolean;
  isHost: boolean;
  isAI: boolean;
  connected: boolean;
}

interface ServerRoom {
  roomCode: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'finished';
  players: RoomPlayer[];
  rules: HouseRules;
  gameState: GameState | null;
}

const rooms = new Map<string, ServerRoom>();
const clientMap = new Map<WebSocket, { id: string; roomCode?: string }>();
const matchmakingQueue: {
  id: string;
  ws: WebSocket;
  name: string;
  avatar: string;
}[] = [];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function serializeRoom(room: ServerRoom) {
  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    status: room.status,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      ready: p.ready,
      isHost: p.isHost,
      isAI: p.isAI,
      connected: p.connected,
    })),
    rules: room.rules,
    gameState: room.gameState,
  };
}

function broadcastRoom(room: ServerRoom) {
  const serialized = serializeRoom(room);
  for (const player of room.players) {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(
        JSON.stringify({
          type: 'ROOM_UPDATED',
          room: serialized,
          assignedColor: player.color,
        })
      );
    }
  }
}

function broadcastGameState(room: ServerRoom) {
  if (!room.gameState) return;
  for (const player of room.players) {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(
        JSON.stringify({
          type: 'GAME_STATE_SYNC',
          gameState: room.gameState,
        })
      );
    }
  }
}

function scheduleRoomEngineTick(room: ServerRoom) {
  if (!room.gameState || room.gameState.turnPhase === 'GAME_OVER') return;

  const state = room.gameState;

  if (state.turnPhase === 'TURN_TRANSITION') {
    setTimeout(() => {
      if (!room.gameState || room.gameState.turnPhase !== 'TURN_TRANSITION') return;
      room.gameState = completeTurnTransition(room.gameState);
      broadcastGameState(room);
      scheduleRoomEngineTick(room);
    }, 900);
    return;
  }

  const activePlayer = state.players[state.activePlayerIndex];
  if (activePlayer.type === 'ai') {
    if (state.turnPhase === 'WAITING_FOR_ROLL') {
      setTimeout(() => {
        if (!room.gameState || room.gameState.turnPhase !== 'WAITING_FOR_ROLL') return;
        const roll = generateFairDiceRoll();
        room.gameState = commitDiceRoll(room.gameState, roll);
        broadcastGameState(room);
        scheduleRoomEngineTick(room);
      }, 850);
    } else if (state.turnPhase === 'SELECTING_TOKEN') {
      setTimeout(() => {
        if (!room.gameState || room.gameState.turnPhase !== 'SELECTING_TOKEN') return;
        const chosen = chooseAIMove(
          room.gameState.legalMoves,
          activePlayer.aiDifficulty || 'medium',
          activePlayer.color,
          room.gameState.players,
          room.gameState.rules
        );
        if (chosen) {
          room.gameState = executeTokenMove(room.gameState, chosen.tokenId);
          broadcastGameState(room);
          scheduleRoomEngineTick(room);
        }
      }, 850);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Ludo Royale Standalone WebSocket Server',
      activeRooms: rooms.size,
      onlineClients: clientMap.size,
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const clientId = `plr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    clientMap.set(ws, { id: clientId });

    ws.send(
      JSON.stringify({
        type: 'WELCOME',
        clientId,
        onlineCount: clientMap.size,
      })
    );

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const meta = clientMap.get(ws);
        if (!meta) return;

        if (msg.type === 'CREATE_ROOM') {
          const roomCode = generateRoomCode();
          const rules = normalizeRules(msg.rules || DEFAULT_HOUSE_RULES);
          const hostPlayer: RoomPlayer = {
            id: meta.id,
            ws,
            name: String(msg.name || 'Host').slice(0, 20),
            avatar: String(msg.avatar || 'crown'),
            color: 'red',
            ready: true,
            isHost: true,
            isAI: false,
            connected: true,
          };
          const room: ServerRoom = {
            roomCode,
            hostId: meta.id,
            status: 'lobby',
            players: [hostPlayer],
            rules,
            gameState: null,
          };
          rooms.set(roomCode, room);
          meta.roomCode = roomCode;
          broadcastRoom(room);
        } else if (msg.type === 'JOIN_ROOM') {
          const code = String(msg.roomCode || '').toUpperCase();
          const room = rooms.get(code);
          if (!room) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                message: `Room "${code}" not found. Check the 6-character room code.`,
              })
            );
            return;
          }
          if (room.status !== 'lobby') {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                message: `Room "${code}" is already in an active match.`,
              })
            );
            return;
          }
          if (room.players.length >= 4) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                message: `Room "${code}" is full (4/4 players).`,
              })
            );
            return;
          }

          const usedColors = new Set(room.players.map((p) => p.color));
          const availableColor =
            PLAYER_COLORS.find((c) => !usedColors.has(c)) || 'yellow';

          room.players.push({
            id: meta.id,
            ws,
            name: String(msg.name || 'Challenger').slice(0, 20),
            avatar: String(msg.avatar || 'knight'),
            color: availableColor,
            ready: true,
            isHost: false,
            isAI: false,
            connected: true,
          });
          meta.roomCode = code;
          broadcastRoom(room);
        } else if (msg.type === 'TOGGLE_READY') {
          const room = rooms.get(String(msg.roomCode || ''));
          if (!room || room.status !== 'lobby') return;
          const p = room.players.find((pl) => pl.id === meta.id);
          if (p) {
            p.ready = !p.ready;
            broadcastRoom(room);
          }
        } else if (msg.type === 'ADD_BOT') {
          const room = rooms.get(String(msg.roomCode || ''));
          if (!room || room.status !== 'lobby' || room.hostId !== meta.id) return;
          if (room.players.length >= 4) return;

          const usedColors = new Set(room.players.map((p) => p.color));
          const availableColor =
            PLAYER_COLORS.find((c) => !usedColors.has(c)) || 'green';
          const botNum = room.players.filter((p) => p.isAI).length + 1;

          room.players.push({
            id: `bot-${Date.now()}-${botNum}`,
            ws: null,
            name: `Grandmaster Bot ${botNum}`,
            avatar: 'falcon',
            color: availableColor,
            ready: true,
            isHost: false,
            isAI: true,
            connected: true,
          });
          broadcastRoom(room);
        } else if (msg.type === 'START_MATCH') {
          const room = rooms.get(String(msg.roomCode || ''));
          if (!room || room.status !== 'lobby' || room.hostId !== meta.id) return;
          if (room.players.length < 2) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                message: 'At least 2 players (or 1 player + 1 AI bot) are required to start.',
              })
            );
            return;
          }

          const configs: PlayerConfig[] = room.players.map((p) => ({
            color: p.color,
            name: p.name,
            avatar: p.avatar,
            type: p.isAI ? 'ai' : 'human',
            aiDifficulty: p.isAI ? 'medium' : undefined,
            connected: p.connected,
            ready: true,
          }));

          room.status = 'playing';
          room.gameState = createInitialGameState({
            id: `online-${room.roomCode}-${Date.now()}`,
            mode: 'friends',
            roomCode: room.roomCode,
            players: configs,
            rules: room.rules,
          });

          broadcastRoom(room);
          broadcastGameState(room);
          scheduleRoomEngineTick(room);
        } else if (msg.type === 'ROLL_DICE') {
          const room = rooms.get(String(msg.roomCode || ''));
          if (!room || !room.gameState || room.status !== 'playing') return;

          const activePlayer =
            room.gameState.players[room.gameState.activePlayerIndex];
          const roomPlayer = room.players.find((p) => p.id === meta.id);

          if (!roomPlayer || roomPlayer.color !== activePlayer.color) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                message: 'Out of turn: Wait for your turn to roll the dice.',
              })
            );
            return;
          }

          if (room.gameState.turnPhase !== 'WAITING_FOR_ROLL') return;

          const rollOutcome = generateFairDiceRoll();
          room.gameState = commitDiceRoll(room.gameState, rollOutcome);
          broadcastGameState(room);
          scheduleRoomEngineTick(room);
        } else if (msg.type === 'MOVE_TOKEN') {
          const room = rooms.get(String(msg.roomCode || ''));
          if (!room || !room.gameState || room.status !== 'playing') return;

          const activePlayer =
            room.gameState.players[room.gameState.activePlayerIndex];
          const roomPlayer = room.players.find((p) => p.id === meta.id);

          if (!roomPlayer || roomPlayer.color !== activePlayer.color) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                message: 'Out of turn: You cannot move another player’s token.',
              })
            );
            return;
          }

          const tokenId = String(msg.tokenId || '');
          const isLegal = room.gameState.legalMoves.some(
            (m) => m.tokenId === tokenId
          );
          if (!isLegal) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                message: 'Illegal move rejected by server.',
              })
            );
            return;
          }

          room.gameState = executeTokenMove(room.gameState, tokenId);
          broadcastGameState(room);
          scheduleRoomEngineTick(room);
        } else if (msg.type === 'JOIN_MATCHMAKING') {
          const existingIdx = matchmakingQueue.findIndex(
            (q) => q.id === meta.id
          );
          if (existingIdx === -1) {
            matchmakingQueue.push({
              id: meta.id,
              ws,
              name: String(msg.name || 'Player').slice(0, 20),
              avatar: String(msg.avatar || 'crown'),
            });
          }

          if (matchmakingQueue.length >= 2) {
            const p1 = matchmakingQueue.shift()!;
            const p2 = matchmakingQueue.shift()!;
            const roomCode = generateRoomCode();
            const room: ServerRoom = {
              roomCode,
              hostId: p1.id,
              status: 'playing',
              rules: DEFAULT_HOUSE_RULES,
              players: [
                {
                  id: p1.id,
                  ws: p1.ws,
                  name: p1.name,
                  avatar: p1.avatar,
                  color: 'red',
                  ready: true,
                  isHost: true,
                  isAI: false,
                  connected: true,
                },
                {
                  id: p2.id,
                  ws: p2.ws,
                  name: p2.name,
                  avatar: p2.avatar,
                  color: 'yellow',
                  ready: true,
                  isHost: false,
                  isAI: false,
                  connected: true,
                },
              ],
              gameState: null,
            };
            room.gameState = createInitialGameState({
              id: `mm-${roomCode}-${Date.now()}`,
              mode: 'matchmaking',
              roomCode,
              players: [
                {
                  color: 'red',
                  name: p1.name,
                  avatar: p1.avatar,
                  type: 'human',
                },
                {
                  color: 'yellow',
                  name: p2.name,
                  avatar: p2.avatar,
                  type: 'human',
                },
              ],
              rules: DEFAULT_HOUSE_RULES,
            });
            rooms.set(roomCode, room);
            const m1 = clientMap.get(p1.ws);
            const m2 = clientMap.get(p2.ws);
            if (m1) m1.roomCode = roomCode;
            if (m2) m2.roomCode = roomCode;

            broadcastRoom(room);
            broadcastGameState(room);
          } else {
            ws.send(
              JSON.stringify({
                type: 'MATCHMAKING_STATUS',
                status: 'searching',
                queueSize: matchmakingQueue.length,
              })
            );
          }
        } else if (msg.type === 'LEAVE_MATCHMAKING') {
          const idx = matchmakingQueue.findIndex((q) => q.id === meta.id);
          if (idx !== -1) matchmakingQueue.splice(idx, 1);
        }
      } catch {
        // Ignore invalid JSON
      }
    });

    ws.on('close', () => {
      const meta = clientMap.get(ws);
      if (meta) {
        const qIdx = matchmakingQueue.findIndex((q) => q.id === meta.id);
        if (qIdx !== -1) matchmakingQueue.splice(qIdx, 1);

        if (meta.roomCode) {
          const room = rooms.get(meta.roomCode);
          if (room) {
            const p = room.players.find((pl) => pl.id === meta.id);
            if (p) {
              p.connected = false;
              broadcastRoom(room);
            }
          }
        }
      }
      clientMap.delete(ws);
    });
  });

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`Ludo Royale WebSocket server listening on port ${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch(console.error);
}

export { startServer };
