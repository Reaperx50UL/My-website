/**
 * Authoritative Server-Side Game and Room Engine for Ludo Royale.
 * Enforces all game rules, dice generation, legal token moves, bot ticks, and room state persistence.
 */

import { chooseAIMove } from '../game/aiStrategy';
import { DEFAULT_HOUSE_RULES, PLAYER_COLORS } from '../game/constants';
import {
  commitDiceRoll,
  completeTurnTransition,
  createInitialGameState,
  executeTokenMove,
  generateFairDiceRoll,
} from '../game/gameEngine';
import {
  GameState,
  HouseRules,
  PlayerColor,
  PlayerConfig,
} from '../game/gameTypes';
import { normalizeRules } from '../game/rules';
import {
  MatchmakingTicket,
  multiplayerStore,
  RoomPlayer,
  ServerMessage,
  ServerRoom,
} from './store';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function broadcastRoomUpdate(room: ServerRoom): void {
  for (const player of room.players) {
    const msg: ServerMessage = {
      type: 'ROOM_UPDATED',
      room,
      assignedColor: player.color,
    };
    multiplayerStore.broadcast(`client:${player.id}`, msg);
    multiplayerStore.broadcast(`room:${room.roomCode}`, msg);
  }
}

export function broadcastGameState(room: ServerRoom): void {
  if (!room.gameState) return;
  const msg: ServerMessage = {
    type: 'GAME_STATE_SYNC',
    gameState: room.gameState,
  };
  multiplayerStore.broadcast(`room:${room.roomCode}`, msg);
}

/**
 * Executes automatic AI moves or turn transitions for rooms running on the server.
 */
export async function scheduleServerRoomTick(room: ServerRoom): Promise<void> {
  if (!room.gameState || room.gameState.turnPhase === 'GAME_OVER') return;

  const state = room.gameState;

  if (state.turnPhase === 'TURN_TRANSITION') {
    setTimeout(async () => {
      const freshRoom = await multiplayerStore.getRoom(room.roomCode);
      if (!freshRoom || !freshRoom.gameState || freshRoom.gameState.turnPhase !== 'TURN_TRANSITION') {
        return;
      }
      freshRoom.gameState = completeTurnTransition(freshRoom.gameState);
      await multiplayerStore.saveRoom(freshRoom);
      broadcastGameState(freshRoom);
      scheduleServerRoomTick(freshRoom);
    }, 900);
    return;
  }

  const activePlayer = state.players[state.activePlayerIndex];
  if (activePlayer && activePlayer.type === 'ai') {
    if (state.turnPhase === 'WAITING_FOR_ROLL') {
      setTimeout(async () => {
        const freshRoom = await multiplayerStore.getRoom(room.roomCode);
        if (!freshRoom || !freshRoom.gameState || freshRoom.gameState.turnPhase !== 'WAITING_FOR_ROLL') {
          return;
        }
        const roll = generateFairDiceRoll();
        freshRoom.gameState = commitDiceRoll(freshRoom.gameState, roll);
        await multiplayerStore.saveRoom(freshRoom);
        broadcastGameState(freshRoom);
        scheduleServerRoomTick(freshRoom);
      }, 850);
    } else if (state.turnPhase === 'SELECTING_TOKEN') {
      setTimeout(async () => {
        const freshRoom = await multiplayerStore.getRoom(room.roomCode);
        if (!freshRoom || !freshRoom.gameState || freshRoom.gameState.turnPhase !== 'SELECTING_TOKEN') {
          return;
        }
        const activeBot = freshRoom.gameState.players[freshRoom.gameState.activePlayerIndex];
        const chosen = chooseAIMove(
          freshRoom.gameState.legalMoves,
          activeBot.aiDifficulty || 'medium',
          activeBot.color,
          freshRoom.gameState.players,
          freshRoom.gameState.rules
        );
        if (chosen) {
          freshRoom.gameState = executeTokenMove(freshRoom.gameState, chosen.tokenId);
          await multiplayerStore.saveRoom(freshRoom);
          broadcastGameState(freshRoom);
          scheduleServerRoomTick(freshRoom);
        }
      }, 850);
    }
  }
}

