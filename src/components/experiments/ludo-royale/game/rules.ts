import { AVATAR_OPTIONS, COLOR_META, DEFAULT_HOUSE_RULES } from './constants';
import {
  AIDifficulty,
  HouseRules,
  PlayerColor,
  PlayerConfig,
  PlayerType,
  UserProfile,
} from './gameTypes';

const BOT_DEFAULT_NAMES: Record<PlayerColor, string> = {
  red: 'Crimson Bot',
  green: 'Emerald Bot',
  yellow: 'Solar Bot',
  blue: 'Sapphire Bot',
};

/**
 * Returns the default display name for a seat based on whether it is Human or AI Bot.
 */
export function getDefaultSeatName(
  color: PlayerColor,
  seatIndex: number,
  seatType: PlayerType,
  hostNickname?: string
): string {
  if (seatType === 'ai') {
    return BOT_DEFAULT_NAMES[color] || `${COLOR_META[color].label.split(' ')[0]} Bot`;
  }
  if (seatIndex === 0) {
    return hostNickname?.trim() || 'Player 1';
  }
  return `Player ${seatIndex + 1}`;
}

/**
 * Builds the validated player roster for Local Multiplayer and AI matches,
 * supporting any combination of Human pass-and-play seats and AI Bots.
 */
export function buildSetupPlayerRoster(params: {
  playerCount: 2 | 3 | 4;
  seatTypes: Record<PlayerColor, PlayerType>;
  botDifficulties: Record<PlayerColor, AIDifficulty>;
  customNames: Record<PlayerColor, string>;
  profile: UserProfile;
}): PlayerConfig[] {
  const { playerCount, seatTypes, botDifficulties, customNames, profile } = params;
  const activeColors = getColorsForPlayerCount(playerCount);

  return activeColors.map((color, idx) => {
    // Seat 0 (Red) is always the host human player to guarantee at least 1 human in local/AI matches
    const type: PlayerType = idx === 0 ? 'human' : seatTypes[color] || 'human';
    const defaultName = getDefaultSeatName(color, idx, type, profile.nickname);
    const rawCustom = customNames[color]?.trim();

    return {
      color,
      name: rawCustom || defaultName,
      avatar:
        idx === 0
          ? profile.avatar
          : AVATAR_OPTIONS[(idx + 1) % AVATAR_OPTIONS.length].id,
      type,
      aiDifficulty: type === 'ai' ? botDifficulties[color] || 'medium' : undefined,
    };
  });
}

/**
 * Returns the standard 2-player, 3-player, or 4-player color seating arrangement.
 * For 2 players, seats them across the board diagonally (Red vs Yellow) for balanced track distance.
 */
export function getColorsForPlayerCount(count: 2 | 3 | 4): PlayerColor[] {
  if (count === 2) {
    return ['red', 'yellow'];
  }
  if (count === 3) {
    return ['red', 'green', 'yellow'];
  }
  return ['red', 'green', 'yellow', 'blue'];
}

/**
 * Validates and merges partial rules with default standard Ludo rules.
 */
export function normalizeRules(partial?: Partial<HouseRules>): HouseRules {
  return {
    ...DEFAULT_HOUSE_RULES,
    ...partial,
  };
}

/**
 * Checks whether rolling a consecutive six forfeits the turn according to the selected ruleset.
 */
export function shouldForfeitOnConsecutiveSixes(
  consecutiveSixes: number,
  rules: HouseRules
): boolean {
  if (rules.maxConsecutiveSixes === 0) {
    return false; // Unlimited consecutive sixes
  }
  return consecutiveSixes >= rules.maxConsecutiveSixes;
}

/**
 * Generates human-readable bullet points explaining the active ruleset.
 */
export function describeActiveRules(rules: HouseRules): string[] {
  const descriptions: string[] = [
    'Roll a 6 to deploy a token from your starting yard onto your colored entry square.',
    'Rolling a 6 grants an extra roll.',
    'An exact dice roll is required to enter the central finishing triangle.',
    'In 3- and 4-player matches, play continues after 1st place finishes until 2nd, 3rd, and 4th places are decided.',
  ];

  if (rules.maxConsecutiveSixes === 3) {
    descriptions.push('Rolling three consecutive 6s forfeits the third move and passes the turn.');
  } else {
    descriptions.push('Unlimited consecutive 6s are allowed without forfeiting your turn.');
  }

  if (rules.safeStarSquares) {
    descriptions.push('Colored start squares and the 4 Star squares protect tokens from capture.');
  } else {
    descriptions.push('Only the 4 colored starting squares are safe from capture.');
  }

  if (rules.bonusRollOnCapture) {
    descriptions.push('Capturing an opponent token on a non-safe square awards a bonus roll.');
  }

  if (rules.bonusRollOnHome) {
    descriptions.push('Reaching the central finishing triangle awards a bonus roll.');
  }

  if (rules.fastStart) {
    descriptions.push('Fast Start active: Each player begins with 1 token deployed on their start square.');
  }

  return descriptions;
}
