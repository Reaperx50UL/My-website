import {
   getGlobalTrackIndex,
  getStepPathCoords,
  isSafeTrackIndex,
} from './boardLayout';
import { FINISH_STEP, HOME_PATH_START_STEP, MAX_TRACK_STEPS } from './constants';
import { HouseRules, LegalMove, PlayerColor, PlayerState, Token } from './gameTypes';

/**
 * Computes all legal moves for a given player and dice roll (1..6).
 */
export function getLegalMovesForPlayer(
  playerColor: PlayerColor,
  diceValue: number,
  players: PlayerState[],
  rules: HouseRules
): LegalMove[] {
  if (diceValue < 1 || diceValue > 6) {
    return [];
  }

  const currentPlayer = players.find((p) => p.color === playerColor);
  if (!currentPlayer || currentPlayer.hasFinished) {
    return [];
  }

  const legalMoves: LegalMove[] = [];

  for (const token of currentPlayer.tokens) {
    const move = evaluateTokenMove(token, diceValue, players, rules);
    if (move) {
      legalMoves.push(move);
    }
  }

  return legalMoves;
}

/**
 * Evaluates whether a single token can legally move by `diceValue` steps.
 */
export function evaluateTokenMove(
  token: Token,
  diceValue: number,
  players: PlayerState[],
  rules: HouseRules
): LegalMove | null {
  // 1. Token already finished
  if (token.steps >= FINISH_STEP) {
    return null;
  }

  // 2. Token is in starting yard (-1): requires a 6 to exit onto step 0
  if (token.steps === -1) {
    if (diceValue !== 6) {
      return null;
    }
    const toSteps = 0;
    const targetTrackIdx = getGlobalTrackIndex(token.color, toSteps)!;
    const isSafe = isSafeTrackIndex(targetTrackIdx, rules);
    const captures = isSafe
      ? []
      : findCapturableOpponentTokens(token.color, targetTrackIdx, players);

    return {
      tokenId: token.id,
      tokenIndex: token.index,
      fromSteps: -1,
      toSteps: 0,
      pathCoords: getStepPathCoords(token.color, -1, 0, token.index),
      capturesTokenIds: captures,
      entersHomePath: false,
      reachesHome: false,
      reachesSafeSquare: isSafe,
    };
  }

  // 3. Token is on the board (0..55)
  const targetSteps = token.steps + diceValue;

  // Exact roll required to reach FINISH_STEP (56)
  if (targetSteps > FINISH_STEP) {
    return null;
  }

  const entersHomePath =
    token.steps <= MAX_TRACK_STEPS && targetSteps >= HOME_PATH_START_STEP;
  const reachesHome = targetSteps === FINISH_STEP;

  let capturesTokenIds: string[] = [];
  let reachesSafeSquare = true;

  if (targetSteps <= MAX_TRACK_STEPS) {
    const targetTrackIdx = getGlobalTrackIndex(token.color, targetSteps)!;
    reachesSafeSquare = isSafeTrackIndex(targetTrackIdx, rules);
    if (!reachesSafeSquare) {
      capturesTokenIds = findCapturableOpponentTokens(
        token.color,
        targetTrackIdx,
        players
      );
    }
  } else {
    // Home path (51..55) and Finish (56) are always private and safe
    reachesSafeSquare = true;
  }

  return {
    tokenId: token.id,
    tokenIndex: token.index,
    fromSteps: token.steps,
    toSteps: targetSteps,
    pathCoords: getStepPathCoords(token.color, token.steps, targetSteps, token.index),
    capturesTokenIds,
    entersHomePath,
    reachesHome,
    reachesSafeSquare,
  };
}

/**
 * Finds all opponent token IDs currently occupying a non-safe global track index.
 */
export function findCapturableOpponentTokens(
  moverColor: PlayerColor,
  targetTrackIndex: number,
  players: PlayerState[]
): string[] {
  const capturedIds: string[] = [];
  for (const player of players) {
    if (player.color === moverColor) continue;
    for (const oppToken of player.tokens) {
      const oppTrackIdx = getGlobalTrackIndex(oppToken.color, oppToken.steps);
      if (oppTrackIdx !== null && oppTrackIdx === targetTrackIndex) {
        capturedIds.push(oppToken.id);
      }
    }
  }
  return capturedIds;
}