export async function handleCreateRoom(
  hostId: string,
  name: string,
  avatar: string,
  rules?: HouseRules
): Promise<{ success: boolean; room?: ServerRoom; error?: string }> {
  multiplayerStore.logConfigStatusOnce();
  const roomCode = generateRoomCode();
  const normalized = normalizeRules(rules || DEFAULT_HOUSE_RULES);

  const hostPlayer: RoomPlayer = {
    id: hostId,
    name: String(name || 'Host').slice(0, 20),
    avatar: String(avatar || 'crown'),
    color: 'red',
    ready: true,
    isHost: true,
    isAI: false,
    connected: true,
    lastSeen: Date.now(),
  };

  const room: ServerRoom = {
    roomCode,
    hostId,
    status: 'lobby',
    players: [hostPlayer],
    rules: normalized,
    gameState: null,
    updatedAt: Date.now(),
  };

  await multiplayerStore.saveRoom(room);
  broadcastRoomUpdate(room);
  return { success: true, room };
}

export async function handleJoinRoom(
  roomCode: string,
  playerId: string,
  name: string,
  avatar: string
): Promise<{ success: boolean; room?: ServerRoom; error?: string }> {
  multiplayerStore.logConfigStatusOnce();
  const code = roomCode.trim().toUpperCase();
  const room = await multiplayerStore.getRoom(code);

  if (!room) {
    return {
      success: false,
      error: `Room "${code}" not found. Verify the 6-character room code.`,
    };
  }

  if (room.status !== 'lobby') {
    return {
      success: false,
      error: `Room "${code}" is already in an active match.`,
    };
  }

  const existingPlayer = room.players.find((p) => p.id === playerId);
  if (existingPlayer) {
    existingPlayer.connected = true;
    existingPlayer.lastSeen = Date.now();
    await multiplayerStore.saveRoom(room);
    broadcastRoomUpdate(room);
    return { success: true, room };
  }

  if (room.players.length >= 4) {
    return {
      success: false,
      error: `Room "${code}" is full (4/4 players).`,
    };
  }

  const usedColors = new Set(room.players.map((p) => p.color));
  const availableColor =
    PLAYER_COLORS.find((c) => !usedColors.has(c)) || 'yellow';

  room.players.push({
    id: playerId,
    name: String(name || 'Challenger').slice(0, 20),
    avatar: String(avatar || 'knight'),
    color: availableColor,
    ready: true,
    isHost: false,
    isAI: false,
    connected: true,
    lastSeen: Date.now(),
  });

  await multiplayerStore.saveRoom(room);
  broadcastRoomUpdate(room);
  return { success: true, room };
}

export async function handleToggleReady(
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; room?: ServerRoom }> {
  const room = await multiplayerStore.getRoom(roomCode);
  if (!room || room.status !== 'lobby') return { success: false };

  const p = room.players.find((pl) => pl.id === playerId);
  if (p) {
    p.ready = !p.ready;
    await multiplayerStore.saveRoom(room);
    broadcastRoomUpdate(room);
    return { success: true, room };
  }
  return { success: false };
}

export async function handleAddBot(
  roomCode: string,
  hostId: string
): Promise<{ success: boolean; room?: ServerRoom; error?: string }> {
  const room = await multiplayerStore.getRoom(roomCode);
  if (!room || room.status !== 'lobby' || room.hostId !== hostId) {
    return { success: false, error: 'Only the room host can add bots.' };
  }
  if (room.players.length >= 4) {
    return { success: false, error: 'Room is already at full capacity.' };
  }

  const usedColors = new Set(room.players.map((p) => p.color));
  const availableColor =
    PLAYER_COLORS.find((c) => !usedColors.has(c)) || 'green';
  const botNum = room.players.filter((p) => p.isAI).length + 1;

  room.players.push({
    id: `bot-${Date.now()}-${botNum}`,
    name: `Grandmaster Bot ${botNum}`,
    avatar: 'falcon',
    color: availableColor,
    ready: true,
    isHost: false,
    isAI: true,
    connected: true,
    lastSeen: Date.now(),
  });

  await multiplayerStore.saveRoom(room);
  broadcastRoomUpdate(room);
  return { success: true, room };
}

