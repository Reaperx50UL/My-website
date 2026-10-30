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
  // Use unambiguous uppercase characters (omits 0, O, 1, I)
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
 * Handles automatic transitions and AI bot actions in the room.
 * Runs safely on both persistent Node servers and serverless sync polls.
 */
export async function processRoomTick(room: ServerRoom): Promise<boolean> {
  if (!room.gameState || room.gameState.turnPhase === 'GAME_OVER') return false;

  let modified = false;
  const state = room.gameState;

  // 1. Advance turn transition if pending
  if (state.turnPhase === 'TURN_TRANSITION') {
    room.gameState = completeTurnTransition(state);
    modified = true;
  }

  // 2. Execute AI Bot turn if current active player is AI
  const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
  if (activePlayer && activePlayer.type === 'ai') {
    if (room.gameState.turnPhase === 'WAITING_FOR_ROLL') {
      const roll = generateFairDiceRoll();
      room.gameState = commitDiceRoll(room.gameState, roll);
      modified = true;
    } else if (room.gameState.turnPhase === 'SELECTING_TOKEN') {
      const chosen = chooseAIMove(
        room.gameState.legalMoves,
        activePlayer.aiDifficulty || 'medium',
        activePlayer.color,
        room.gameState.players,
        room.gameState.rules
      );
      if (chosen) {
        room.gameState = executeTokenMove(room.gameState, chosen.tokenId);
        modified = true;
      }
    }
  }

  if (modified) {
    await multiplayerStore.saveRoom(room);
    broadcastGameState(room);
  }

  return modified;
}

export async function handleCreateRoom(
  hostId: string,
  name: string,
  avatar: string,
  rules?: HouseRules
): Promise<{ success: boolean; room?: ServerRoom; assignedColor?: PlayerColor; error?: string }> {
  multiplayerStore.logConfigStatusOnce();
  const roomCode = generateRoomCode();
  const normalized = normalizeRules(rules || DEFAULT_HOUSE_RULES);

  const hostPlayer: RoomPlayer = {
    id: hostId,
    name: String(name || 'Host').trim().slice(0, 20) || 'Host',
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
    version: 1,
  };

  await multiplayerStore.saveRoom(room);
  broadcastRoomUpdate(room);

  return { success: true, room, assignedColor: 'red' };
}

