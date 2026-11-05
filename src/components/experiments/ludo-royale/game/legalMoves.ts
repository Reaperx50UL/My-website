import {
  getGlobalTrackIndex,
  getStepPathCoords,
  isSafeTrackIndex,
} from './boardLayout';
import { FINISH_STEP, HOME_PATH_START_STEP, MAX_TRACK_STEPS } from './constants';
import type {
  BlockadePassingEntitlement,
  HouseRules,
  LegalMove,
  PlayerColor,
  PlayerState,
  Token,
  TokenPair,
} from './gameTypes';

export interface FormablePairOption {
  color: PlayerColor;
  steps: number;
  tokenIds: [string, string];
  tokenIndices: [number, number];
}

/**
 * Reconciles active TokenPairs across all players:
 * - Pair formation NEVER happens automatically during gameplay.
 * - Preserves existing valid pairs of 2 same-color tokens at the same eligible board position (0..55).
 * - Never allows pairs inside the Home Yard (-1) or in the finished triangle (56).
 * - Respects `brokenPairTokenIdsThisRoll` so tokens voluntarily separated during the current roll stay separate.
 */
export function reconcileTokenPairs(
  players: PlayerState[],
  existingPairs?: TokenPair[],
  brokenPairTokenIdsThisRoll: string[] = [],
  autoFormNewPairs: boolean = false
): {
  players: PlayerState[];
  pairs: TokenPair[];
  newlyFormedPairs: TokenPair[];
} {
  const shouldAutoForm = Boolean(autoFormNewPairs);
  const brokenSet = new Set(brokenPairTokenIdsThisRoll);
  const tokenMap = new Map<string, Token>();
  for (const p of players) {
    for (const t of p.tokens) {
      tokenMap.set(t.id, t);
    }
  }

  // Seed candidate pairs from explicit existingPairs or from tokens already carrying a matching pairId
  const candidatePairs: TokenPair[] = [...(existingPairs || [])];
  if (!existingPairs) {
    const byPairId = new Map<string, Token[]>();
    for (const p of players) {
      for (const t of p.tokens) {
        if (t.pairId) {
          const list = byPairId.get(t.pairId) || [];
          list.push(t);
          byPairId.set(t.pairId, list);
        }
      }
    }
    for (const [pairId, toks] of Array.from(byPairId.entries())) {
      if (toks.length === 2 && toks[0].color === toks[1].color && toks[0].steps === toks[1].steps) {
        const ordered = [...toks].sort((a, b) => a.index - b.index);
        candidatePairs.push({
          id: pairId,
          color: ordered[0].color,
          tokenIds: [ordered[0].id, ordered[1].id],
          steps: ordered[0].steps,
        });
      }
    }
  }

  const validPairs: TokenPair[] = [];
  const pairedTokenIds = new Set<string>();

  // 1. Validate and retain still-valid existing pairs on the board (0..55, never in Home Yard -1)
  for (const pair of candidatePairs) {
    const [idA, idB] = pair.tokenIds;
    if (brokenSet.has(idA) || brokenSet.has(idB)) continue;
    if (pairedTokenIds.has(idA) || pairedTokenIds.has(idB)) continue;

    const tA = tokenMap.get(idA);
    const tB = tokenMap.get(idB);
    if (!tA || !tB) continue;
    if (tA.color !== tB.color || tA.color !== pair.color) continue;
    if (tA.steps !== tB.steps) continue;
    // Pairing is prohibited in Home Yard (-1) and finished goal (56)
    if (tA.steps < 0 || tA.steps >= FINISH_STEP) continue;

    const ordered = [tA, tB].sort((a, b) => a.index - b.index);
    validPairs.push({
      id: pair.id,
      color: pair.color,
      tokenIds: [ordered[0].id, ordered[1].id],
      steps: ordered[0].steps,
    });
    pairedTokenIds.add(tA.id);
    pairedTokenIds.add(tB.id);
  }

  const newlyFormedPairs: TokenPair[] = [];

  if (shouldAutoForm) {
    for (const player of players) {
      const groups = new Map<string, Token[]>();

      for (const token of player.tokens) {
        if (pairedTokenIds.has(token.id)) continue;
        if (brokenSet.has(token.id)) continue;
        if (token.steps < 0 || token.steps >= FINISH_STEP) continue;

        const posKey = `board-${token.steps}`;
        const list = groups.get(posKey) || [];
        list.push(token);
        groups.set(posKey, list);
      }

      for (const [, candidates] of Array.from(groups.entries())) {
        candidates.sort((a: Token, b: Token) => a.index - b.index);
        while (candidates.length >= 2) {
          const t1 = candidates.shift()!;
          const t2 = candidates.shift()!;
          const pairId = `pair-${player.color}-${t1.index}-${t2.index}`;
          const newPair: TokenPair = {
            id: pairId,
            color: player.color,
            tokenIds: [t1.id, t2.id],
            steps: t1.steps,
          };
          validPairs.push(newPair);
          newlyFormedPairs.push(newPair);
          pairedTokenIds.add(t1.id);
          pairedTokenIds.add(t2.id);
        }
      }
    }
  }

  // 2. Synchronize pairId and yardSlot onto every token
  const pairByTokenId = new Map<string, TokenPair>();
  for (const pair of validPairs) {
    pairByTokenId.set(pair.tokenIds[0], pair);
    pairByTokenId.set(pair.tokenIds[1], pair);
  }

  const updatedPlayers: PlayerState[] = players.map((player) => ({
    ...player,
    tokens: player.tokens.map((token) => {
      const assignedPair =
        token.steps >= 0 && token.steps < FINISH_STEP
          ? pairByTokenId.get(token.id)
          : undefined;
      const nextPairId = assignedPair ? assignedPair.id : null;
      const nextYardSlot = token.steps === -1 ? token.index : undefined;

      return {
        ...token,
        pairId: nextPairId,
        yardSlot: nextYardSlot,
      };
    }),
  }));

  return {
    players: updatedPlayers,
    pairs: validPairs,
    newlyFormedPairs,
  };
}

