import { getGlobalTrackIndex } from './boardLayout';
import { FINISH_STEP, MAX_TRACK_STEPS } from './constants';
import type {
  BlockadePassingEntitlement,
  HouseRules,
  LegalMove,
  PlayerColor,
  PlayerState,
  TokenPair,
} from './gameTypes';
import {
  getOpposingPairsAtTrackIndex,
  reconcileTokenPairs,
} from './legalMoves';

export interface MoveExecutionResult {
  updatedPlayers: PlayerState[];
  updatedPairs: TokenPair[];
  newlyFormedPairs: TokenPair[];
  updatedPassingEntitlements: BlockadePassingEntitlement[];
  grantsExtraRoll: boolean;
  playerJustFinished: boolean;
  newRankings: PlayerColor[];
  isGameOver: boolean;
  winner: PlayerColor | null;
}

/**
 * Applies a validated LegalMove (single token or paired group) to the players array:
 * - Moves single token or both paired tokens together.
 * - Sends captured single tokens or captured opposing pairs back to their Home Yard (-1).
 * - Automatically forms pairs when two same-color tokens occupy the same eligible position.
 * - Grants or consumes temporary BlockadePassingEntitlement records according to Part 7 rules.
 * - Checks if the player finished all 4 tokens and calculates whether an extra roll is earned.
 */
