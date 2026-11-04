import { COLOR_META, DEFAULT_HOUSE_RULES, PLAYER_COLORS } from './constants';
import { createInitialGameState } from './gameEngine';
import {
  GameEventLog,
  GameState,
  HouseRules,
  MatchLifecycleState,
  MatchmakingPlayerCount,
  PlayerColor,
  PlayerConfig,
} from './gameTypes';
import { getColorsForPlayerCount, normalizeRules } from './rules';

export interface MatchmakingQueueEntry {
  id: string;
  name: string;
  avatar: string;
  targetPlayers: MatchmakingPlayerCount;
  joinedAt: number;
}

export interface RoomPlayerRecord {
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

export interface AuthoritativeRoom {
  roomCode: string;
  roomType: 'friends' | 'matchmaking';
  targetPlayers: MatchmakingPlayerCount;
  hostId: string;
  status: 'lobby' | 'playing' | 'finished' | 'terminated';
  lifecycle: MatchLifecycleState;
  players: RoomPlayerRecord[];
  rules: HouseRules;
  gameState: GameState | null;
  terminatedReason?: string;
}

export type DepartureResolution =
  | {
      action: 'noop';
      room: AuthoritativeRoom;
    }
  | {
      action: 'remove_lobby_player';
      room: AuthoritativeRoom;
      departingPlayer: RoomPlayerRecord;
      notifyMessage: string;
    }
  | {
      action: 'remove_private_match_player';
      room: AuthoritativeRoom;
      departingPlayer: RoomPlayerRecord;
      notifyMessage: string;
    }
  | {
      action: 'replace_with_bot';
      room: AuthoritativeRoom;
      departingPlayer: RoomPlayerRecord;
      replacedColor: PlayerColor;
      remainingHumans: number;
      notifyMessage: string;
    }
  | {
      action: 'terminate_match';
      room: AuthoritativeRoom;
      departingPlayer: RoomPlayerRecord;
      reasonCode:
        | 'opponent_left_2p'
        | 'last_human_remaining'
        | 'host_left_private_room'
        | 'not_enough_players_private';
      notifyTitle: string;
      notifyMessage: string;
      returnTo: 'matchmaking' | 'friends' | 'title';
    };

/**
 * Strictly counts connected human players in a room.
 * AI bots and seats replaced by AI bots are NEVER counted as human players.
 */
export function countConnectedHumanPlayers(
  players: RoomPlayerRecord[]
): number {
  return players.filter((p) => !p.isAI && !p.replacedByBot && p.connected)
    .length;
}

/**
 * Adds a player to the matchmaking queue for a specific target player count (2, 3, or 4).
 * Prevents duplicate entries for the same player ID across any queue bracket.
 * If enough players are now in the bracket, pops those players to start a match.
 */
export function enqueueMatchmakingPlayer(
  queue: MatchmakingQueueEntry[],
  entry: MatchmakingQueueEntry
): {
  matchedEntries: MatchmakingQueueEntry[] | null;
  remainingQueue: MatchmakingQueueEntry[];
  bracketQueue: MatchmakingQueueEntry[];
} {
  // Remove any existing queue entry for this player ID (idempotency & bracket switch safety)
  const sanitized = queue.filter((q) => q.id !== entry.id);
  const updated = [...sanitized, entry];

  const bracket = updated.filter(
    (q) => q.targetPlayers === entry.targetPlayers
  );

  if (bracket.length >= entry.targetPlayers) {
    const matchedEntries = bracket.slice(0, entry.targetPlayers);
    const matchedIds = new Set(matchedEntries.map((m) => m.id));
    const remainingQueue = updated.filter((q) => !matchedIds.has(q.id));
    const remainingBracket = remainingQueue.filter(
      (q) => q.targetPlayers === entry.targetPlayers
    );
    return {
      matchedEntries,
      remainingQueue,
      bracketQueue: remainingBracket,
    };
  }

  return {
    matchedEntries: null,
    remainingQueue: updated,
    bracketQueue: bracket,
  };
}

/**
 * Removes a player from the matchmaking queue cleanly.
 */
export function removeMatchmakingPlayer(
  queue: MatchmakingQueueEntry[],
  playerId: string
): {
  removedEntry: MatchmakingQueueEntry | null;
  remainingQueue: MatchmakingQueueEntry[];
} {
  const existing = queue.find((q) => q.id === playerId) || null;
  const remainingQueue = queue.filter((q) => q.id !== playerId);
  return { removedEntry: existing, remainingQueue };
}

/**
 * Creates a new private lobby room hosted by `hostEntry`.
 */
export function createPrivateLobbyRoom(params: {
  roomCode: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  rules?: Partial<HouseRules>;
}): AuthoritativeRoom {
  const normalizedRules = normalizeRules(params.rules || DEFAULT_HOUSE_RULES);
  const hostPlayer: RoomPlayerRecord = {
    id: params.hostId,
    name: String(params.hostName || 'Host').slice(0, 20),
    avatar: String(params.hostAvatar || 'crown'),
    color: 'red',
    ready: true,
    isHost: true,
    isAI: false,
    connected: true,
  };

  return {
    roomCode: params.roomCode,
    roomType: 'friends',
    targetPlayers: 4,
    hostId: params.hostId,
    status: 'lobby',
    lifecycle: 'waiting_for_players',
    players: [hostPlayer],
    rules: normalizedRules,
    gameState: null,
  };
}

/**
 * Creates an active online match room for 2, 3, or 4 matched human players.
 */
export function createMatchedOnlineRoom(params: {
  roomCode: string;
  matchedEntries: MatchmakingQueueEntry[];
  targetPlayers: MatchmakingPlayerCount;
  rules?: Partial<HouseRules>;
}): AuthoritativeRoom {
  const { roomCode, matchedEntries, targetPlayers } = params;
  const rules = normalizeRules(params.rules || DEFAULT_HOUSE_RULES);
  const seatColors = getColorsForPlayerCount(targetPlayers);

  const players: RoomPlayerRecord[] = matchedEntries.map((entry, idx) => ({
    id: entry.id,
    name: String(entry.name || `Player ${idx + 1}`).slice(0, 20),
    avatar: String(entry.avatar || 'crown'),
    color: seatColors[idx] || PLAYER_COLORS[idx],
    ready: true,
    isHost: idx === 0,
    isAI: false,
    connected: true,
  }));

  const configs: PlayerConfig[] = players.map((p) => ({
    color: p.color,
    name: p.name,
    avatar: p.avatar,
    type: 'human',
    connected: true,
    ready: true,
  }));

  const gameState = createInitialGameState({
    id: `mm-${roomCode}-${Date.now()}`,
    mode: 'matchmaking',
    roomCode,
    players: configs,
    rules,
  });

  return {
    roomCode,
    roomType: 'matchmaking',
    targetPlayers,
    hostId: players[0].id,
    status: 'playing',
    lifecycle: 'in_progress',
    players,
    rules,
    gameState,
  };
}

/**
 * Resolves a player leaving or disconnecting from an authoritative room.
 * Implements all rules for:
 *  - 2-Player Matchmaking: terminate immediately when either player leaves.
 *  - 3-Player & 4-Player Matchmaking: replace departed human with an AI bot in the exact seat/color/tokens;
 *    continue while >= 2 humans remain; terminate immediately when <= 1 human remains.
 *  - Private Rooms ("Play With Friends"): close room if host leaves; remove non-host and notify others.
 *  - Idempotency: safe to invoke multiple times for the same player or room.
 */
export function resolvePlayerDeparture(
  room: AuthoritativeRoom,
  departingPlayerId: string
): DepartureResolution {
  if (room.status === 'terminated' || room.status === 'finished') {
    return { action: 'noop', room };
  }

  const playerIndex = room.players.findIndex(
    (p) => p.id === departingPlayerId
  );
  if (playerIndex === -1) {
    return { action: 'noop', room };
  }

  const departingPlayer = room.players[playerIndex];

  // If this seat was already converted to an AI bot or already disconnected & processed, no-op
  if (departingPlayer.isAI || departingPlayer.replacedByBot) {
    return { action: 'noop', room };
  }

  /* -------------------------------------------------------------------------
     1. LOBBY STATE (Private Room before match starts)
     ------------------------------------------------------------------------- */
  if (room.status === 'lobby') {
    if (departingPlayer.isHost || room.hostId === departingPlayerId) {
      const terminatedRoom: AuthoritativeRoom = {
        ...room,
        status: 'terminated',
        lifecycle: 'room_closed',
        players: room.players.filter((p) => p.id !== departingPlayerId),
        terminatedReason: 'host_left_private_room',
      };
      return {
        action: 'terminate_match',
        room: terminatedRoom,
        departingPlayer,
        reasonCode: 'host_left_private_room',
        notifyTitle: 'Room Closed',
        notifyMessage: `The host (${departingPlayer.name}) has left the room and the lobby has closed.`,
        returnTo: 'friends',
      };
    }

    const remainingPlayers = room.players.filter(
      (p) => p.id !== departingPlayerId
    );
    const updatedRoom: AuthoritativeRoom = {
      ...room,
      players: remainingPlayers,
    };

    return {
      action: 'remove_lobby_player',
      room: updatedRoom,
      departingPlayer,
      notifyMessage: `${departingPlayer.name} has left the room lobby.`,
    };
  }

  /* -------------------------------------------------------------------------
     2. PRIVATE ROOM ("Play With Friends") IN PROGRESS
     ------------------------------------------------------------------------- */
  if (room.roomType === 'friends') {
    if (departingPlayer.isHost || room.hostId === departingPlayerId) {
      const terminatedRoom: AuthoritativeRoom = {
        ...room,
        status: 'terminated',
        lifecycle: 'room_closed',
        players: room.players.filter((p) => p.id !== departingPlayerId),
        terminatedReason: 'host_left_private_room',
      };
      return {
        action: 'terminate_match',
        room: terminatedRoom,
        departingPlayer,
        reasonCode: 'host_left_private_room',
        notifyTitle: 'Room Ended by Host',
        notifyMessage: `The host (${departingPlayer.name}) has left the match and the room has ended.`,
        returnTo: 'friends',
      };
    }

    // Non-host left a private match
    const remainingRoomPlayers = room.players.filter(
      (p) => p.id !== departingPlayerId
    );
    const remainingHumans = countConnectedHumanPlayers(remainingRoomPlayers);

    // If fewer than 2 total players remain (or no humans remain, or only 1 human with 0 bots), end the match
    if (remainingRoomPlayers.length < 2 || remainingHumans < 1) {
      const terminatedRoom: AuthoritativeRoom = {
        ...room,
        status: 'terminated',
        lifecycle: 'room_closed',
        players: remainingRoomPlayers,
        terminatedReason: 'not_enough_players_private',
      };
      return {
        action: 'terminate_match',
        room: terminatedRoom,
        departingPlayer,
        reasonCode: 'not_enough_players_private',
        notifyTitle: 'Match Ended',
        notifyMessage: `${departingPlayer.name} has left the match. Returning to room menu.`,
        returnTo: 'friends',
      };
    }

    // Otherwise 2+ players still remain in the private room (e.g. 3-4 player private room)
    let updatedGameState = room.gameState;
    if (updatedGameState) {
      const activeColorBefore =
        updatedGameState.players[updatedGameState.activePlayerIndex]?.color;
      const filteredGsPlayers = updatedGameState.players.filter(
        (gp) => gp.color !== departingPlayer.color
      );
      let nextActiveIdx = filteredGsPlayers.findIndex(
        (gp) => gp.color === activeColorBefore
      );
      if (nextActiveIdx === -1) {
        nextActiveIdx =
          updatedGameState.activePlayerIndex % filteredGsPlayers.length;
      }
      const wasDepartedPlayersTurn =
        activeColorBefore === departingPlayer.color;

      const leaveLog: GameEventLog = {
        id: `evt-leave-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        playerColor: departingPlayer.color,
        playerName: departingPlayer.name,
        type: 'skip',
        message: `${departingPlayer.name} left the private match.`,
      };

      updatedGameState = {
        ...updatedGameState,
        players: filteredGsPlayers,
        activePlayerIndex: nextActiveIdx,
        turnPhase: wasDepartedPlayersTurn
          ? 'WAITING_FOR_ROLL'
          : updatedGameState.turnPhase,
        diceValue: wasDepartedPlayersTurn ? null : updatedGameState.diceValue,
        legalMoves: wasDepartedPlayersTurn ? [] : updatedGameState.legalMoves,
        selectedTokenId: wasDepartedPlayersTurn
          ? null
          : updatedGameState.selectedTokenId,
        eventLog: [leaveLog, ...updatedGameState.eventLog].slice(0, 40),
      };
    }

    return {
      action: 'remove_private_match_player',
      room: {
        ...room,
        players: remainingRoomPlayers,
        gameState: updatedGameState,
      },
      departingPlayer,
      notifyMessage: `${departingPlayer.name} has left the match.`,
    };
  }

  /* -------------------------------------------------------------------------
     3. PUBLIC 2-PLAYER MATCHMAKING: TERMINATE IMMEDIATELY WHEN EITHER LEAVES
     ------------------------------------------------------------------------- */
  if (room.targetPlayers === 2 || room.players.length <= 2) {
    const updatedPlayers = room.players.map((p) =>
      p.id === departingPlayerId ? { ...p, connected: false } : p
    );
    const terminatedRoom: AuthoritativeRoom = {
      ...room,
      players: updatedPlayers,
      status: 'terminated',
      lifecycle: 'match_terminated',
      terminatedReason: 'opponent_left_2p',
    };

    return {
      action: 'terminate_match',
      room: terminatedRoom,
      departingPlayer,
      reasonCode: 'opponent_left_2p',
      notifyTitle: 'Opponent Left Match',
      notifyMessage:
        'Your opponent has left the match. Returning to matchmaking.',
      returnTo: 'matchmaking',
    };
  }

  /* -------------------------------------------------------------------------
     4. PUBLIC 3-PLAYER & 4-PLAYER MATCHMAKING: BOT REPLACEMENT & HUMAN CHECK
     ------------------------------------------------------------------------- */
  const updatedPlayers: RoomPlayerRecord[] = room.players.map((p) => {
    if (p.id !== departingPlayerId) return p;
    return {
      ...p,
      isAI: true,
      connected: false,
      replacedByBot: true,
      originalHumanName: p.originalHumanName || p.name,
      isHost: false,
    };
  });

  const remainingHumans = countConnectedHumanPlayers(updatedPlayers);

  // Update GameState so the AI bot takes over the exact seat, color, and tokens
  let updatedGameState = room.gameState;
  if (updatedGameState) {
    const botTakeoverLog: GameEventLog = {
      id: `evt-bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      playerColor: departingPlayer.color,
      playerName: departingPlayer.name,
      type: 'skip',
      message: `${departingPlayer.name} left the match — AI Bot took over ${COLOR_META[departingPlayer.color].label}.`,
    };

    updatedGameState = {
      ...updatedGameState,
      players: updatedGameState.players.map((gp) =>
        gp.color === departingPlayer.color
          ? {
              ...gp,
              type: 'ai',
              aiDifficulty: gp.aiDifficulty || 'medium',
              connected: false,
              replacedByBot: true,
              originalHumanName: gp.originalHumanName || departingPlayer.name,
            }
          : gp
      ),
      eventLog: [botTakeoverLog, ...updatedGameState.eventLog].slice(0, 40),
    };
  }

  // Rule: The match continues ONLY while at least two human players remain.
  // Once the human player count becomes 1 (or 0), terminate the match immediately!
  if (remainingHumans <= 1) {
    const terminatedRoom: AuthoritativeRoom = {
      ...room,
      players: updatedPlayers,
      gameState: updatedGameState,
      status: 'terminated',
      lifecycle: 'match_terminated',
      terminatedReason: 'last_human_remaining',
    };

    return {
      action: 'terminate_match',
      room: terminatedRoom,
      departingPlayer,
      reasonCode: 'last_human_remaining',
      notifyTitle: 'Match Terminated',
      notifyMessage:
        'The match ended because only one human player remained after opponents left.',
      returnTo: 'matchmaking',
    };
  }

  // Otherwise >= 2 humans remain -> reassign host if needed and continue match with AI bot!
  let nextHostId = room.hostId;
  const firstRemainingHuman = updatedPlayers.find(
    (p) => !p.isAI && !p.replacedByBot && p.connected
  );
  if (
    (departingPlayer.isHost || room.hostId === departingPlayerId) &&
    firstRemainingHuman
  ) {
    nextHostId = firstRemainingHuman.id;
  }

  const finalPlayers = updatedPlayers.map((p) => ({
    ...p,
    isHost: p.id === nextHostId,
  }));

  const continuingRoom: AuthoritativeRoom = {
    ...room,
    hostId: nextHostId,
    players: finalPlayers,
    gameState: updatedGameState,
    lifecycle: 'in_progress',
  };

  return {
    action: 'replace_with_bot',
    room: continuingRoom,
    departingPlayer,
    replacedColor: departingPlayer.color,
    remainingHumans,
    notifyMessage: `${departingPlayer.name} left the match — AI Bot has taken over ${COLOR_META[departingPlayer.color].label}.`,
  };
}