export async function handleJoinRoom(
  roomCode: string,
  playerId: string,
  name: string,
  avatar: string
): Promise<{ success: boolean; room?: ServerRoom; assignedColor?: PlayerColor; error?: string }> {
  multiplayerStore.logConfigStatusOnce();
  const code = (roomCode || '').trim().toUpperCase();

  if (!code || code.length !== 6 || !/^[A-Z0-9]{6}$/.test(code)) {
    return {
      success: false,
      error: 'Invalid room code format. Room code must be 6 alphanumeric characters.',
    };
  }

  const room = await multiplayerStore.getRoom(code);

  if (!room) {
    return {
      success: false,
      error: `Room "${code}" not found. Verify the 6-character room code.`,
    };
  }

  // Check if player is reconnecting to an existing seat
  const existingPlayer = room.players.find((p) => p.id === playerId);
  if (existingPlayer) {
    existingPlayer.connected = true;
    existingPlayer.lastSeen = Date.now();
    await multiplayerStore.saveRoom(room);
    broadcastRoomUpdate(room);
    if (room.gameState) {
      broadcastGameState(room);
    }
    return { success: true, room, assignedColor: existingPlayer.color };
  }

  // For a new player attempting to join:
  if (room.status !== 'lobby') {
    return {
      success: false,
      error: `Room "${code}" is already in an active match. Private rooms cannot be joined after match starts.`,
    };
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

  const newPlayer: RoomPlayer = {
    id: playerId,
    name: String(name || 'Challenger').trim().slice(0, 20) || 'Challenger',
    avatar: String(avatar || 'knight'),
    color: availableColor,
    ready: true,
    isHost: false,
    isAI: false,
    connected: true,
    lastSeen: Date.now(),
  };

  room.players.push(newPlayer);
  await multiplayerStore.saveRoom(room);
  broadcastRoomUpdate(room);

  return { success: true, room, assignedColor: availableColor };
}

export async function handleLeaveRoom(
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; error?: string }> {
  const code = (roomCode || '').trim().toUpperCase();
  const room = await multiplayerStore.getRoom(code);
  if (!room) return { success: true };

  const playerIdx = room.players.findIndex((p) => p.id === playerId);
  if (playerIdx === -1) return { success: true };

  const isHost = room.players[playerIdx].isHost;
  room.players.splice(playerIdx, 1);

  // If room is empty of human players, delete room
  const remainingHumans = room.players.filter((p) => !p.isAI);
  if (remainingHumans.length === 0) {
    await multiplayerStore.deleteRoom(code);
    return { success: true };
  }

  // If host left, assign host to first remaining human player
  if (isHost && remainingHumans.length > 0) {
    remainingHumans[0].isHost = true;
    room.hostId = remainingHumans[0].id;
  }

  await multiplayerStore.saveRoom(room);
  broadcastRoomUpdate(room);

  return { success: true };
}

export async function handleToggleReady(
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; room?: ServerRoom; error?: string }> {
  const code = (roomCode || '').trim().toUpperCase();
  const room = await multiplayerStore.getRoom(code);
  if (!room || room.status !== 'lobby') {
    return { success: false, error: 'Cannot toggle ready outside lobby.' };
  }

  const p = room.players.find((pl) => pl.id === playerId);
  if (p) {
    p.ready = !p.ready;
    await multiplayerStore.saveRoom(room);
    broadcastRoomUpdate(room);
    return { success: true, room };
  }
  return { success: false, error: 'Player not found in room.' };
}

export async function handleAddBot(
  roomCode: string,
  hostId: string
): Promise<{ success: boolean; room?: ServerRoom; error?: string }> {
  const code = (roomCode || '').trim().toUpperCase();
  const room = await multiplayerStore.getRoom(code);
  if (!room || room.status !== 'lobby' || room.hostId !== hostId) {
    return { success: false, error: 'Only the room host can add bots.' };
  }
  if (room.players.length >= 4) {
    return { success: false, error: 'Room is already at full capacity (4/4 players).' };
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
): Promise<{ success: boolean; room?: ServerRoom; gameState?: GameState; error?: string }> {
  const code = (roomCode || '').trim().toUpperCase();
  const room = await multiplayerStore.getRoom(code);
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

  return { success: true, room, gameState: room.gameState };
}

export async function handleRollDice(
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; gameState?: GameState; error?: string }> {
  const code = (roomCode || '').trim().toUpperCase();
  const room = await multiplayerStore.getRoom(code);
  if (!room || !room.gameState || room.status !== 'playing') {
    return { success: false, error: 'No active match found for this room.' };
  }

  const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
  const roomPlayer = room.players.find((p) => p.id === playerId);

  // Authoritative turn validation on server
  if (!roomPlayer || roomPlayer.color !== activePlayer.color) {
    return {
      success: false,
      error: `Out of turn: It is currently ${activePlayer.name} (${activePlayer.color.toUpperCase()})'s turn to roll.`,
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

  return { success: true, gameState: room.gameState };
}

export async function handleMoveToken(
  roomCode: string,
  playerId: string,
  tokenId: string
): Promise<{ success: boolean; gameState?: GameState; error?: string }> {
  const code = (roomCode || '').trim().toUpperCase();
  const room = await multiplayerStore.getRoom(code);
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

  if (room.gameState.turnPhase !== 'SELECTING_TOKEN') {
    return { success: false, error: 'Moving a token is not valid at this stage.' };
  }

  const isLegal = room.gameState.legalMoves.some((m) => m.tokenId === tokenId);
  if (!isLegal) {
    return { success: false, error: 'Illegal move rejected by server.' };
  }

  room.gameState = executeTokenMove(room.gameState, tokenId);
  await multiplayerStore.saveRoom(room);
  broadcastGameState(room);

  return { success: true, gameState: room.gameState };
}

export async function handleAdvanceTurn(
  roomCode: string
): Promise<{ success: boolean; gameState?: GameState }> {
  const code = (roomCode || '').trim().toUpperCase();
  const room = await multiplayerStore.getRoom(code);
  if (!room || !room.gameState || room.status !== 'playing') {
    return { success: false };
  }

  const changed = await processRoomTick(room);
  return { success: changed, gameState: room.gameState };
}

export async function handleJoinMatchmaking(
  playerId: string,
  name: string,
  avatar: string
): Promise<{
  status: 'searching' | 'matched';
  queueSize: number;
  room?: ServerRoom;
  assignedColor?: PlayerColor;
}> {
  // First, check if player is already matched from another request
  const existingMatch = await multiplayerStore.getMatchForClient(playerId);
  if (existingMatch) {
    const existingRoom = await multiplayerStore.getRoom(existingMatch.roomCode);
    if (existingRoom) {
      return {
        status: 'matched',
        queueSize: 0,
        room: existingRoom,
        assignedColor: existingMatch.color,
      };
    }
  }

  const ticket: MatchmakingTicket = {
    id: playerId,
    name: String(name || 'Player').trim().slice(0, 20) || 'Player',
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
      version: 1,
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

    // Save match records for both players so each client can sync and join
    await multiplayerStore.setMatchForClient(p1.id, {
      roomCode,
      color: 'red',
      matchedAt: Date.now(),
    });
    await multiplayerStore.setMatchForClient(p2.id, {
      roomCode,
      color: 'yellow',
      matchedAt: Date.now(),
    });

    broadcastRoomUpdate(room);
    broadcastGameState(room);

    const myColor: PlayerColor = playerId === p1.id ? 'red' : 'yellow';
    return { status: 'matched', queueSize: 0, room, assignedColor: myColor };
  }

  return { status: 'searching', queueSize };
}

export async function handleLeaveMatchmaking(playerId: string): Promise<void> {
  await multiplayerStore.removeMatchmaking(playerId);
}