/**
 * Returns all valid 2-token manual pair formation options for `playerColor`.
 * - ONLY ONE RULE: Two unpaired tokens of `playerColor` occupying the exact same board position
 *   anywhere on the board (`0 <= steps < FINISH_STEP`, excluding Home Yard `-1` and Home `56`)
 *   can be paired together regardless of the dice roll (`1..6` or before rolling).
 * - If >2 unpaired tokens of `playerColor` occupy the same square, returns every 2-token combination
 *   so the player can explicitly choose which two tokens to pair.
 */
export function getFormablePairOptionsForPlayer(
  playerColor: PlayerColor,
  _diceValue: number | null,
  players: PlayerState[],
  existingPairs?: TokenPair[],
  _brokenPairTokenIdsThisRoll: string[] = []
): FormablePairOption[] {
  const reconciled = reconcileTokenPairs(players, existingPairs, [], false);
  const player = reconciled.players.find((p) => p.color === playerColor);
  if (!player || player.hasFinished) return [];

  const bySteps = new Map<number, Token[]>();
  for (const tok of player.tokens) {
    if (tok.pairId) continue;
    if (tok.steps < 0 || tok.steps >= FINISH_STEP) continue;
    const list = bySteps.get(tok.steps) || [];
    list.push(tok);
    bySteps.set(tok.steps, list);
  }

  const options: FormablePairOption[] = [];
  for (const [steps, tokensAtStep] of Array.from(bySteps.entries())) {
    if (tokensAtStep.length < 2) continue;
    const sorted = [...tokensAtStep].sort((a, b) => a.index - b.index);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        options.push({
          color: playerColor,
          steps,
          tokenIds: [sorted[i].id, sorted[j].id],
          tokenIndices: [sorted[i].index, sorted[j].index],
        });
      }
    }
  }

  options.sort((a, b) => b.steps - a.steps);
  return options;
}

/**
 * Checks whether a pair can be voluntarily broken at its current position.
 * Under Part 4 custom rules, voluntary pair breaking has NO location restrictions
 * across any eligible board square (ordinary track squares, starting squares, Safe Stars, and Home Stretch 0..55).
 */
export function canBreakPairAtPosition(
  pairOrColor: TokenPair | PlayerColor,
  rulesOrSteps?: HouseRules | number,
  _maybeRules?: HouseRules
): boolean {
  const steps: number =
    typeof pairOrColor === 'string'
      ? typeof rulesOrSteps === 'number'
        ? rulesOrSteps
        : 0
      : pairOrColor.steps;

  return steps >= 0 && steps < FINISH_STEP;
}

