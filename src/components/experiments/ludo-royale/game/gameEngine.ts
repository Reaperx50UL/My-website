import { COLOR_META } from './constants';
import type {
  BlockadePassingEntitlement,
  GameEventLog,
  GameMode,
  GameState,
  HouseRules,
  PlayerConfig,
  PlayerState,
  SixSequenceSnapshot,
  Token,
  TokenPair,
} from './gameTypes';
import {
  canBreakPairAtPosition,
  canBreakPairToUnlockMove,
  getBreakablePairIdsForPlayer,
  getFormablePairOptionsForPlayer,
  getLegalMovesForPlayer,
  reconcileTokenPairs,
} from './legalMoves';
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
    pairId: null,
    yardSlot: fastStart && index === 0 ? undefined : index,
  }));
}

/**
 * Creates a deep, immutable snapshot of all relevant game state before the first 6 in a sequence.
 */
export function createSixSequenceSnapshot(
  state: GameState
): SixSequenceSnapshot {
  return {
    players: state.players.map((p) => ({
      ...p,
      tokens: p.tokens.map((t) => ({ ...t })),
    })),
    pairs: (state.pairs || []).map((pair) => ({
      ...pair,
      tokenIds: [pair.tokenIds[0], pair.tokenIds[1]],
    })),
    passingEntitlements: (state.passingEntitlements || []).map((ent) => ({
      ...ent,
    })),
    rankings: [...state.rankings],
    winner: state.winner,
    lastMove: state.lastMove
      ? {
          ...state.lastMove,
          capturedIds: [...state.lastMove.capturedIds],
          pairedTokenIds: state.lastMove.pairedTokenIds
            ? [
                state.lastMove.pairedTokenIds[0],
                state.lastMove.pairedTokenIds[1],
              ]
            : undefined,
        }
      : null,
    turnNumber: state.turnNumber,
    eventLog: state.eventLog.map((e) => ({ ...e })),
  };
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
  const rawPlayers: PlayerState[] = params.players.map((cfg) => ({
    ...cfg,
    tokens: createPlayerTokens(cfg.color, rules.fastStart),
    hasFinished: false,
    capturesMade: 0,
    sixesRolled: 0,
    movesCount: 0,
  }));

  const reconciled = reconcileTokenPairs(rawPlayers, [], [], false);

  const initialLog: GameEventLog = {
    id: `evt-init-${Date.now()}`,
    timestamp: Date.now(),
    playerColor: reconciled.players[0].color,
    playerName: reconciled.players[0].name,
    type: 'roll',
    message: `Match started! ${reconciled.players[0].name} (${COLOR_META[reconciled.players[0].color].label}) takes the first turn.`,
  };

  return {
    id: params.id || `ludo-${Date.now()}`,
    mode: params.mode,
    roomCode: params.roomCode,
    players: reconciled.players,
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
    pairs: reconciled.pairs,
    passingEntitlements: [],
    breakablePairIds: [],
    brokenPairTokenIdsThisRoll: [],
    sixSequenceSnapshot: null,
    lastRollbackNotice: null,
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
 * Commits a dice roll (1..6) to the game state:
 * - Reconciles existing token pairs (never auto-forming new pairs).
 * - Captures a complete game-state snapshot before the first 6 in a consecutive-six sequence.
 * - Triggers complete game-state rollback on the 3rd consecutive 6, keeping the same player active
 *   with a fresh roll and displaying "THREE SIXES! All moves from this sequence have been cancelled."
 * - Computes single-token and half-dice pair legal moves plus voluntary breakable pairs and even-roll formable pairs.
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

  // Synchronize existing pairs before processing the roll (never auto-forming new pairs)
  const preReconciled = reconcileTokenPairs(
    state.players,
    state.pairs || [],
    [],
    false
  );
  const syncedState: GameState = {
    ...state,
    players: preReconciled.players,
    pairs: preReconciled.pairs,
    brokenPairTokenIdsThisRoll: [],
  };

  const activePlayer = syncedState.players[syncedState.activePlayerIndex];
  const isSix = diceValue === 6;

  // Capture snapshot BEFORE the first six in a consecutive-six sequence
  const activeSnapshot: SixSequenceSnapshot | null = isSix
    ? syncedState.consecutiveSixes === 0 || !syncedState.sixSequenceSnapshot
      ? createSixSequenceSnapshot(syncedState)
      : syncedState.sixSequenceSnapshot
    : null;

  const newConsecutiveSixes = isSix ? syncedState.consecutiveSixes + 1 : 0;

  // PART 1 — THREE CONSECUTIVE SIXES: COMPLETE ROLLBACK
  if (
    isSix &&
    shouldForfeitOnConsecutiveSixes(newConsecutiveSixes, syncedState.rules)
  ) {
    const restored = activeSnapshot || createSixSequenceSnapshot(syncedState);
    const rollbackMessage =
      'THREE SIXES! All moves from this sequence have been cancelled.';
    const rollbackLog: GameEventLog = {
      id: `evt-rollback-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      playerColor: activePlayer.color,
      playerName: activePlayer.name,
      type: 'rollback_sixes',
      message: rollbackMessage,
    };

    return {
      ...syncedState,
      players: restored.players.map((p) => ({
        ...p,
        tokens: p.tokens.map((t) => ({ ...t })),
      })),
      pairs: restored.pairs.map((pair) => ({
        ...pair,
        tokenIds: [pair.tokenIds[0], pair.tokenIds[1]],
      })),
      passingEntitlements: restored.passingEntitlements.map((ent) => ({
        ...ent,
      })),
      rankings: [...restored.rankings],
      winner: restored.winner,
      lastMove: restored.lastMove ? { ...restored.lastMove } : null,
      turnNumber: restored.turnNumber,
      // Keep the same player active and give them a fresh roll!
      activePlayerIndex: syncedState.activePlayerIndex,
      turnPhase: 'WAITING_FOR_ROLL',
      diceValue: null,
      consecutiveSixes: 0,
      legalMoves: [],
      breakablePairIds: [],
      brokenPairTokenIdsThisRoll: [],
      selectedTokenId: null,
      sixSequenceSnapshot: null,
      lastRollbackNotice: {
        id: rollbackLog.id,
        playerColor: activePlayer.color,
        playerName: activePlayer.name,
        message: rollbackMessage,
        timestamp: rollbackLog.timestamp,
      },
      eventLog: [rollbackLog, ...restored.eventLog].slice(0, 40),
    };
  }

  const updatedPlayers = syncedState.players.map((p, idx) =>
    idx === syncedState.activePlayerIndex && isSix
      ? { ...p, sixesRolled: p.sixesRolled + 1 }
      : p
  );

  const activeEntitlements = syncedState.passingEntitlements || [];

  const legalMoves = getLegalMovesForPlayer(
    activePlayer.color,
    diceValue,
    updatedPlayers,
    syncedState.rules,
    syncedState.pairs,
    activeEntitlements,
    []
  );

  const breakablePairIds = getBreakablePairIdsForPlayer(
    activePlayer.color,
    diceValue,
    updatedPlayers,
    syncedState.rules,
    syncedState.pairs,
    activeEntitlements,
    []
  );

  const canBreakPairToMove = canBreakPairToUnlockMove(
    activePlayer.color,
    diceValue,
    updatedPlayers,
    syncedState.rules,
    syncedState.pairs,
    activeEntitlements
  );

  const formableOptions = getFormablePairOptionsForPlayer(
    activePlayer.color,
    diceValue,
    updatedPlayers,
    syncedState.pairs,
    []
  );

  // Check if forming a pair on this roll unlocks a legal half-dice pair move
  const canFormPairToMove = formableOptions.some((opt) => {
    const candidatePair: TokenPair = {
      id: `pair-${activePlayer.color}-temp`,
      color: activePlayer.color,
      tokenIds: opt.tokenIds,
      steps: opt.steps,
    };
    const simulated = reconcileTokenPairs(
      updatedPlayers,
      [...(syncedState.pairs || []), candidatePair],
      [],
      false
    );
    const movesAfterForm = getLegalMovesForPlayer(
      activePlayer.color,
      diceValue,
      simulated.players,
      syncedState.rules,
      simulated.pairs,
      activeEntitlements,
      []
    );
    return movesAfterForm.length > 0;
  });

  if (
    legalMoves.length === 0 &&
    !canBreakPairToMove &&
    !canFormPairToMove
  ) {
    const skipLog: GameEventLog = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      playerColor: activePlayer.color,
      playerName: activePlayer.name,
      type: 'skip',
      message: `${activePlayer.name} rolled ${diceValue} — no legal moves available.`,
    };

    return {
      ...syncedState,
      players: updatedPlayers,
      diceValue,
      consecutiveSixes: newConsecutiveSixes,
      sixSequenceSnapshot: activeSnapshot,
      legalMoves: [],
      breakablePairIds: [],
      brokenPairTokenIdsThisRoll: [],
      selectedTokenId: null,
      turnPhase: 'TURN_TRANSITION',
      eventLog: [skipLog, ...syncedState.eventLog].slice(0, 40),
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
    ...syncedState,
    players: updatedPlayers,
    diceValue,
    consecutiveSixes: newConsecutiveSixes,
    sixSequenceSnapshot: activeSnapshot,
    legalMoves,
    breakablePairIds,
    brokenPairTokenIdsThisRoll: [],
    selectedTokenId: null,
    turnPhase: 'SELECTING_TOKEN',
    eventLog: [rollLog, ...syncedState.eventLog].slice(0, 40),
  };
}

/**
 * Voluntarily breaks (unpairs) a pair belonging to the active player at its current position:
 * - Available in ANY scenario on the player's turn for any pair on the board (`0 <= steps < 56`),
 *   regardless of dice roll (`1..6` or before rolling) or square type.
 * - Does NOT consume the dice roll.
 * - Separates the two tokens at their current position and recomputes full-dice individual legal moves
 *   for ALL tokens of the active player (preserving any single token moves elsewhere on the board).
 * - Acts as a toggleable ON/OFF switch: breaking a pair immediately makes those tokens eligible to be
 *   paired again unlimited times if rules are met.
 */
export function breakTokenPair(
  state: GameState,
  pairIdOrTokenId: string
): GameState {
  const reconciled = reconcileTokenPairs(
    state.players,
    state.pairs || [],
    [],
    false
  );
  const activePlayer = reconciled.players[state.activePlayerIndex];
  if (!activePlayer) return state;

  const targetPair = reconciled.pairs.find(
    (p) =>
      p.color === activePlayer.color &&
      (p.id === pairIdOrTokenId ||
        p.tokenIds[0] === pairIdOrTokenId ||
        p.tokenIds[1] === pairIdOrTokenId)
  );
  if (!targetPair) {
    return state;
  }

  if (!canBreakPairAtPosition(targetPair, state.rules)) {
    return state;
  }

  const remainingPairs = reconciled.pairs.filter((p) => p.id !== targetPair.id);
  const updatedPlayers = reconciled.players.map((pl) =>
    pl.color === activePlayer.color
      ? {
          ...pl,
          tokens: pl.tokens.map((t) =>
            t.id === targetPair.tokenIds[0] || t.id === targetPair.tokenIds[1]
              ? {
                  ...t,
                  pairId: null,
                  yardSlot: t.steps === -1 ? t.index : undefined,
                }
              : t
          ),
        }
      : pl
  );

  // Clear any blockade passing entitlements that referenced the broken pair
  const updatedEntitlements = (state.passingEntitlements || []).filter(
    (ent) => ent.pairId !== targetPair.id
  );

  let nextLegalMoves = state.legalMoves;
  const nextBreakablePairIds = getBreakablePairIdsForPlayer(
    activePlayer.color,
    state.diceValue,
    updatedPlayers,
    state.rules,
    remainingPairs,
    updatedEntitlements,
    []
  );

  if (state.diceValue !== null && state.turnPhase === 'SELECTING_TOKEN') {
    nextLegalMoves = getLegalMovesForPlayer(
      activePlayer.color,
      state.diceValue,
      updatedPlayers,
      state.rules,
      remainingPairs,
      updatedEntitlements,
      []
    );
  }

  const t1Num =
    (activePlayer.tokens.find((t) => t.id === targetPair.tokenIds[0])?.index ??
      0) + 1;
  const t2Num =
    (activePlayer.tokens.find((t) => t.id === targetPair.tokenIds[1])?.index ??
      1) + 1;

  const breakLog: GameEventLog = {
    id: `evt-break-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    playerColor: activePlayer.color,
    playerName: activePlayer.name,
    type: 'pair_break',
    message: `${activePlayer.name} broke Pair (#${t1Num} & #${t2Num}) into individual tokens.`,
  };

  return {
    ...state,
    players: updatedPlayers,
    pairs: remainingPairs,
    passingEntitlements: updatedEntitlements,
    legalMoves: nextLegalMoves,
    breakablePairIds: nextBreakablePairIds,
    brokenPairTokenIdsThisRoll: [],
    selectedTokenId: null,
    eventLog: [breakLog, ...state.eventLog].slice(0, 40),
  };
}

/**
 * Manually forms a pair between two tokens of the active player's color occupying the same
 * eligible board position (`0 <= steps < 56`):
 * - ONLY ONE RULE: Two unpaired tokens of the same color sitting on the exact same board position
 *   anywhere on the board (`0 <= steps < 56`, except Home Yard `-1` and Home `56`) can be paired together!
 * - Available regardless of the dice roll (`1, 2, 3, 4, 5, 6` or before rolling).
 * - Pairs NEVER form automatically.
 * - Preserves all legal moves of other single tokens belonging to the active player elsewhere on the board.
 * - Acts as a toggleable ON/OFF switch: players can pair and unpair any eligible same-color tokens
 *   unlimited times whenever rules are met.
 */
export function formTokenPair(
  state: GameState,
  tokenAId?: string,
  tokenBId?: string
): GameState {
  const reconciled = reconcileTokenPairs(
    state.players,
    state.pairs || [],
    [],
    false
  );

  const activeOwner = reconciled.players[state.activePlayerIndex];
  if (!activeOwner) {
    return state;
  }

  let tokenA: Token | undefined;
  if (tokenAId) {
    tokenA = activeOwner.tokens.find((t) => t.id === tokenAId);
  } else {
    const sortedCandidates = [...activeOwner.tokens].sort(
      (a, b) => b.steps - a.steps || a.index - b.index
    );
    for (const candidate of sortedCandidates) {
      if (
        candidate.steps < 0 ||
        candidate.steps >= 56 ||
        candidate.pairId
      ) {
        continue;
      }
      const mate = activeOwner.tokens.find(
        (t) =>
          t.id !== candidate.id &&
          !t.pairId &&
          t.steps === candidate.steps
      );
      if (mate) {
        tokenA = candidate;
        break;
      }
    }
  }

  // Pairing is only available from Starting Point (0) up to Home Stretch (55), never in Home Yard (-1)
  if (
    !tokenA ||
    tokenA.pairId ||
    tokenA.steps < 0 ||
    tokenA.steps >= 56
  ) {
    return state;
  }

  const tokenB = tokenBId
    ? activeOwner.tokens.find((t) => t.id === tokenBId)
    : activeOwner.tokens.find(
        (t) =>
          t.id !== tokenA!.id &&
          !t.pairId &&
          t.steps === tokenA!.steps
      );

  if (
    !tokenB ||
    tokenB.id === tokenA.id ||
    tokenB.pairId ||
    tokenB.steps < 0 ||
    tokenB.steps >= 56
  ) {
    return state;
  }
  if (tokenA.steps !== tokenB.steps) {
    return state;
  }

  const ordered = [tokenA, tokenB].sort((a, b) => a.index - b.index);
  const pairId = `pair-${activeOwner.color}-${ordered[0].index}-${ordered[1].index}`;
  const newPair: TokenPair = {
    id: pairId,
    color: activeOwner.color,
    tokenIds: [ordered[0].id, ordered[1].id],
    steps: ordered[0].steps,
  };

  const afterPair = reconcileTokenPairs(
    reconciled.players,
    [...reconciled.pairs, newPair],
    [],
    false
  );

  let nextLegalMoves = state.legalMoves;
  const activePlayer = afterPair.players[state.activePlayerIndex];
  const nextBreakablePairIds = getBreakablePairIdsForPlayer(
    activePlayer.color,
    state.diceValue,
    afterPair.players,
    state.rules,
    afterPair.pairs,
    state.passingEntitlements || [],
    []
  );

  if (state.diceValue !== null && state.turnPhase === 'SELECTING_TOKEN') {
    nextLegalMoves = getLegalMovesForPlayer(
      activePlayer.color,
      state.diceValue,
      afterPair.players,
      state.rules,
      afterPair.pairs,
      state.passingEntitlements || [],
      []
    );
  }

  const pairLog: GameEventLog = {
    id: `evt-pair-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    playerColor: activeOwner.color,
    playerName: activeOwner.name,
    type: 'pair_form',
    message: `${activeOwner.name} paired tokens #${ordered[0].index + 1} & #${ordered[1].index + 1}!`,
  };

  return {
    ...state,
    players: afterPair.players,
    pairs: afterPair.pairs,
    legalMoves: nextLegalMoves,
    breakablePairIds: nextBreakablePairIds,
    brokenPairTokenIdsThisRoll: [],
    turnPhase: state.turnPhase,
    selectedTokenId: null,
    eventLog: [pairLog, ...state.eventLog].slice(0, 40),
  };
}

/**
 * Executes a legal move for `tokenId` (or `pairId` / secondary paired token ID)
 * and updates game state, pairs, captures, passing entitlements, rankings, and turn phase.
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

  const move = state.legalMoves.find(
    (m) =>
      m.tokenId === tokenId ||
      m.pairId === tokenId ||
      (m.isPairMove && m.pairedTokenIds?.includes(tokenId))
  );
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
    state.rules,
    state.pairs || [],
    state.passingEntitlements || [],
    [],
    state.turnNumber
  );

  const newLogs: GameEventLog[] = [];

  if (result.newlyFormedPairs.length > 0) {
    for (const formed of result.newlyFormedPairs) {
      const idx1 =
        (activePlayer.tokens.find((t) => t.id === formed.tokenIds[0])?.index ??
          0) + 1;
      const idx2 =
        (activePlayer.tokens.find((t) => t.id === formed.tokenIds[1])?.index ??
          1) + 1;
      newLogs.push({
        id: `evt-pair-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        playerColor: activePlayer.color,
        playerName: activePlayer.name,
        type: 'pair_form',
        message: `${activePlayer.name} formed a Pair with tokens #${idx1} & #${idx2}!`,
      });
    }
  }

  if (move.capturesTokenIds.length > 0) {
    newLogs.push({
      id: `evt-cap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      playerColor: activePlayer.color,
      playerName: activePlayer.name,
      type: 'capture',
      message: move.isPairMove
        ? `${activePlayer.name}'s Pair captured an opposing Pair (${move.capturesTokenIds.length} tokens)!`
        : `${activePlayer.name} captured ${move.capturesTokenIds.length} opponent token${move.capturesTokenIds.length > 1 ? 's' : ''}!`,
    });
  } else if (move.reachesHome) {
    newLogs.push({
      id: `evt-home-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      playerColor: activePlayer.color,
      playerName: activePlayer.name,
      type: 'home',
      message: move.isPairMove
        ? `${activePlayer.name} brought a Pair safely Home!`
        : `${activePlayer.name} brought a token safely Home!`,
    });
  } else if (move.fromSteps === -1) {
    newLogs.push({
      id: `evt-deploy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      playerColor: activePlayer.color,
      playerName: activePlayer.name,
      type: 'move',
      message: move.isPairMove
        ? `${activePlayer.name} deployed a Pair from the yard.`
        : `${activePlayer.name} deployed a token from the yard.`,
    });
  }

  if (result.playerJustFinished) {
    const rank = result.newRankings.indexOf(activePlayer.color) + 1;
    const rankLabel =
      rank === 1
        ? '🥇 1st Place'
        : rank === 2
        ? '🥈 2nd Place'
        : rank === 3
        ? '🥉 3rd Place'
        : `${rank}th Place`;
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

  const lastMoveRecord = {
    tokenId: move.tokenId,
    fromSteps: move.fromSteps,
    toSteps: move.toSteps,
    capturedIds: move.capturesTokenIds,
    isPairMove: move.isPairMove,
    pairedTokenIds: move.pairedTokenIds,
  };

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
      pairs: result.updatedPairs,
      passingEntitlements: result.updatedPassingEntitlements,
      rankings: result.newRankings,
      winner: result.winner,
      turnPhase: 'GAME_OVER',
      legalMoves: [],
      breakablePairIds: [],
      brokenPairTokenIdsThisRoll: [],
      selectedTokenId: null,
      lastMove: lastMoveRecord,
      eventLog: [...newLogs, ...state.eventLog].slice(0, 40),
    };
  }

  // If the player earned an extra roll (6, capture bonus, or home bonus), they roll again!
  if (result.grantsExtraRoll) {
    return {
      ...state,
      players: result.updatedPlayers,
      pairs: result.updatedPairs,
      passingEntitlements: result.updatedPassingEntitlements,
      rankings: result.newRankings,
      winner: result.winner,
      turnPhase: 'WAITING_FOR_ROLL',
      diceValue: null,
      legalMoves: [],
      breakablePairIds: [],
      brokenPairTokenIdsThisRoll: [],
      selectedTokenId: null,
      lastMove: lastMoveRecord,
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
    pairs: result.updatedPairs,
    passingEntitlements: result.updatedPassingEntitlements,
    rankings: result.newRankings,
    winner: result.winner,
    activePlayerIndex: nextIndex,
    turnPhase: 'WAITING_FOR_ROLL',
    diceValue: null,
    consecutiveSixes: 0,
    sixSequenceSnapshot: null,
    legalMoves: [],
    breakablePairIds: [],
    brokenPairTokenIdsThisRoll: [],
    selectedTokenId: null,
    turnNumber: state.turnNumber + 1,
    lastMove: lastMoveRecord,
    eventLog: [...newLogs, ...state.eventLog].slice(0, 40),
  };
}

/**
 * Advances the turn when `turnPhase === 'TURN_TRANSITION'` (e.g. after no legal moves).
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
    sixSequenceSnapshot: null,
    legalMoves: [],
    breakablePairIds: [],
    selectedTokenId: null,
    turnNumber: state.turnNumber + 1,
  };
}
