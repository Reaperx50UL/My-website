import { getGlobalTrackIndex, isSafeTrackIndex } from './boardLayout';
import { FINISH_STEP, MAX_TRACK_STEPS, TOTAL_TRACK_CELLS } from './constants';
import { breakTokenPair, formTokenPair } from './gameEngine';
import type {
  AIDifficulty,
  BlockadePassingEntitlement,
  GameState,
  HouseRules,
  LegalMove,
  PlayerColor,
  PlayerState,
  TokenPair,
} from './gameTypes';
import {
  getFormablePairOptionsForPlayer,
  getOpposingPairsAtTrackIndex,
  reconcileTokenPairs,
} from './legalMoves';

export interface AITurnDecision {
  formPairTokenIds?: [string, string];
  breakPairId?: string;
  move: LegalMove;
}

/**
 * High-level AI turn decision that can:
 * - Manually form a pair on an even dice roll (2, 4, 6) at any eligible board position (0..55)
 * - Voluntarily break a pair at any board position (0..55) when forced or tactically advantageous
 * - Execute a direct single-token or half-dice pair move
 */
export function chooseAITurnDecision(
  state: GameState,
  randomFn: () => number = Math.random
): AITurnDecision | null {
  const activePlayer = state.players[state.activePlayerIndex];
  if (!activePlayer) return null;

  const difficulty: AIDifficulty = activePlayer.aiDifficulty || 'medium';
  const breakableIds = state.breakablePairIds || [];
  const formableOptions =
    state.diceValue !== null
      ? getFormablePairOptionsForPlayer(
          activePlayer.color,
          state.diceValue,
          state.players,
          state.pairs || [],
          state.brokenPairTokenIdsThisRoll || []
        )
      : [];

  // 1. If there are no direct legal moves (e.g. odd dice roll with only a pair on the board,
  //    or even dice roll where only forming a pair unlocks a half-dice move):
  if (state.legalMoves.length === 0) {
    let bestDecision: AITurnDecision | null = null;
    let bestScore = -Infinity;

    for (const pairId of breakableIds) {
      const brokenState = breakTokenPair(state, pairId);
      const candidateMove = chooseAIMove(
        brokenState.legalMoves,
        difficulty,
        activePlayer.color,
        brokenState.players,
        brokenState.rules,
        randomFn,
        brokenState.pairs,
        brokenState.passingEntitlements
      );
      if (candidateMove) {
        const score =
          difficulty === 'easy'
            ? randomFn()
            : evaluateHardMoveScore(
                candidateMove,
                activePlayer.color,
                brokenState.players,
                brokenState.rules,
                brokenState.pairs,
                brokenState.passingEntitlements
              );
        if (score > bestScore) {
          bestScore = score;
          bestDecision = { breakPairId: pairId, move: candidateMove };
        }
      }
    }

    for (const opt of formableOptions) {
      const formedState = formTokenPair(
        state,
        opt.tokenIds[0],
        opt.tokenIds[1]
      );
      const candidateMove = chooseAIMove(
        formedState.legalMoves,
        difficulty,
        activePlayer.color,
        formedState.players,
        formedState.rules,
        randomFn,
        formedState.pairs,
        formedState.passingEntitlements
      );
      if (candidateMove) {
        const score =
          difficulty === 'easy'
            ? randomFn()
            : evaluateHardMoveScore(
                candidateMove,
                activePlayer.color,
                formedState.players,
                formedState.rules,
                formedState.pairs,
                formedState.passingEntitlements
              ) + 40;
        if (score > bestScore) {
          bestScore = score;
          bestDecision = {
            formPairTokenIds: opt.tokenIds,
            move: candidateMove,
          };
        }
      }
    }

    return bestDecision;
  }

  // 2. Evaluate best direct move without forming or breaking a pair
  const directMove = chooseAIMove(
    state.legalMoves,
    difficulty,
    activePlayer.color,
    state.players,
    state.rules,
    randomFn,
    state.pairs,
    state.passingEntitlements
  );
  if (!directMove) return null;

  // Easy AI only forms or breaks pairs when forced or occasionally forms a pair on even rolls
  if (difficulty === 'easy') {
    if (formableOptions.length > 0 && randomFn() < 0.35) {
      const opt = formableOptions[0];
      const formedState = formTokenPair(
        state,
        opt.tokenIds[0],
        opt.tokenIds[1]
      );
      const formedMove = chooseAIMove(
        formedState.legalMoves,
        difficulty,
        activePlayer.color,
        formedState.players,
        formedState.rules,
        randomFn,
        formedState.pairs,
        formedState.passingEntitlements
      );
      if (formedMove) {
        return { formPairTokenIds: opt.tokenIds, move: formedMove };
      }
    }
    return { move: directMove };
  }

  const directScore = evaluateHardMoveScore(
    directMove,
    activePlayer.color,
    state.players,
    state.rules,
    state.pairs,
    state.passingEntitlements
  );

  let bestDecision: AITurnDecision = { move: directMove };
  let bestScore = directScore;

  // 3. For Medium & Hard AI, evaluate manually forming an eligible pair on even rolls (2, 4, 6)
  for (const opt of formableOptions) {
    const formedState = formTokenPair(state, opt.tokenIds[0], opt.tokenIds[1]);
    const formedCandidate = chooseAIMove(
      formedState.legalMoves,
      difficulty,
      activePlayer.color,
      formedState.players,
      formedState.rules,
      randomFn,
      formedState.pairs,
      formedState.passingEntitlements
    );
    if (!formedCandidate) continue;

    // Forming a pair creates a blockade and immunity against single tokens (+42 tactical bonus)
    const formedScore =
      evaluateHardMoveScore(
        formedCandidate,
        activePlayer.color,
        formedState.players,
        formedState.rules,
        formedState.pairs,
        formedState.passingEntitlements
      ) + 42;

    if (formedScore > bestScore) {
      bestScore = formedScore;
      bestDecision = {
        formPairTokenIds: opt.tokenIds,
        move: formedCandidate,
      };
    }
  }

  // 4. For Medium & Hard AI, check if voluntarily breaking a pair at any location enables a high-value tactical play
  //    (such as capturing an opponent single token, reaching Home 56, or escaping an opposing pair threat)
  for (const pairId of breakableIds) {
    const brokenState = breakTokenPair(state, pairId);
    const brokenCandidate = chooseAIMove(
      brokenState.legalMoves,
      difficulty,
      activePlayer.color,
      brokenState.players,
      brokenState.rules,
      randomFn,
      brokenState.pairs,
      brokenState.passingEntitlements
    );
    if (!brokenCandidate) continue;

    // Breaking a pair gives up a defensive blockade, so require a meaningful tactical advantage (+35)
    const brokenScore =
      evaluateHardMoveScore(
        brokenCandidate,
        activePlayer.color,
        brokenState.players,
        brokenState.rules,
        brokenState.pairs,
        brokenState.passingEntitlements
      ) - 35;

    if (brokenScore > bestScore) {
      bestScore = brokenScore;
      bestDecision = { breakPairId: pairId, move: brokenCandidate };
    }
  }

  return bestDecision;
}

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
  randomFn: () => number = Math.random,
  pairs?: TokenPair[],
  passingEntitlements?: BlockadePassingEntitlement[]
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

  const activePairs = pairs ?? reconcileTokenPairs(players).pairs;

  // Medium: Prioritizes captures (including pair-vs-pair captures), forming pairs, safe squares, exiting yard, and reaching home
  if (difficulty === 'medium') {
    let bestMove = legalMoves[0];
    let bestScore = -Infinity;

    for (const move of legalMoves) {
      let score = 0;
      if (move.capturesTokenIds.length > 0) {
        score += 105 * move.capturesTokenIds.length;
      }
      if (move.reachesHome) score += move.isPairMove ? 140 : 90;
      if (move.fromSteps === -1) score += move.isPairMove ? 95 : 75;
      if (move.entersHomePath) score += move.isPairMove ? 90 : 65;
      if (move.reachesSafeSquare) score += 40;
      if (move.consumesPassingEntitlement) score += 35;
      if (
        !move.isPairMove &&
        doesMoveFormPair(move, aiColor, players, activePairs)
      ) {
        score += 50;
      }
      score += move.toSteps * 0.8;
      score += randomFn() * 2;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  }

  // Hard: Evaluates moves using a comprehensive tactical heuristic understanding all custom rules
  let bestMove = legalMoves[0];
  let bestScore = -Infinity;

  for (const move of legalMoves) {
    const score = evaluateHardMoveScore(
      move,
      aiColor,
      players,
      rules,
      activePairs,
      passingEntitlements
    );
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * Computes the tactical score of a candidate move for Hard AI:
 * - Recognizes pair-vs-pair captures and single-vs-single captures
 * - Recognizes forming a pair with a friendly unpaired token
 * - Recognizes landing on an opposing pair to earn a next-roll blockade passing entitlement
 * - Recognizes consuming a temporary passing entitlement to bypass a stationary pair blockade
 * - Evaluates threat exposure separately for single tokens (threatened only by opposing single tokens)
 *   vs pairs (threatened only by opposing pairs within 1..3 steps behind)
 */
export function evaluateHardMoveScore(
  move: LegalMove,
  aiColor: PlayerColor,
  players: PlayerState[],
  rules: HouseRules,
  pairs?: TokenPair[],
  passingEntitlements?: BlockadePassingEntitlement[]
): number {
  let score = 0;
  const activePairs = pairs ?? reconcileTokenPairs(players).pairs;

  // 1. Capturing opponent tokens (single-vs-single or pair-vs-pair)
  if (move.capturesTokenIds.length > 0) {
    for (const capId of move.capturesTokenIds) {
      const oppToken = findTokenById(capId, players);
      const oppProgress = oppToken ? Math.max(0, oppToken.steps) : 20;
      score += 140 + oppProgress * 1.5;
    }
  }

  // 2. Finishing or entering safe home stretch
  if (move.reachesHome) {
    score += move.isPairMove ? 210 : 130;
  }
  if (move.entersHomePath) {
    score += move.isPairMove ? 155 : 110;
  }

  // 3. Exiting the yard with a 6
  if (move.fromSteps === -1 && move.toSteps === 0) {
    score += move.isPairMove ? 125 : 95;
  }

  // 4. Forming a new pair on an eligible square (creates a blockade and immunity to single tokens)
  const formsPair =
    !move.isPairMove && doesMoveFormPair(move, aiColor, players, activePairs);
  if (formsPair) {
    score += 62;
  }

  // 5. Consuming a temporary passing entitlement to move past a stationary opposing pair blockade
  if (move.consumesPassingEntitlement) {
    score += 48;
  }

  // 6. Single token landing on an opposing pair to gain a next-roll passing entitlement
  if (
    !move.isPairMove &&
    move.toSteps >= 0 &&
    move.toSteps <= MAX_TRACK_STEPS
  ) {
    const destTrackIdx = getGlobalTrackIndex(aiColor, move.toSteps);
    if (destTrackIdx !== null) {
      const oppPairsAtDest = getOpposingPairsAtTrackIndex(
        aiColor,
        destTrackIdx,
        activePairs
      );
      if (oppPairsAtDest.length > 0) {
        score += 24;
      }
    }
  }

  // 7. Evaluate danger at current position vs target position using the custom capture matrix
  const isPairAfterMove = Boolean(move.isPairMove || formsPair);
  const currentDanger =
    move.fromSteps >= 0 && move.fromSteps <= MAX_TRACK_STEPS
      ? computeSquareDanger(
          aiColor,
          move.fromSteps,
          Boolean(move.isPairMove),
          players,
          rules,
          activePairs
        )
      : 0;

  const targetDanger =
    move.toSteps >= 0 && move.toSteps <= MAX_TRACK_STEPS
      ? computeSquareDanger(
          aiColor,
          move.toSteps,
          isPairAfterMove,
          players,
          rules,
          activePairs
        )
      : 0;

  score += currentDanger * 32;
  score -= targetDanger * 38;

  // 8. Safe square bonus / leaving safe square penalty
  if (move.reachesSafeSquare && move.toSteps <= MAX_TRACK_STEPS) {
    score += 45;
  }
  if (move.fromSteps >= 0 && move.fromSteps <= MAX_TRACK_STEPS) {
    const fromTrackIdx = getGlobalTrackIndex(aiColor, move.fromSteps)!;
    if (isSafeTrackIndex(fromTrackIdx, rules) && !move.reachesSafeSquare) {
      score -= 22;
    }
  }

  // 9. Reward advancing tokens closer to home path
  if (move.toSteps <= MAX_TRACK_STEPS) {
    score += move.toSteps * (move.isPairMove ? 1.4 : 1.1);
  } else if (move.toSteps < FINISH_STEP) {
    score += 55 + (move.toSteps - MAX_TRACK_STEPS) * 4;
  }

  void passingEntitlements;
  return score;
}

/**
 * Checks if a single token move will land on a square occupied by an unpaired friendly token,
 * thereby forming a new pair.
 */
function doesMoveFormPair(
  move: LegalMove,
  playerColor: PlayerColor,
  players: PlayerState[],
  pairs: TokenPair[]
): boolean {
  if (move.toSteps < 0 || move.toSteps >= FINISH_STEP) return false;
  const owner = players.find((p) => p.color === playerColor);
  if (!owner) return false;

  const pairedIds = new Set<string>();
  for (const p of pairs) {
    pairedIds.add(p.tokenIds[0]);
    pairedIds.add(p.tokenIds[1]);
  }

  return owner.tokens.some(
    (t) =>
      t.id !== move.tokenId &&
      !pairedIds.has(t.id) &&
      !t.pairId &&
      t.steps === move.toSteps
  );
}

/**
 * Computes threat danger at `steps` according to the custom Ludo Royale capture matrix:
 * - If `isPair` is true: ONLY opposing pairs within 1..3 steps behind (even rolls 2, 4, 6) can capture it!
 * - If `isPair` is false: ONLY opposing single tokens within 1..6 steps behind can capture it!
 */
function computeSquareDanger(
  playerColor: PlayerColor,
  steps: number,
  isPair: boolean,
  players: PlayerState[],
  rules: HouseRules,
  pairs: TokenPair[]
): number {
  const trackIdx = getGlobalTrackIndex(playerColor, steps);
  if (trackIdx === null || isSafeTrackIndex(trackIdx, rules)) {
    return 0;
  }

  let threats = 0;

  if (isPair) {
    // Only opposing pairs within 1, 2, or 3 steps behind can capture this pair
    for (const oppPair of pairs) {
      if (oppPair.color === playerColor) continue;
      const oppTrackIdx = getGlobalTrackIndex(oppPair.color, oppPair.steps);
      if (oppTrackIdx === null) continue;
      const distanceBehind =
        (trackIdx - oppTrackIdx + TOTAL_TRACK_CELLS) % TOTAL_TRACK_CELLS;
      if (distanceBehind >= 1 && distanceBehind <= 3) {
        if (oppPair.steps + distanceBehind <= MAX_TRACK_STEPS) {
          threats += 1.5;
        }
      }
    }
    return threats;
  }

  const pairedTokenSet = new Set<string>();
  for (const p of pairs) {
    pairedTokenSet.add(p.tokenIds[0]);
    pairedTokenSet.add(p.tokenIds[1]);
  }

  for (const opp of players) {
    if (opp.color === playerColor || opp.hasFinished) continue;
    for (const oppToken of opp.tokens) {
      if (pairedTokenSet.has(oppToken.id) || oppToken.pairId) continue;
      const oppTrackIdx = getGlobalTrackIndex(opp.color, oppToken.steps);
      if (oppTrackIdx === null) continue;
      const distanceBehind =
        (trackIdx - oppTrackIdx + TOTAL_TRACK_CELLS) % TOTAL_TRACK_CELLS;
      if (distanceBehind >= 1 && distanceBehind <= 6) {
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
