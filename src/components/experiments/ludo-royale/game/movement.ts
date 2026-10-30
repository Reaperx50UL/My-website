import { FINISH_STEP } from './constants';
import { HouseRules, LegalMove, PlayerColor, PlayerState } from './gameTypes';

export interface MoveExecutionResult {
  updatedPlayers: PlayerState[];
  grantsExtraRoll: boolean;
  playerJustFinished: boolean;
  newRankings: PlayerColor[];
  isGameOver: boolean;
  winner: PlayerColor | null;
}

/**
 * Applies a validated LegalMove to the players array, sending captured tokens back to their yard (-1),
 * checking if the player finished all 4 tokens, and calculating whether the player earns an extra roll.
 */
export function applyMoveToPlayers(
  players: PlayerState[],
  activePlayerIndex: number,
  move: LegalMove,
  diceValue: number,
  currentRankings: PlayerColor[],
  rules: HouseRules
): MoveExecutionResult {
  const activeColor = players[activePlayerIndex].color;
  const capturedSet = new Set(move.capturesTokenIds);

  const updatedPlayers: PlayerState[] = players.map((player) => {
    if (player.color === activeColor) {
      const updatedTokens = player.tokens.map((t) =>
        t.id === move.tokenId ? { ...t, steps: move.toSteps } : t
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

    // Check if any of this opponent's tokens were captured
    const hasCapturedToken = player.tokens.some((t) => capturedSet.has(t.id));
    if (!hasCapturedToken) {
      return player;
    }

    return {
      ...player,
      tokens: player.tokens.map((t) =>
        capturedSet.has(t.id) ? { ...t, steps: -1 } : t
      ),
    };
  });

  const activePlayerAfter = updatedPlayers[activePlayerIndex];
  const playerJustFinished =
    activePlayerAfter.hasFinished && !players[activePlayerIndex].hasFinished;

  const newRankings = [...currentRankings];
  if (playerJustFinished && !newRankings.includes(activeColor)) {
    newRankings.push(activeColor);
  }

  // Check if game is over:
  // The match continues until only 1 unfinished player remains, deciding 1st, 2nd, 3rd, and 4th place!
  // (In a 2-player match, when 1st finishes, 1 unfinished player remains -> 2nd place is decided immediately.
  //  In a 3-player match, play continues after 1st finishes until 2nd finishes -> 3rd place is decided.
  //  In a 4-player match, play continues after 1st & 2nd finish until 3rd finishes -> 4th place is decided.)
  const unfinishedPlayers = updatedPlayers.filter((p) => !p.hasFinished);
  const isGameOver = unfinishedPlayers.length <= 1;

  let finalPlayers = updatedPlayers;
  if (isGameOver && unfinishedPlayers.length === 1) {
    const lastColor = unfinishedPlayers[0].color;
    if (!newRankings.includes(lastColor)) {
      newRankings.push(lastColor);
    }
    const finalRank = newRankings.indexOf(lastColor) + 1;
    finalPlayers = updatedPlayers.map((p) =>
      p.color === lastColor ? { ...p, finishRank: finalRank } : p
    );
  }

  const winner = newRankings.length > 0 ? newRankings[0] : null;

  // Determine whether the active player receives an extra turn
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
