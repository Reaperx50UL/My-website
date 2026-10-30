import {
  ACHIEVEMENTS_LIST,
  DEFAULT_HOUSE_RULES,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
} from '../game/constants';
import {
  AppSettings,
  GameState,
  HouseRules,
  PlayerStats,
  UserProfile,
} from '../game/gameTypes';
import { calculateMatchEarnedXP } from '../game/progression';

const KEYS = {
  SETTINGS: 'voidnod_ludo_royale_settings_v1',
  PROFILE: 'voidnod_ludo_royale_profile_v1',
  STATS: 'voidnod_ludo_royale_stats_v1',
  RULES: 'voidnod_ludo_royale_rules_v1',
  SAVED_GAME: 'voidnod_ludo_royale_saved_game_v1',
};

const LEGACY_KEYS: Record<string, string> = {
  'voidnod_ludo_royale_settings_v1': 'ludo_royale_settings_v1',
  'voidnod_ludo_royale_profile_v1': 'ludo_royale_profile_v1',
  'voidnod_ludo_royale_stats_v1': 'ludo_royale_stats_v1',
  'voidnod_ludo_royale_rules_v1': 'ludo_royale_rules_v1',
  'voidnod_ludo_royale_saved_game_v1': 'ludo_royale_saved_game_v1',
};

function safeRead<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return fallback;
    }
    let raw = window.localStorage.getItem(key);
    if (!raw && LEGACY_KEYS[key]) {
      raw = window.localStorage.getItem(LEGACY_KEYS[key]);
    }
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSettings(): AppSettings {
  return safeRead<AppSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function saveSettings(settings: AppSettings): void {
  safeWrite(KEYS.SETTINGS, settings);
}

export function loadProfile(): UserProfile {
  const loaded = safeRead<UserProfile>(KEYS.PROFILE, DEFAULT_PROFILE);
  const currentStats = safeRead<PlayerStats>(KEYS.STATS, DEFAULT_STATS);
  const derivedWins =
    typeof loaded.wins === 'number' ? loaded.wins : currentStats.wins || 0;
  const derivedXp =
    typeof loaded.experiencePoints === 'number'
      ? loaded.experiencePoints
      : derivedWins * 150 + (currentStats.tokensCaptured || 0) * 20;

  return {
    ...DEFAULT_PROFILE,
    ...loaded,
    wins: derivedWins,
    experiencePoints: derivedXp,
  };
}

export function saveProfile(profile: UserProfile): void {
  safeWrite(KEYS.PROFILE, profile);
}

export function loadHouseRules(): HouseRules {
  return safeRead<HouseRules>(KEYS.RULES, DEFAULT_HOUSE_RULES);
}

export function saveHouseRules(rules: HouseRules): void {
  safeWrite(KEYS.RULES, rules);
}

export function loadStats(): PlayerStats {
  const stats = safeRead<PlayerStats>(KEYS.STATS, DEFAULT_STATS);
  return {
    ...DEFAULT_STATS,
    ...stats,
    modeCounts: { ...DEFAULT_STATS.modeCounts, ...(stats.modeCounts || {}) },
    unlockedAchievements: Array.isArray(stats.unlockedAchievements)
      ? stats.unlockedAchievements
      : [],
    matchHistory: Array.isArray(stats.matchHistory) ? stats.matchHistory : [],
  };
}

export function saveStats(stats: PlayerStats): void {
  safeWrite(KEYS.STATS, stats);
}

export interface RecordMatchResult {
  stats: PlayerStats;
  profile: UserProfile;
  earnedXP: number;
}

/**
 * Updates player statistics and profile progression (XP & wins) at the end of a completed match.
 */
export function recordCompletedMatch(
  state: GameState,
  humanPlayerColor: string
): RecordMatchResult {
  const current = loadStats();
  const humanPlayer =
    state.players.find((p) => p.color === humanPlayerColor) || state.players[0];

  const won = state.winner === humanPlayer.color;
  const tokensHomeThisMatch = humanPlayer.tokens.filter(
    (t) => t.steps === 56
  ).length;

  const newWinStreak = won ? current.currentWinStreak + 1 : 0;
  const newLongestStreak = Math.max(current.longestWinStreak, newWinStreak);

  const updatedStats: PlayerStats = {
    ...current,
    totalGames: current.totalGames + 1,
    wins: current.wins + (won ? 1 : 0),
    losses: current.losses + (won ? 0 : 1),
    tokensCaptured: current.tokensCaptured + humanPlayer.capturesMade,
    tokensHome: current.tokensHome + tokensHomeThisMatch,
    sixesRolled: current.sixesRolled + humanPlayer.sixesRolled,
    currentWinStreak: newWinStreak,
    longestWinStreak: newLongestStreak,
    modeCounts: {
      ...current.modeCounts,
      [state.mode]: (current.modeCounts[state.mode] || 0) + 1,
    },
    unlockedAchievements: [...current.unlockedAchievements],
    matchHistory: [
      {
        id: state.id,
        date: Date.now(),
        mode: state.mode,
        playerCount: state.players.length,
        won,
        turns: state.turnNumber,
        captures: humanPlayer.capturesMade,
      },
      ...current.matchHistory,
    ].slice(0, 20),
  };

  // Evaluate achievement thresholds
  for (const ach of ACHIEVEMENTS_LIST) {
    if (!updatedStats.unlockedAchievements.includes(ach.id)) {
      const value = updatedStats[ach.metric];
      if (typeof value === 'number' && value >= ach.target) {
        updatedStats.unlockedAchievements.push(ach.id);
      }
    }
  }

  saveStats(updatedStats);

  // Compute and persist UserProfile XP and wins
  const earnedXP = calculateMatchEarnedXP({
    won,
    captures: humanPlayer.capturesMade,
    tokensHome: tokensHomeThisMatch,
  });

  const existingProfile = loadProfile();
  const updatedProfile: UserProfile = {
    ...existingProfile,
    wins: existingProfile.wins + (won ? 1 : 0),
    experiencePoints: (existingProfile.experiencePoints || 0) + earnedXP,
  };
  saveProfile(updatedProfile);

  return {
    stats: updatedStats,
    profile: updatedProfile,
    earnedXP,
  };
}

export function loadSavedGame(): GameState | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    const raw = window.localStorage.getItem(KEYS.SAVED_GAME);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (
      !parsed ||
      !Array.isArray(parsed.players) ||
      parsed.turnPhase === 'GAME_OVER'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveGame(state: GameState | null): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    if (
      !state ||
      state.turnPhase === 'GAME_OVER' ||
      state.mode === 'friends' ||
      state.mode === 'matchmaking'
    ) {
      window.localStorage.removeItem(KEYS.SAVED_GAME);
      window.localStorage.removeItem(LEGACY_KEYS[KEYS.SAVED_GAME]);
      return;
    }
    window.localStorage.setItem(KEYS.SAVED_GAME, JSON.stringify(state));
  } catch {
    // Ignore
  }
}

export function clearSavedGame(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(KEYS.SAVED_GAME);
      window.localStorage.removeItem(LEGACY_KEYS[KEYS.SAVED_GAME]);
    }
  } catch {
    // Ignore
  }
}
