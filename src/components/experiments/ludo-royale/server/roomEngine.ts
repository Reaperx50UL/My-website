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
  MatchLifecycleState,
  MatchmakingPlayerCount,
  PlayerColor,
  PlayerConfig,
} from '../game/gameTypes';
import {
  AuthoritativeRoom,
  countConnectedHumanPlayers,
  createMatchedOnlineRoom,
  createPrivateLobbyRoom,
  resolvePlayerDeparture,
} from '../game/multiplayerLogic';
import { normalizeRules } from '../game/rules';
import {
  MatchmakingTicket,
  multiplayerStore,
  QueuedPlayerSummary,
  RoomPlayer,
  ServerMessage,
  ServerRoom,
} from './store';

export function generateRoomCode(): string {
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
      version: room.version,
    };
    multiplayerStore.broadcast(`client:${player.id}`, msg);
  }
}

export function broadcastGameState(room: ServerRoom): void {
  if (!room.gameState) return;
  const msg: ServerMessage = {
    type: 'GAME_STATE_SYNC',
    gameState: room.gameState,
    version: room.version,
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

  // 1. Advance turn transition if pending (after sufficient delay for dice roll animation to complete)
  if (state.turnPhase === 'TURN_TRANSITION') {
    const lastEvent = state.eventLog?.[0];
    const elapsed = lastEvent?.timestamp ? Date.now() - lastEvent.timestamp : 9999;
    if (elapsed >= 1100) {
      room.gameState = completeTurnTransition(state);
      room.version = (room.version || 1) + 1;
      room.updatedAt = Date.now();
      modified = true;
    }
  }

  // 2. Execute AI Bot turn if current active player is AI
  const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
  if (activePlayer && activePlayer.type === 'ai') {
    if (room.gameState.turnPhase === 'WAITING_FOR_ROLL') {
      const roll = generateFairDiceRoll();
      room.gameState = commitDiceRoll(room.gameState, roll);
      room.version = (room.version || 1) + 1;
      room.updatedAt = Date.now();
      await multiplayerStore.saveRoom(room);
      const diceMsg: ServerMessage = {
        type: 'DICE_ROLLED',
        playerColor: activePlayer.color,
        diceValue: roll,
        gameState: room.gameState,
        version: room.version,
      };
      multiplayerStore.broadcast(`room:${room.roomCode}`, diceMsg);
      broadcastGameState(room);
      return true;
    } else if (room.gameState.turnPhase === 'SELECTING_TOKEN') {
      const chosen = chooseAIMove(
        room.gameState.legalMoves,
        activePlayer.aiDifficulty || 'medium',
        activePlayer.color,
        room.gameState.players,
        room.gameState.rules
      );
      if (chosen) {
        const moveDetails = room.gameState.legalMoves.find(
          (m) => m.tokenId === chosen.tokenId
        );
        room.gameState = executeTokenMove(room.gameState, chosen.tokenId);
        room.version = (room.version || 1) + 1;
        room.updatedAt = Date.now();
        await multiplayerStore.saveRoom(room);
        if (moveDetails) {
          const moveMsg: ServerMessage = {
            type: 'TOKEN_MOVED',
            tokenId: chosen.tokenId,
            fromSteps: moveDetails.fromSteps,
            toSteps: moveDetails.toSteps,
            capturedIds: moveDetails.capturesTokenIds || [],
            reachesHome: moveDetails.reachesHome || false,
            gameState: room.gameState,
            version: room.version,
          };
          multiplayerStore.broadcast(`room:${room.roomCode}`, moveMsg);
        }
        broadcastGameState(room);
        return true;
      }
    }
  }

  if (modified) {
    await multiplayerStore.saveRoom(room);
    broadcastRoomUpdate(room);
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

  // Always clear matchmaking ticket & matched client mapping for the departing player
  await multiplayerStore.clearMatchForClient(playerId);
  await multiplayerStore.removeMatchmaking(playerId);

  // Notify the leaving player directly
  multiplayerStore.broadcast(`client:${playerId}`, {
    type: 'ROOM_LEFT',
    roomCode: code,
  });

  // Ensure roomType and targetPlayers exist on room
  if (!room.roomType) {
    room.roomType =
      room.gameState?.mode === 'matchmaking' ? 'matchmaking' : 'friends';
  }
  if (!room.targetPlayers) {
    room.targetPlayers = (
      room.players.length >= 3 ? room.players.length : 2
    ) as MatchmakingPlayerCount;
  }

  const res = resolvePlayerDeparture(room as unknown as AuthoritativeRoom, playerId);

  if (res.action === 'terminate_match') {
    // Clear match records and queues for all players in this match
    for (const p of room.players) {
      await multiplayerStore.clearMatchForClient(p.id);
      await multiplayerStore.removeMatchmaking(p.id);
    }

    const nextVersion = (room.version || 1) + 1;
    const termMsg: ServerMessage = {
      type: 'MATCH_TERMINATED',
      roomCode: code,
      reasonCode: res.reasonCode,
      title: res.notifyTitle,
      message: res.notifyMessage,
      returnTo: res.returnTo,
      version: nextVersion,
    };
    multiplayerStore.broadcast(`room:${code}`, termMsg);
    for (const p of room.players) {
      multiplayerStore.broadcast(`client:${p.id}`, termMsg);
    }

    if (room.status === 'lobby') {
      await multiplayerStore.deleteRoom(code);
    } else {
      // For active playing matches, retain room temporarily with 'terminated' status
      // so any polling clients across distributed serverless instances receive the termination
      const terminatedRoom: ServerRoom = {
        ...room,
        status: 'terminated',
        lifecycle: 'match_terminated',
        terminatedReason: res.reasonCode,
        terminatedTitle: res.notifyTitle,
        terminatedMessage: res.notifyMessage,
        returnTo: res.returnTo,
        version: nextVersion,
        updatedAt: Date.now(),
      };
      await multiplayerStore.saveRoom(terminatedRoom);
    }

    return { success: true };
  }

  if (res.action === 'replace_with_bot') {
    const updatedRoom: ServerRoom = {
      ...room,
      players: res.room.players.map((p) => ({
        ...p,
        lastSeen: Date.now(),
      })),
      gameState: res.room.gameState,
      status: res.room.status,
      lifecycle: res.room.lifecycle,
      version: (room.version || 1) + 1,
      updatedAt: Date.now(),
    };
    await multiplayerStore.saveRoom(updatedRoom);

    multiplayerStore.broadcast(`room:${code}`, {
      type: 'PLAYER_REPLACED_BY_BOT',
      playerName: res.departingPlayer.name,
      color: res.replacedColor,
      remainingHumans: res.remainingHumans,
      message: res.notifyMessage,
    });

    broadcastRoomUpdate(updatedRoom);
    broadcastGameState(updatedRoom);

    await processRoomTick(updatedRoom);
    return { success: true };
  }

  if (res.action === 'remove_lobby_player') {
    const updatedRoom: ServerRoom = {
      ...room,
      players: res.room.players.map((p) => ({
        ...p,
        lastSeen: Date.now(),
      })),
      version: (room.version || 1) + 1,
      updatedAt: Date.now(),
    };
    await multiplayerStore.saveRoom(updatedRoom);

    multiplayerStore.broadcast(`room:${code}`, {
      type: 'ROOM_NOTIFICATION',
      message: res.notifyMessage,
    });

    broadcastRoomUpdate(updatedRoom);
    return { success: true };
  }

  if (res.action === 'remove_private_match_player') {
    const updatedRoom: ServerRoom = {
      ...room,
      players: res.room.players.map((p) => ({
        ...p,
        lastSeen: Date.now(),
      })),
      gameState: res.room.gameState,
      version: (room.version || 1) + 1,
      updatedAt: Date.now(),
    };
    await multiplayerStore.saveRoom(updatedRoom);

    multiplayerStore.broadcast(`room:${code}`, {
      type: 'ROOM_NOTIFICATION',
      message: res.notifyMessage,
    });

    broadcastRoomUpdate(updatedRoom);
    broadcastGameState(updatedRoom);
    return { success: true };
  }

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
  room.version = (room.version || 1) + 1;
  room.updatedAt = Date.now();

  await multiplayerStore.saveRoom(room);
  broadcastRoomUpdate(room);
  broadcastGameState(room);

  return { success: true, room, gameState: room.gameState };
}

export async function handleRollDice(
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; gameState?: GameState; rollOutcome?: number; version?: number; room?: ServerRoom; error?: string }> {
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
  room.version = (room.version || 1) + 1;
  room.updatedAt = Date.now();

  await multiplayerStore.saveRoom(room);

  const diceMsg: ServerMessage = {
    type: 'DICE_ROLLED',
    playerColor: activePlayer.color,
    diceValue: rollOutcome,
    gameState: room.gameState,
    version: room.version,
  };
  multiplayerStore.broadcast(`room:${room.roomCode}`, diceMsg);

  return { success: true, gameState: room.gameState, rollOutcome, version: room.version, room };
}

export async function handleMoveToken(
  roomCode: string,
  playerId: string,
  tokenId: string
): Promise<{
  success: boolean;
  gameState?: GameState;
  version?: number;
  room?: ServerRoom;
  moveResult?: {
    tokenId: string;
    fromSteps: number;
    toSteps: number;
    capturedIds: string[];
    reachesHome: boolean;
  };
  error?: string;
}> {
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

  const moveDetails = room.gameState.legalMoves.find((m) => m.tokenId === tokenId);
  if (!moveDetails) {
    return { success: false, error: 'Illegal move rejected by server.' };
  }

  room.gameState = executeTokenMove(room.gameState, tokenId);
  room.version = (room.version || 1) + 1;
  room.updatedAt = Date.now();

  await multiplayerStore.saveRoom(room);
  broadcastGameState(room);

  const moveMsg: ServerMessage = {
    type: 'TOKEN_MOVED',
    tokenId,
    fromSteps: moveDetails.fromSteps,
    toSteps: moveDetails.toSteps,
    capturedIds: moveDetails.capturesTokenIds || [],
    reachesHome: moveDetails.reachesHome || false,
    gameState: room.gameState,
    version: room.version,
  };
  multiplayerStore.broadcast(`room:${room.roomCode}`, moveMsg);

  return {
    success: true,
    gameState: room.gameState,
    version: room.version,
    room,
    moveResult: {
      tokenId,
      fromSteps: moveDetails.fromSteps,
      toSteps: moveDetails.toSteps,
      capturedIds: moveDetails.capturesTokenIds || [],
      reachesHome: moveDetails.reachesHome || false,
    },
  };
}

export async function handleAdvanceTurn(
  roomCode: string
): Promise<{ success: boolean; gameState?: GameState; version?: number; room?: ServerRoom }> {
  const code = (roomCode || '').trim().toUpperCase();
  const room = await multiplayerStore.getRoom(code);
  if (!room || !room.gameState || room.status !== 'playing') {
    return { success: false };
  }

  let changed = false;
  if (room.gameState.turnPhase === 'TURN_TRANSITION') {
    room.gameState = completeTurnTransition(room.gameState);
    changed = true;
    room.version = (room.version || 1) + 1;
    room.updatedAt = Date.now();
    await multiplayerStore.saveRoom(room);
    broadcastRoomUpdate(room);
    broadcastGameState(room);
  } else {
    changed = await processRoomTick(room);
  }

  return { success: changed, gameState: room.gameState, version: room.version, room };
}

export async function handleJoinMatchmaking(
  playerId: string,
  name: string,
  avatar: string,
  targetPlayers: MatchmakingPlayerCount = 2
): Promise<{
  status: 'searching' | 'matched';
  targetPlayers: MatchmakingPlayerCount;
  foundPlayers: number;
  queueSize: number;
  queuedPlayers: QueuedPlayerSummary[];
  room?: ServerRoom;
  assignedColor?: PlayerColor;
}> {
  // First, check if player is already matched from another request
  const existingMatch = await multiplayerStore.getMatchForClient(playerId);
  if (existingMatch) {
    const existingRoom = await multiplayerStore.getRoom(existingMatch.roomCode);
    const myPlayer = existingRoom?.players.find((p) => p.id === playerId);
    if (
      existingRoom &&
      existingRoom.status === 'playing' &&
      myPlayer &&
      !myPlayer.replacedByBot &&
      myPlayer.connected
    ) {
      return {
        status: 'matched',
        targetPlayers: existingRoom.targetPlayers || targetPlayers,
        foundPlayers: existingRoom.players.length,
        queueSize: 0,
        queuedPlayers: [],
        room: existingRoom,
        assignedColor: existingMatch.color,
      };
    } else {
      // Stale or dead match record -> clear it!
      await multiplayerStore.clearMatchForClient(playerId);
    }
  }

  const ticket: MatchmakingTicket = {
    id: playerId,
    name: String(name || 'Player').trim().slice(0, 20) || 'Player',
    avatar: String(avatar || 'crown'),
    targetPlayers,
    timestamp: Date.now(),
  };

  await multiplayerStore.enqueueMatchmaking(ticket);
  const matchedGroup = await multiplayerStore.dequeueMatchmakingGroup(targetPlayers);

  if (matchedGroup && matchedGroup.length === targetPlayers) {
    const roomCode = generateRoomCode();
    const matchedRoom = createMatchedOnlineRoom({
      roomCode,
      matchedEntries: matchedGroup.map((t) => ({
        id: t.id,
        name: t.name,
        avatar: t.avatar,
        targetPlayers: t.targetPlayers,
        joinedAt: t.timestamp,
      })),
      targetPlayers,
      rules: DEFAULT_HOUSE_RULES,
    });

    const room: ServerRoom = {
      ...matchedRoom,
      players: matchedRoom.players.map((p) => ({
        ...p,
        lastSeen: Date.now(),
      })),
      updatedAt: Date.now(),
      version: 1,
    };

    await multiplayerStore.saveRoom(room);

    for (const player of room.players) {
      await multiplayerStore.setMatchForClient(player.id, {
        roomCode,
        color: player.color,
        matchedAt: Date.now(),
      });
    }

    broadcastRoomUpdate(room);
    broadcastGameState(room);

    const myPlayer = room.players.find((p) => p.id === playerId);
    const myColor = myPlayer?.color || 'red';

    return {
      status: 'matched',
      targetPlayers,
      foundPlayers: targetPlayers,
      queueSize: 0,
      queuedPlayers: [],
      room,
      assignedColor: myColor,
    };
  }

  const bracket = await multiplayerStore.getMatchmakingBracket(targetPlayers);
  const queuedPlayers: QueuedPlayerSummary[] = bracket.map((b) => ({
    id: b.id,
    name: b.name,
    avatar: b.avatar,
  }));

  const searchMsg: ServerMessage = {
    type: 'MATCHMAKING_STATUS',
    status: 'searching',
    targetPlayers,
    foundPlayers: bracket.length,
    queueSize: bracket.length,
    queuedPlayers,
  };

  for (const b of bracket) {
    multiplayerStore.broadcast(`client:${b.id}`, searchMsg);
  }

  return {
    status: 'searching',
    targetPlayers,
    foundPlayers: bracket.length,
    queueSize: bracket.length,
    queuedPlayers,
  };
}

export async function handleLeaveMatchmaking(playerId: string): Promise<void> {
  await multiplayerStore.removeMatchmaking(playerId);
}