/**
 * Checks whether a specific single token holds a valid temporary passing entitlement
 * to ignore a stationary opposing pair's blockade at `trackIndex`.
 */
export function hasValidPassingEntitlement(
  tokenId: string,
  opposingPairId: string,
  trackIndex: number,
  passingEntitlements: BlockadePassingEntitlement[] = []
): boolean {
  return passingEntitlements.some(
    (ent) =>
      ent.tokenId === tokenId &&
      ent.pairId === opposingPairId &&
      ent.trackIndex === trackIndex
  );
}

/**
 * Returns all opposing pairs currently occupying a given global track index (0..51).
 */
export function getOpposingPairsAtTrackIndex(
  moverColor: PlayerColor,
  trackIndex: number,
  pairs: TokenPair[]
): TokenPair[] {
  return pairs.filter((pair) => {
    if (pair.color === moverColor) return false;
    if (pair.steps < 0 || pair.steps > MAX_TRACK_STEPS) return false;
    const idx = getGlobalTrackIndex(pair.color, pair.steps);
    return idx === trackIndex;
  });
}

/**
 * Evaluates whether a path from `fromSteps` to `toSteps` is blocked by an opposing pair blockade.
 * - Normal blockade rule: Neither a single token nor a pair can pass through an intermediate square
 *   occupied by an opposing pair.
 * - Leaving a square occupied by an opposing pair: If an opposing pair is at `fromSteps`,
 *   a single token can only move forward past that pair if it holds a valid `BlockadePassingEntitlement`
 *   for that stationary pair (i.e. the single token previously landed on the pair and the pair remained stationary).
 * - Landing on `toSteps`: Never blocked by a pair at `toSteps` (single token coexists without capture;
 *   attacking pair captures opposing pair on non-safe squares or coexists on safe squares).
 */
export function checkPathBlockade(params: {
  moverColor: PlayerColor;
  tokenId: string;
  fromSteps: number;
  toSteps: number;
  isPairMove: boolean;
  pairs: TokenPair[];
  passingEntitlements: BlockadePassingEntitlement[];
}): { blocked: boolean; consumesEntitlement: boolean } {
  const {
    moverColor,
    tokenId,
    fromSteps,
    toSteps,
    isPairMove,
    pairs,
    passingEntitlements,
  } = params;

  let consumesEntitlement = false;

  // 1. Check starting square (if on main perimeter track 0..50)
  if (fromSteps >= 0 && fromSteps <= MAX_TRACK_STEPS) {
    const startTrackIdx = getGlobalTrackIndex(moverColor, fromSteps);
    if (startTrackIdx !== null) {
      const oppPairsOnStart = getOpposingPairsAtTrackIndex(
        moverColor,
        startTrackIdx,
        pairs
      );
      if (oppPairsOnStart.length > 0 && !isPairMove) {
        for (const oppPair of oppPairsOnStart) {
          if (
            hasValidPassingEntitlement(
              tokenId,
              oppPair.id,
              startTrackIdx,
              passingEntitlements
            )
          ) {
            consumesEntitlement = true;
          } else {
            return { blocked: true, consumesEntitlement: false };
          }
        }
      }
    }
  }

  // 2. Check intermediate squares along the path (fromSteps + 1 .. toSteps - 1)
  if (fromSteps >= 0) {
    for (let step = fromSteps + 1; step < toSteps; step++) {
      if (step <= MAX_TRACK_STEPS) {
        const midTrackIdx = getGlobalTrackIndex(moverColor, step);
        if (midTrackIdx !== null) {
          const oppPairsAtMid = getOpposingPairsAtTrackIndex(
            moverColor,
            midTrackIdx,
            pairs
          );
          for (const oppPair of oppPairsAtMid) {
            if (isPairMove) {
              return { blocked: true, consumesEntitlement: false };
            }
            if (
              hasValidPassingEntitlement(
                tokenId,
                oppPair.id,
                midTrackIdx,
                passingEntitlements
              )
            ) {
              consumesEntitlement = true;
            } else {
              return { blocked: true, consumesEntitlement: false };
            }
          }
        }
      }
    }
  }

  return { blocked: false, consumesEntitlement };
}

