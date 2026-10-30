import { COLOR_META } from './constants';
import {
  GameEventLog,
  GameMode,
  GameState,
  HouseRules,
  PlayerConfig,
  PlayerState,
  Token,
} from './gameTypes';
import { getLegalMovesForPlayer } from './legalMoves';
import { applyMoveToPlayers, getNextActivePlayerIndex } from './movement';
import { normalizeRules, shouldForfeitOnConsecutiveSixes } from './rules';

/**
 * Creates the initial 4 tokens for a player.
 * If `fastStart` rule is enabled, token 0 starts at step 0 (on the player's start square).
 */
export function createPlayerTokens(
  color: PlayerConfig['color'],
  fastStart: boolean
): Token[] {
  return [0, 1, 2, 3].map((index) => ({
    id: `${color}-${index}`,
    color,
    index,
    steps: fastStart && index === 0 ? 0 : -1,
  }));
}

/**
 * Initializes a brand-new Ludo GameState from player configs and optional house rules.
 */
export function createInitialGameState(params: {
  id?: string;
  mode: GameMode;
  players: PlayerConfig[];
  rules?: Partial<HouseRules>;
  roomCode?: string;
}): GameState {
  const rules = normalizeRules(params.rules);
  const players: PlayerState[] = params.players.map((cfg) => ({
    ...cfg,
    tokens: createPlayerTokens(cfg.color, rules.fastStart),
    hasFinished: false,
    capturesMade: 0,
    sixesRolled: 0,
    movesCount: 0,
  }));

  const initialLog: GameEventLog = {
    id: `evt-init-${Date.now()}`,
    timestamp: Date.now(),
    playerColor: players[0].color,
    playerName: players[0].name,
    type: 'roll',
    message: `Match started! ${players[0].name} (${COLOR_META[players[0].color].label}) takes the first turn.`,
  };

  return {
    id: params.id || `ludo-${Date.now()}`,
    mode: params.mode,
    roomCode: params.roomCode,
    players,
    activePlayerIndex: 0,
    turnPhase: 'WAITING_FOR_ROLL',
    diceValue: null,
    consecutiveSixes: 0,
    legalMoves: [],
    selectedTokenId: null,
    lastMove: null,
    rules,
    rankings: [],
    winner: null,
    turnNumber: 1,
    startedAt: Date.now(),
    eventLog: [initialLog],
  };
}

/**
 * Generates a fair random dice outcome (1..6).
 */
export function generateFairDiceRoll(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return (array[0] % 6) + 1;
  }
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Commits a dice roll (1..6) to the game state, computing legal moves and handling consecutive sixes
 * or no-legal-move turn transitions.
 */
export function commitDiceRoll(
  state: GameState,
  diceValue: number
): GameState {
  if (
    state.turnPhase !== 'WAITING_FOR_ROLL' &&
    state.turnPhase !== 'ROLLING'
  ) {
    return state;
  }
  if (diceValue < 1 || diceValue > 6) {
    return state;
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const isSix = diceValue === 6;
  const newConsecutiveSixes = isSix ? state.consecutiveSixes + 1 : 0;

  const updatedPlayers = state.players.map((p, idx) =>
    idx === state.activePlayerIndex && isSix
      ? { ...p, sixesRolled: p.sixesRolled + 1 }
      : p
  );

  // Check if rolling consecutive sixes forfeits the turn
  if (
    isSix &&
    shouldForfeitOnConsecutiveSixes(newConsecutiveSixes, state.rules)
  ) {
    const forfeitLog: GameEventLog = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      playerColor: activePlayer.color,
      playerName: activePlayer.name,
      type: 'forfeit_sixes',
      message: `${activePlayer.name} rolled three 6s in a row! Turn forfeited.`,
    };

    return {
      ...state,
      players: updatedPlayers,
      diceValue,
      consecutiveSixes: newConsecutiveSixes,
      legalMoves: [],
      selectedTokenId: null,
      turnPhase: 'TURN_TRANSITION',
      eventLog: [forfeitLog, ...state.eventLog].slice(0, 40),
    };
  }

  const legalMoves = getLegalMovesForPlayer(
    activePlayer.color,
    diceValue,
    updatedPlayers,
    state.rules
  );

  if (legalMoves.length === 0) {
    const skipLog: GameEventLog = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      playerColor: activePlayer.color,
      playerName: activePlayer.name,
      type: 'skip',
      message: `${activePlayer.name} rolled ${diceValue} — no legal moves available.`,
    };

    return {
      ...state,
      players: updatedPlayers,
      diceValue,
      consecutiveSixes: newConsecutiveSixes,
      legalMoves: [],
      selectedTokenId: null,
      turnPhase: 'TURN_TRANSITION',
      eventLog: [skipLog, ...state.eventLog].slice(0, 40),
    };
  }

  const rollLog: GameEventLog = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    playerColor: activePlayer.color,
    playerName: activePlayer.name,
    type: 'roll',
    message: `${activePlayer.name} rolled a ${diceValue}${isSix ? '!' : '.'}`,
  };

  return {
    ...state,
    players: updatedPlayers,
    diceValue,
    consecutiveSixes: newConsecutiveSixes,
    legalMoves,
    selectedTokenId: legalMoves.length === 1 ? legalMoves[0].tokenId : null,
    turnPhase: 'SELECTING_TOKEN',
    eventLog: [rollLog, ...state.eventLog].slice(0, 40),
  };
}

