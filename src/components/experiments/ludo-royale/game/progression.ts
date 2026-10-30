import { AVATAR_OPTIONS } from './constants';
import {
  AvatarOption,
  PlayerStats,
  UserProfile,
} from './gameTypes';

export const XP_CONFIG = {
  MATCH_COMPLETED: 50,
  MATCH_WON: 100, // Total 150 for winning
  CAPTURE_PER_TOKEN: 20,
  TOKEN_HOME: 25,
  XP_PER_LEVEL: 250,
};

/**
 * Calculates experience points earned from a match based on results and performance.
 */
export function calculateMatchEarnedXP(params: {
  won: boolean;
  captures: number;
  tokensHome: number;
}): number {
  let xp = XP_CONFIG.MATCH_COMPLETED;
  if (params.won) {
    xp += XP_CONFIG.MATCH_WON;
  }
  xp += Math.max(0, params.captures) * XP_CONFIG.CAPTURE_PER_TOKEN;
  xp += Math.max(0, params.tokensHome) * XP_CONFIG.TOKEN_HOME;
  return xp;
}

/**
 * Calculates current level and progress to next level from total XP.
 */
export function calculatePlayerLevel(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  const level = Math.floor(safeXp / XP_CONFIG.XP_PER_LEVEL) + 1;
  const currentLevelXp = safeXp % XP_CONFIG.XP_PER_LEVEL;
  const nextLevelXp = XP_CONFIG.XP_PER_LEVEL;
  const progressPercent = Math.min(
    100,
    Math.round((currentLevelXp / nextLevelXp) * 100)
  );

  return {
    level,
    currentLevelXp,
    nextLevelXp,
    progressPercent,
  };
}

/**
 * Retrieves the current stat value for an avatar's unlock requirement.
 */
export function getMetricValue(
  metric: 'wins' | 'experiencePoints' | 'tokensCaptured' | 'streak',
  profile: UserProfile,
  stats?: PlayerStats
): number {
  switch (metric) {
    case 'wins':
      // Prefer max of profile.wins or stats.wins
      return Math.max(profile.wins || 0, stats?.wins || 0);
    case 'experiencePoints':
      return profile.experiencePoints || 0;
    case 'tokensCaptured':
      return stats?.tokensCaptured || 0;
    case 'streak':
      return Math.max(
        stats?.currentWinStreak || 0,
        stats?.longestWinStreak || 0
      );
    default:
      return 0;
  }
}

/**
 * Evaluates whether a specific avatar option is unlocked for the user.
 */
export function isAvatarUnlocked(
  avatar: AvatarOption,
  profile: UserProfile,
  stats?: PlayerStats
): boolean {
  if (!avatar.unlockRequirement) {
    return true;
  }
  const current = getMetricValue(avatar.unlockRequirement.metric, profile, stats);
  return current >= avatar.unlockRequirement.threshold;
}

/**
 * Gets the unlock progress details for an avatar option.
 */
export function getAvatarUnlockProgress(
  avatar: AvatarOption,
  profile: UserProfile,
  stats?: PlayerStats
): {
  unlocked: boolean;
  current: number;
  target: number;
  progressPercent: number;
  requirementText: string;
} {
  if (!avatar.unlockRequirement) {
    return {
      unlocked: true,
      current: 1,
      target: 1,
      progressPercent: 100,
      requirementText: 'Available by default',
    };
  }

  const { metric, threshold, description } = avatar.unlockRequirement;
  const current = getMetricValue(metric, profile, stats);
  const unlocked = current >= threshold;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((current / threshold) * 100))
  );

  return {
    unlocked,
    current: Math.min(current, threshold),
    target: threshold,
    progressPercent,
    requirementText: description,
  };
}