/**
 * Computes all legal moves for a given player and dice roll (1..6),
 * respecting token pairs, half-dice pair movement on even rolls, special capture rules,
 * and blockade/passing entitlement rules.
 */
export function getLegalMovesForPlayer(
  playerColor: PlayerColor,
  diceValue: number,
  players: PlayerState[],
  rules: HouseRules,
  existingPairs?: TokenPair[],
  passingEntitlements: BlockadePassingEntitlement[] = [],
  brokenPairTokenIdsThisRoll: string[] = []
): LegalMove[] {
  if (diceValue < 1 || diceValue > 6) {
    return [];
  }

  const reconciled = reconcileTokenPairs(
    players,
    existingPairs,
    brokenPairTokenIdsThisRoll
  );
  const syncedPlayers = reconciled.players;
  const activePairs = reconciled.pairs;

  const currentPlayer = syncedPlayers.find((p) => p.color === playerColor);
  if (!currentPlayer || currentPlayer.hasFinished) {
    return [];
  }

  const legalMoves: LegalMove[] = [];
  const handledPairIds = new Set<string>();

  for (const token of currentPlayer.tokens) {
    if (token.pairId) {
      if (handledPairIds.has(token.pairId)) continue;
      handledPairIds.add(token.pairId);

      const pair = activePairs.find((p) => p.id === token.pairId);
      if (pair) {
        const pairMove = evaluatePairMove(
          pair,
          diceValue,
          syncedPlayers,
          rules,
          activePairs,
          passingEntitlements
        );
        if (pairMove) {
          legalMoves.push(pairMove);
        }
      }
      continue;
    }

    const singleMove = evaluateSingleTokenMove(
      token,
      diceValue,
      syncedPlayers,
      rules,
      activePairs,
      passingEntitlements
    );
    if (singleMove) {
      legalMoves.push(singleMove);
    }
  }

  return legalMoves;
}

/**
 * Returns the IDs of all pairs belonging to `playerColor` that can be voluntarily broken (unpaired).
 * - Unpairing is available in ANY scenario on the player's turn for any pair on the board (`0 <= steps < 56`),
 *   regardless of the dice value (`1..6` or before rolling) or square type.
 */
export function getBreakablePairIdsForPlayer(
  playerColor: PlayerColor,
  _diceValue: number | null,
  players: PlayerState[],
  rules: HouseRules,
  existingPairs?: TokenPair[],
  _passingEntitlements: BlockadePassingEntitlement[] = [],
  brokenPairTokenIdsThisRoll: string[] = []
): string[] {
  const reconciled = reconcileTokenPairs(
    players,
    existingPairs,
    brokenPairTokenIdsThisRoll
  );
  const activePairs = reconciled.pairs;

  return activePairs
    .filter((pair) => pair.color === playerColor && canBreakPairAtPosition(pair, rules))
    .map((pair) => pair.id);
}

/**
 * Checks whether breaking any active pair belonging to `playerColor` unlocks at least one legal full-dice move on `diceValue`.
 */