export function applyMoveToPlayers(
  players: PlayerState[],
  activePlayerIndex: number,
  move: LegalMove,
  diceValue: number,
  currentRankings: PlayerColor[],
  rules: HouseRules,
  existingPairs: TokenPair[] = [],
  existingEntitlements: BlockadePassingEntitlement[] = [],
  brokenPairTokenIdsThisRoll: string[] = [],
  turnNumber: number = 1
): MoveExecutionResult {
  const activeColor = players[activePlayerIndex].color;
  const capturedSet = new Set(move.capturesTokenIds);
  const movingTokenIds = new Set<string>(
    move.isPairMove && move.pairedTokenIds
      ? move.pairedTokenIds
      : [move.tokenId]
  );

  // 1. Update token positions for active player and reset captured opponent tokens to yard (-1)
  const rawUpdatedPlayers: PlayerState[] = players.map((player) => {
    if (player.color === activeColor) {
      const updatedTokens = player.tokens.map((t) =>
        movingTokenIds.has(t.id)
          ? {
              ...t,
              steps: move.toSteps,
              yardSlot: move.toSteps === -1 ? t.index : undefined,
            }
          : t
      );
      const allHome = updatedTokens.every((t) => t.steps === FINISH_STEP);
      return {
        ...player,
        tokens: updatedTokens,
        hasFinished: allHome,
        finishRank:
          allHome && !player.hasFinished
            ? currentRankings.length + 1
            : player.finishRank,
        capturesMade: player.capturesMade + move.capturesTokenIds.length,
        movesCount: player.movesCount + 1,
      };
    }

    const hasCapturedToken = player.tokens.some((t) => capturedSet.has(t.id));
    if (!hasCapturedToken) {
      return player;
    }

    return {
      ...player,
      tokens: player.tokens.map((t) =>
        capturedSet.has(t.id)
          ? { ...t, steps: -1, pairId: null, yardSlot: t.index }
          : t
      ),
    };
  });

  // 2. Filter out any pairs whose tokens were captured
  const survivingPairs = existingPairs
    .filter(
      (p) =>
        !capturedSet.has(p.tokenIds[0]) && !capturedSet.has(p.tokenIds[1])
    )
    .map((p) =>
      move.isPairMove && p.id === move.pairId
        ? { ...p, steps: move.toSteps }
        : p
    );

  // Any token that just moved is no longer prevented from forming a new pair at its destination
  const remainingBrokenIds = brokenPairTokenIdsThisRoll.filter(
    (id) => !movingTokenIds.has(id)
  );

  // 3. Reconcile pairs across all players (auto-forming pairs on same eligible square)
  const reconciled = reconcileTokenPairs(
    rawUpdatedPlayers,
    survivingPairs,
    remainingBrokenIds
  );

  // 4. Update BlockadePassingEntitlements:
  // - Remove entitlements for any token that just moved or was captured
  // - Remove entitlements for any pair that just moved or was captured or no longer exists at its trackIndex
  let nextEntitlements = existingEntitlements.filter((ent) => {
    if (movingTokenIds.has(ent.tokenId)) return false;
    if (capturedSet.has(ent.tokenId)) return false;
    if (move.isPairMove && move.pairId === ent.pairId) return false;

    const currentPair = reconciled.pairs.find((p) => p.id === ent.pairId);
    if (!currentPair) return false;
    const currentPairTrackIdx = getGlobalTrackIndex(
      currentPair.color,
      currentPair.steps
    );
    if (currentPairTrackIdx !== ent.trackIndex) return false;

    // Also ensure the entitled token is still an unpaired single token
    const owner = reconciled.players.find((pl) => pl.color === ent.color);
    const tok = owner?.tokens.find((t) => t.id === ent.tokenId);
    if (!tok || tok.pairId || tok.steps < 0 || tok.steps > MAX_TRACK_STEPS) {
      return false;
    }

    return true;
  });

  // - If a single token just landed on a track square occupied by one or more opposing pairs,
  //   record a temporary BlockadePassingEntitlement for that specific single token & opposing pair(s).
  if (
    !move.isPairMove &&
    move.toSteps >= 0 &&
    move.toSteps <= MAX_TRACK_STEPS
  ) {
    const movedOwner = reconciled.players[activePlayerIndex];
    const movedTokenAfter = movedOwner.tokens.find(
      (t) => t.id === move.tokenId
    );
    // Only grant single-token passing entitlement if the moved token remains a single token
    if (movedTokenAfter && !movedTokenAfter.pairId) {
      const targetTrackIdx = getGlobalTrackIndex(activeColor, move.toSteps);
      if (targetTrackIdx !== null) {
        const oppPairsAtDest = getOpposingPairsAtTrackIndex(
          activeColor,
          targetTrackIdx,
          reconciled.pairs
        );
        for (const oppPair of oppPairsAtDest) {
          const alreadyExists = nextEntitlements.some(
            (e) =>
              e.tokenId === move.tokenId &&
              e.pairId === oppPair.id &&
              e.trackIndex === targetTrackIdx
          );
          if (!alreadyExists) {
            nextEntitlements = [
              ...nextEntitlements,
              {
                tokenId: move.tokenId,
                color: activeColor,
                pairId: oppPair.id,
                pairColor: oppPair.color,
                trackIndex: targetTrackIdx,
                grantedAtTurn: turnNumber,
              },
            ];
          }
        }
      }
    }
  }

  // 5. Check rankings & match completion
  const activePlayerAfter = reconciled.players[activePlayerIndex];
  const playerJustFinished =
    activePlayerAfter.hasFinished && !players[activePlayerIndex].hasFinished;

  const newRankings = [...currentRankings];
  if (playerJustFinished && !newRankings.includes(activeColor)) {
    newRankings.push(activeColor);
  }

  const unfinishedPlayers = reconciled.players.filter((p) => !p.hasFinished);
  const isGameOver = unfinishedPlayers.length <= 1;

  let finalPlayers = reconciled.players;
  if (isGameOver && unfinishedPlayers.length === 1) {
    const lastColor = unfinishedPlayers[0].color;
    if (!newRankings.includes(lastColor)) {
      newRankings.push(lastColor);
    }
    const finalRank = newRankings.indexOf(lastColor) + 1;
    finalPlayers = reconciled.players.map((p) =>
      p.color === lastColor ? { ...p, finishRank: finalRank } : p
    );
  }

  const winner = newRankings.length > 0 ? newRankings[0] : null;

  // 6. Determine whether the active player receives an extra roll
  let grantsExtraRoll = false;
  if (!activePlayerAfter.hasFinished && !isGameOver) {
    if (diceValue === 6) {
      grantsExtraRoll = true;
    } else if (move.capturesTokenIds.length > 0 && rules.bonusRollOnCapture) {
      grantsExtraRoll = true;
    } else if (move.reachesHome && rules.bonusRollOnHome) {
      grantsExtraRoll = true;
    }
  }

  return {
    updatedPlayers: finalPlayers,
    updatedPairs: reconciled.pairs,
    newlyFormedPairs: reconciled.newlyFormedPairs,
    updatedPassingEntitlements: nextEntitlements,
    grantsExtraRoll,
    playerJustFinished,
    newRankings,
    isGameOver,
    winner,
  };
}

/**
 * Finds the next active player index in clockwise order who has not finished all 4 tokens.
 */
export function getNextActivePlayerIndex(
  players: PlayerState[],
  currentIndex: number
): number {
  const count = players.length;
  for (let offset = 1; offset <= count; offset++) {
    const candidateIdx = (currentIndex + offset) % count;
    if (!players[candidateIdx].hasFinished) {
      return candidateIdx;
    }
  }
  return currentIndex;
}