/**
 * Executes a legal move for `tokenId` and updates game state, captures, rankings, and turn phase.
 */
export function executeTokenMove(
  state: GameState,
  tokenId: string
): GameState {
  if (
    state.turnPhase !== 'SELECTING_TOKEN' &&
    state.turnPhase !== 'ANIMATING_MOVE'
  ) {
    return state;
  }

  const move = state.legalMoves.find((m) => m.tokenId === tokenId);
  if (!move || state.diceValue === null) {
    return state;
  }

  const activePlayer = state.players[state.activePlayerIndex];
  const result = applyMoveToPlayers(
    state.players,
    state.activePlayerIndex,
    move,
    state.diceValue,
    state.rankings,
    state.rules
  );

  const newLogs: GameEventLog[] = [];

  if (move.capturesTokenIds.length > 0) {
    newLogs.push({
      id: `evt-cap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      playerColor: activePlayer.color,
      playerName: activePlayer.name,
      type: 'capture',
      message: `${activePlayer.name} captured ${move.capturesTokenIds.length} opponent token${move.capturesTokenIds.length > 1 ? 's' : ''}!`,
    });
  } else if (move.reachesHome) {
    newLogs.push({
      id: `evt-home-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      playerColor: activePlayer.color,
      playerName: activePlayer.name,
      type: 'home',
      message: `${activePlayer.name} brought a token safely Home!`,
    });
  } else if (move.fromSteps === -1) {
    newLogs.push({
      id: `evt-deploy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      playerColor: activePlayer.color,
      playerName: activePlayer.name,
      type: 'move',
      message: `${activePlayer.name} deployed a token from the yard.`,
    });
  }

  if (result.playerJustFinished) {
    const rank = result.newRankings.indexOf(activePlayer.color) + 1;
    const rankLabel =
      rank === 1 ? '🥇 1st Place' : rank === 2 ? '🥈 2nd Place' : rank === 3 ? '🥉 3rd Place' : `${rank}th Place`;
    newLogs.push({
      id: `evt-rank-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      playerColor: activePlayer.color,
      playerName: activePlayer.name,
      type: 'win',
      message: result.isGameOver
        ? `${rankLabel}! ${activePlayer.name} finished all 4 tokens!`
        : `${rankLabel}! ${activePlayer.name} finished all 4 tokens — match continues for remaining ranks!`,
    });
  }

  if (result.isGameOver && result.winner) {
    const winningPlayer =
      result.updatedPlayers.find((p) => p.color === result.winner) ||
      activePlayer;
    newLogs.push({
      id: `evt-win-${Date.now()}`,
      timestamp: Date.now(),
      playerColor: winningPlayer.color,
      playerName: winningPlayer.name,
      type: 'win',
      message: `🏆 Match complete! ${winningPlayer.name} claims 1st Place!`,
    });

    return {
      ...state,
      players: result.updatedPlayers,
      rankings: result.newRankings,
      winner: result.winner,
      turnPhase: 'GAME_OVER',
      legalMoves: [],
      selectedTokenId: null,
      lastMove: {
        tokenId: move.tokenId,
        fromSteps: move.fromSteps,
        toSteps: move.toSteps,
        capturedIds: move.capturesTokenIds,
      },
      eventLog: [...newLogs, ...state.eventLog].slice(0, 40),
    };
  }

  // If the player earned an extra roll (6, capture bonus, or home bonus), they roll again!
  if (result.grantsExtraRoll) {
    return {
      ...state,
      players: result.updatedPlayers,
      rankings: result.newRankings,
      winner: result.winner,
      turnPhase: 'WAITING_FOR_ROLL',
      diceValue: null,
      legalMoves: [],
      selectedTokenId: null,
      lastMove: {
        tokenId: move.tokenId,
        fromSteps: move.fromSteps,
        toSteps: move.toSteps,
        capturedIds: move.capturesTokenIds,
      },
      eventLog: [...newLogs, ...state.eventLog].slice(0, 40),
    };
  }

  // Otherwise advance to the next active unfinished player
  const nextIndex = getNextActivePlayerIndex(
    result.updatedPlayers,
    state.activePlayerIndex
  );

  return {
    ...state,
    players: result.updatedPlayers,
    rankings: result.newRankings,
    winner: result.winner,
    activePlayerIndex: nextIndex,
    turnPhase: 'WAITING_FOR_ROLL',
    diceValue: null,
    consecutiveSixes: 0,
    legalMoves: [],
    selectedTokenId: null,
    turnNumber: state.turnNumber + 1,
    lastMove: {
      tokenId: move.tokenId,
      fromSteps: move.fromSteps,
      toSteps: move.toSteps,
      capturedIds: move.capturesTokenIds,
    },
    eventLog: [...newLogs, ...state.eventLog].slice(0, 40),
  };
}

/**
 * Advances the turn when `turnPhase === 'TURN_TRANSITION'` (e.g. after no legal moves or three consecutive sixes).
 */
export function completeTurnTransition(state: GameState): GameState {
  if (state.turnPhase !== 'TURN_TRANSITION') {
    return state;
  }
  const nextIndex = getNextActivePlayerIndex(
    state.players,
    state.activePlayerIndex
  );
  return {
    ...state,
    activePlayerIndex: nextIndex,
    turnPhase: 'WAITING_FOR_ROLL',
    diceValue: null,
    consecutiveSixes: 0,
    legalMoves: [],
    selectedTokenId: null,
    turnNumber: state.turnNumber + 1,
  };
}