export function canBreakPairToUnlockMove(
  playerColor: PlayerColor,
  diceValue: number,
  players: PlayerState[],
  rules: HouseRules,
  existingPairs?: TokenPair[],
  passingEntitlements: BlockadePassingEntitlement[] = []
): boolean {
  if (diceValue < 1 || diceValue > 6) {
    return false;
  }

  const reconciled = reconcileTokenPairs(players, existingPairs, []);
  const syncedPlayers = reconciled.players;
  const activePairs = reconciled.pairs;
  const playerPairs = activePairs.filter(
    (p) => p.color === playerColor && canBreakPairAtPosition(p, rules)
  );

  for (const pair of playerPairs) {
    const remainingPairs = activePairs.filter((p) => p.id !== pair.id);
    const simulatedPlayers = syncedPlayers.map((pl) =>
      pl.color === playerColor
        ? {
            ...pl,
            tokens: pl.tokens.map((t) =>
              t.pairId === pair.id ? { ...t, pairId: null } : t
            ),
          }
        : pl
    );
    const owner = simulatedPlayers.find((p) => p.color === playerColor);
    if (!owner) continue;

    const tokenA = owner.tokens.find((t) => t.id === pair.tokenIds[0]);
    const tokenB = owner.tokens.find((t) => t.id === pair.tokenIds[1]);

    const moveA = tokenA
      ? evaluateSingleTokenMove(
          tokenA,
          diceValue,
          simulatedPlayers,
          rules,
          remainingPairs,
          passingEntitlements
        )
      : null;
    const moveB = tokenB
      ? evaluateSingleTokenMove(
          tokenB,
          diceValue,
          simulatedPlayers,
          rules,
          remainingPairs,
          passingEntitlements
        )
      : null;

    if (moveA || moveB) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates whether a paired group of 2 tokens can legally move on `diceValue`.
 * - Pair moves ONLY when `diceValue` is even (2, 4, 6).
 * - On the board (0..55), the pair moves `diceValue / 2` squares (2->1, 4->2, 6->3).
 * - In the Home Yard (-1), entering the board requires rolling a 6 (deploys pair to step 0).
 * - Only a pair can capture another pair (never captures a single token).
 */
export function evaluatePairMove(
  pair: TokenPair,
  diceValue: number,
  players: PlayerState[],
  rules: HouseRules,
  pairs: TokenPair[],
  passingEntitlements: BlockadePassingEntitlement[] = []
): LegalMove | null {
  // Pairs can ONLY move on even dice values (2, 4, 6)
  if (diceValue % 2 !== 0) {
    return null;
  }

  const owner = players.find((p) => p.color === pair.color);
  if (!owner) return null;

  const primaryToken = owner.tokens.find((t) => t.id === pair.tokenIds[0]);
  const secondaryToken = owner.tokens.find((t) => t.id === pair.tokenIds[1]);
  if (!primaryToken || !secondaryToken) return null;

  if (pair.steps < 0 || pair.steps >= FINISH_STEP) {
    return null;
  }

  // Pair is on the board from Starting Point (0) to Home Stretch (55) -> moves exactly half the dice value (diceValue / 2)
  const moveDistance = diceValue / 2;
  const targetSteps = pair.steps + moveDistance;

  // Both tokens must be able to complete the movement legally without exceeding FINISH_STEP (56)
  if (targetSteps > FINISH_STEP) {
    return null;
  }

  // Check path blockades along intermediate squares
  const blockadeCheck = checkPathBlockade({
    moverColor: pair.color,
    tokenId: primaryToken.id,
    fromSteps: pair.steps,
    toSteps: targetSteps,
    isPairMove: true,
    pairs,
    passingEntitlements,
  });
  if (blockadeCheck.blocked) {
    return null;
  }

  const entersHomePath =
    pair.steps <= MAX_TRACK_STEPS && targetSteps >= HOME_PATH_START_STEP;
  const reachesHome = targetSteps === FINISH_STEP;

  let capturesTokenIds: string[] = [];
  let reachesSafeSquare = true;

  if (targetSteps <= MAX_TRACK_STEPS) {
    const targetTrackIdx = getGlobalTrackIndex(pair.color, targetSteps)!;
    reachesSafeSquare = isSafeTrackIndex(targetTrackIdx, rules);
    if (!reachesSafeSquare) {
      capturesTokenIds = findCapturableOpponentTokens(
        pair.color,
        targetTrackIdx,
        players,
        true,
        pairs
      );
    }
  } else {
    reachesSafeSquare = true;
  }

  return {
    tokenId: primaryToken.id,
    tokenIndex: primaryToken.index,
    fromSteps: pair.steps,
    toSteps: targetSteps,
    pathCoords: getStepPathCoords(
      pair.color,
      pair.steps,
      targetSteps,
      primaryToken.index
    ),
    capturesTokenIds,
    entersHomePath,
    reachesHome,
    reachesSafeSquare,
    isPairMove: true,
    pairId: pair.id,
    pairedTokenIds: pair.tokenIds,
    moveDistance,
    consumesPassingEntitlement: false,
  };
}

/**
 * Evaluates whether an unpaired single token can legally move by `diceValue` steps.
 */
export function evaluateSingleTokenMove(
  token: Token,
  diceValue: number,
  players: PlayerState[],
  rules: HouseRules,
  pairs: TokenPair[] = [],
  passingEntitlements: BlockadePassingEntitlement[] = []
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
      : findCapturableOpponentTokens(
          token.color,
          targetTrackIdx,
          players,
          false,
          pairs
        );

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
      isPairMove: false,
      moveDistance: 1,
      consumesPassingEntitlement: false,
    };
  }

  // 3. Token is on the board (0..55)
  const targetSteps = token.steps + diceValue;

  // Exact roll required to reach FINISH_STEP (56)
  if (targetSteps > FINISH_STEP) {
    return null;
  }

  // Validate against opposing pair blockades and check temporary passing entitlements
  const blockadeCheck = checkPathBlockade({
    moverColor: token.color,
    tokenId: token.id,
    fromSteps: token.steps,
    toSteps: targetSteps,
    isPairMove: false,
    pairs,
    passingEntitlements,
  });
  if (blockadeCheck.blocked) {
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
        players,
        false,
        pairs
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
    pathCoords: getStepPathCoords(
      token.color,
      token.steps,
      targetSteps,
      token.index
    ),
    capturesTokenIds,
    entersHomePath,
    reachesHome,
    reachesSafeSquare,
    isPairMove: false,
    moveDistance: diceValue,
    consumesPassingEntitlement: blockadeCheck.consumesEntitlement,
  };
}

