import { getGlobalTrackIndex, isSafeTrackIndex } from './boardLayout';
import { FINISH_STEP, MAX_TRACK_STEPS, TOTAL_TRACK_CELLS } from './constants';
import { AIDifficulty, HouseRules, LegalMove, PlayerColor, PlayerState } from './gameTypes';

/**
 * Selects the best LegalMove for an AI player according to difficulty ('easy' | 'medium' | 'hard').
 * Always chooses strictly from the provided legalMoves array.
 */
export function chooseAIMove(
  legalMoves: LegalMove[],
  difficulty: AIDifficulty,
  aiColor: PlayerColor,
  players: PlayerState[],
  rules: HouseRules,
  randomFn: () => number = Math.random
): LegalMove | null {
  if (legalMoves.length === 0) {
    return null;
  }
  if (legalMoves.length === 1) {
    return legalMoves[0];
  }

  // Easy: Selects randomly among legal moves
  if (difficulty === 'easy') {
    const idx = Math.floor(randomFn() * legalMoves.length);
    return legalMoves[Math.min(idx, legalMoves.length - 1)];
  }

  // Medium: Prioritizes captures, safe squares, exiting yard, and reaching home
  if (difficulty === 'medium') {
    let bestMove = legalMoves[0];
    let bestScore = -Infinity;

    for (const move of legalMoves) {
      let score = 0;
      if (move.capturesTokenIds.length > 0) score += 100 * move.capturesTokenIds.length;
      if (move.reachesHome) score += 90;
      if (move.fromSteps === -1) score += 75;
      if (move.entersHomePath) score += 65;
      if (move.reachesSafeSquare) score += 40;
      score += move.toSteps * 0.8;
      // Slight tie-breaker jitter
      score += randomFn() * 2;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  }

  // Hard: Evaluates moves using a comprehensive tactical heuristic:
  // - Capturing opponents (weighted higher if the captured opponent is close to their home path!)
  // - Escaping danger (leaving a non-safe square where opponent tokens are within 1..6 steps behind)
  // - Avoiding moving into danger (landing on a non-safe square within 1..6 steps ahead of opponents)
  // - Leaving a safe square penalty if exposed
  // - Entering home path / finishing
  // - Deploying from yard
  let bestMove = legalMoves[0];
  let bestScore = -Infinity;

  for (const move of legalMoves) {
    const score = evaluateHardMoveScore(move, aiColor, players, rules);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * Computes the tactical score of a candidate move for Hard AI.
 */
export function evaluateHardMoveScore(
  move: LegalMove,
  aiColor: PlayerColor,
  players: PlayerState[],
  rules: HouseRules
): number {
  let score = 0;

  // 1. Capturing opponent tokens
  if (move.capturesTokenIds.length > 0) {
    for (const capId of move.capturesTokenIds) {
      const oppToken = findTokenById(capId, players);
      const oppProgress = oppToken ? Math.max(0, oppToken.steps) : 20;
      score += 140 + oppProgress * 1.5;
    }
  }

  // 2. Finishing or entering safe home stretch
  if (move.reachesHome) {
    score += 130;
  }
  if (move.entersHomePath) {
    score += 110;
  }

  // 3. Exiting the yard with a 6
  if (move.fromSteps === -1 && move.toSteps === 0) {
    score += 95;
  }

  // 4. Evaluate danger at current position vs target position
  const currentDanger =
    move.fromSteps >= 0 && move.fromSteps <= MAX_TRACK_STEPS
      ? computeSquareDanger(aiColor, move.fromSteps, players, rules)
      : 0;

  const targetDanger =
    move.toSteps >= 0 && move.toSteps <= MAX_TRACK_STEPS
      ? computeSquareDanger(aiColor, move.toSteps, players, rules)
      : 0;

  // Escaping immediate danger is highly valuable
  score += currentDanger * 32;
  // Moving into danger is penalized
  score -= targetDanger * 38;

  // 5. Safe square bonus / leaving safe square penalty
  if (move.reachesSafeSquare && move.toSteps <= MAX_TRACK_STEPS) {
    score += 45;
  }
  if (move.fromSteps >= 0 && move.fromSteps <= MAX_TRACK_STEPS) {
    const fromTrackIdx = getGlobalTrackIndex(aiColor, move.fromSteps)!;
    if (isSafeTrackIndex(fromTrackIdx, rules) && !move.reachesSafeSquare) {
      score -= 22;
    }
  }

  // 6. Reward advancing tokens that are closer to home path (50)
  if (move.toSteps <= MAX_TRACK_STEPS) {
    score += move.toSteps * 1.1;
  } else if (move.toSteps < FINISH_STEP) {
    // Inside home column: advancing closer to finish
    score += 55 + (move.toSteps - MAX_TRACK_STEPS) * 4;
  }

  return score;
}

/**
 * Counts how many opponent tokens are within 1..6 steps behind the given player token on a non-safe track square.
 */
function computeSquareDanger(
  playerColor: PlayerColor,
  steps: number,
  players: PlayerState[],
  rules: HouseRules
): number {
  const trackIdx = getGlobalTrackIndex(playerColor, steps);
  if (trackIdx === null || isSafeTrackIndex(trackIdx, rules)) {
    return 0;
  }

  let threats = 0;
  for (const opp of players) {
    if (opp.color === playerColor || opp.hasFinished) continue;
    for (const oppToken of opp.tokens) {
      const oppTrackIdx = getGlobalTrackIndex(opp.color, oppToken.steps);
      if (oppTrackIdx === null) continue;
      const distanceBehind =
        (trackIdx - oppTrackIdx + TOTAL_TRACK_CELLS) % TOTAL_TRACK_CELLS;
      if (distanceBehind >= 1 && distanceBehind <= 6) {
        // Only count as a threat if the opponent doesn't turn into their home path before reaching `trackIdx`
        if (oppToken.steps + distanceBehind <= MAX_TRACK_STEPS) {
          threats += 1;
        }
      }
    }
  }
  return threats;
}

function findTokenById(tokenId: string, players: PlayerState[]) {
  for (const p of players) {
    for (const t of p.tokens) {
      if (t.id === tokenId) return t;
    }
  }
  return null;
}