export async function handleStartMatch(
  roomCode: string,
  hostId: string
): Promise<{ success: boolean; room?: ServerRoom; error?: string }> {
  const room = await multiplayerStore.getRoom(roomCode);
  if (!room || room.status !== 'lobby' || room.hostId !== hostId) {
    return { success: false, error: 'Only the host can start the match.' };
  }
  if (room.players.length < 2) {
    return {
      success: false,
      error: 'At least 2 players (or 1 human + 1 AI bot) are required to start.',
    };
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

  await multiplayerStore.saveRoom(room);
  broadcastRoomUpdate(room);
  broadcastGameState(room);
  scheduleServerRoomTick(room);

  return { success: true, room };
}

export async function handleRollDice(
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; gameState?: GameState; error?: string }> {
  const room = await multiplayerStore.getRoom(roomCode);
  if (!room || !room.gameState || room.status !== 'playing') {
    return { success: false, error: 'No active match found for this room.' };
  }

  const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
  const roomPlayer = room.players.find((p) => p.id === playerId);

  // Authoritative turn validation on server
  if (!roomPlayer || roomPlayer.color !== activePlayer.color) {
    return {
      success: false,
      error: 'Out of turn: Wait for your turn to roll the dice.',
    };
  }

  if (room.gameState.turnPhase !== 'WAITING_FOR_ROLL') {
    return { success: false, error: 'Dice roll is not available at this moment.' };
  }

  // Server generates fair dice outcome
  const rollOutcome = generateFairDiceRoll();
  room.gameState = commitDiceRoll(room.gameState, rollOutcome);
  await multiplayerStore.saveRoom(room);
  broadcastGameState(room);
  scheduleServerRoomTick(room);

  return { success: true, gameState: room.gameState };
}

export async function handleMoveToken(
  roomCode: string,
  playerId: string,
  tokenId: string
): Promise<{ success: boolean; gameState?: GameState; error?: string }> {
  const room = await multiplayerStore.getRoom(roomCode);
  if (!room || !room.gameState || room.status !== 'playing') {
    return { success: false, error: 'No active match found for this room.' };
  }

  const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
  const roomPlayer = room.players.find((p) => p.id === playerId);

  if (!roomPlayer || roomPlayer.color !== activePlayer.color) {
    return {
      success: false,
      error: 'Out of turn: You cannot move another player’s token.',
    };
  }

  const isLegal = room.gameState.legalMoves.some((m) => m.tokenId === tokenId);
  if (!isLegal) {
    return { success: false, error: 'Illegal move rejected by server.' };
  }

  room.gameState = executeTokenMove(room.gameState, tokenId);
  await multiplayerStore.saveRoom(room);
  broadcastGameState(room);
  scheduleServerRoomTick(room);

  return { success: true, gameState: room.gameState };
}

export async function handleJoinMatchmaking(
  playerId: string,
  name: string,
  avatar: string
): Promise<{ status: 'searching' | 'matched'; queueSize: number; room?: ServerRoom }> {
  const ticket: MatchmakingTicket = {
    id: playerId,
    name: String(name || 'Player').slice(0, 20),
    avatar: String(avatar || 'crown'),
    timestamp: Date.now(),
  };

  const queueSize = await multiplayerStore.enqueueMatchmaking(ticket);
  const pair = await multiplayerStore.dequeueMatchmakingPair();

  if (pair) {
    const [p1, p2] = pair;
    const roomCode = generateRoomCode();
    const room: ServerRoom = {
      roomCode,
      hostId: p1.id,
      status: 'playing',
      rules: DEFAULT_HOUSE_RULES,
      players: [
        {
          id: p1.id,
          name: p1.name,
          avatar: p1.avatar,
          color: 'red',
          ready: true,
          isHost: true,
          isAI: false,
          connected: true,
          lastSeen: Date.now(),
        },
        {
          id: p2.id,
          name: p2.name,
          avatar: p2.avatar,
          color: 'yellow',
          ready: true,
          isHost: false,
          isAI: false,
          connected: true,
          lastSeen: Date.now(),
        },
      ],
      gameState: null,
      updatedAt: Date.now(),
    };

    room.gameState = createInitialGameState({
      id: `mm-${roomCode}-${Date.now()}`,
      mode: 'matchmaking',
      roomCode,
      players: [
        { color: 'red', name: p1.name, avatar: p1.avatar, type: 'human' },
        { color: 'yellow', name: p2.name, avatar: p2.avatar, type: 'human' },
      ],
      rules: DEFAULT_HOUSE_RULES,
    });

    await multiplayerStore.saveRoom(room);
    broadcastRoomUpdate(room);
    broadcastGameState(room);

    return { status: 'matched', queueSize: 0, room };
  }

  return { status: 'searching', queueSize };
}

export async function handleLeaveMatchmaking(playerId: string): Promise<void> {
  await multiplayerStore.removeMatchmaking(playerId);
}