/**
 * Legacy-compatible wrapper for evaluating a token move.
 */
export function evaluateTokenMove(
  token: Token,
  diceValue: number,
  players: PlayerState[],
  rules: HouseRules
): LegalMove | null {
  const reconciled = reconcileTokenPairs(players);
  const syncedToken =
    reconciled.players
      .find((p) => p.color === token.color)
      ?.tokens.find((t) => t.id === token.id) || token;

  if (syncedToken.pairId) {
    const pair = reconciled.pairs.find((p) => p.id === syncedToken.pairId);
    if (!pair) return null;
    return evaluatePairMove(pair, diceValue, reconciled.players, rules, reconciled.pairs);
  }
  return evaluateSingleTokenMove(
    syncedToken,
    diceValue,
    reconciled.players,
    rules,
    reconciled.pairs
  );
}

/**
 * Finds all opponent token IDs at `targetTrackIndex` that can be captured according to the
 * custom Ludo Royale capture matrix:
 * - Single token vs Single token -> Captures opposing single tokens (never captures opposing pairs)
 * - Single token vs Pair         -> No capture (coexists on the square)
 * - Pair vs Single token         -> No capture (coexists on the square)
 * - Pair vs Pair                 -> Captures both tokens of the opposing pair
 */
export function findCapturableOpponentTokens(
  moverColor: PlayerColor,
  targetTrackIndex: number,
  players: PlayerState[],
  isPairMove: boolean = false,
  pairs?: TokenPair[]
): string[] {
  const activePairs = pairs ?? reconcileTokenPairs(players).pairs;
  const pairedTokenSet = new Set<string>();
  for (const pair of activePairs) {
    pairedTokenSet.add(pair.tokenIds[0]);
    pairedTokenSet.add(pair.tokenIds[1]);
  }

  if (isPairMove) {
    // Pair vs Pair ONLY: find all opposing pairs occupying `targetTrackIndex`
    const capturedPairTokens: string[] = [];
    for (const pair of activePairs) {
      if (pair.color === moverColor) continue;
      const oppTrackIdx = getGlobalTrackIndex(pair.color, pair.steps);
      if (oppTrackIdx !== null && oppTrackIdx === targetTrackIndex) {
        capturedPairTokens.push(pair.tokenIds[0], pair.tokenIds[1]);
      }
    }
    return capturedPairTokens;
  }

  // Single token vs Single token ONLY: find all opposing unpaired tokens occupying `targetTrackIndex`
  const capturedSingleIds: string[] = [];
  for (const player of players) {
    if (player.color === moverColor) continue;
    for (const oppToken of player.tokens) {
      if (pairedTokenSet.has(oppToken.id) || oppToken.pairId) continue;
      const oppTrackIdx = getGlobalTrackIndex(oppToken.color, oppToken.steps);
      if (oppTrackIdx !== null && oppTrackIdx === targetTrackIndex) {
        capturedSingleIds.push(oppToken.id);
      }
    }
  }
  return capturedSingleIds;
}
