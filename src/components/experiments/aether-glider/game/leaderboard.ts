import { BIRD_PROFILES, BirdId, ENVIRONMENT_PROFILES, EnvironmentId } from './config';
import { getMedalForScore } from './engine';
import { safeGetStorageItem, safeSetStorageItem } from './storage';
import { MedalTier } from './types';

export type LeaderboardTabId = 'global' | EnvironmentId;

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  birdId: BirdId;
  environmentId: EnvironmentId;
  maxCombo: number;
  peakComboMultiplier: number;
  medal: MedalTier;
  createdAt: number;
  isPlayerEntry?: boolean;
}

export interface HighScoreQualification {
  qualifies: boolean;
  isNewGlobalPersonalBest: boolean;
  isNewEnvironmentPersonalBest: boolean;
  projectedGlobalRank: number | null;
  projectedEnvironmentRank: number | null;
}

export interface SubmitHighScoreInput {
  playerName: string;
  score: number;
  birdId: BirdId;
  environmentId: EnvironmentId;
  maxCombo?: number;
  peakComboMultiplier?: number;
  medal?: MedalTier;
  createdAt?: number;
}

export interface SubmitHighScoreResult {
  ok: boolean;
  error?: string;
  entry?: LeaderboardEntry;
  entries: LeaderboardEntry[];
  globalRank: number | null;
  environmentRank: number | null;
}

export const MAX_LEADERBOARD_ENTRIES_PER_VIEW = 10;
export const MAX_STORED_LEADERBOARD_ENTRIES = 100;

/**
 * Deterministic seeded sky-trial records across all 5 environments so both
 * the Global Leaderboard and each Environment's Leaderboard have an authentic
 * roster out-of-the-box while keeping top ranks attainable for new players.
 */
export const DEFAULT_SEED_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  // Clockwork Citadel
  {
    id: 'seed-cw-1',
    playerName: 'Captain Vance',
    score: 24,
    birdId: 'kora',
    environmentId: 'clockwork',
    maxCombo: 7,
    peakComboMultiplier: 4,
    medal: getMedalForScore(24),
    createdAt: 1730000100000,
  },
  {
    id: 'seed-cw-2',
    playerName: 'Aria Gearwright',
    score: 14,
    birdId: 'chronos',
    environmentId: 'clockwork',
    maxCombo: 5,
    peakComboMultiplier: 3,
    medal: getMedalForScore(14),
    createdAt: 1730000090000,
  },
  {
    id: 'seed-cw-3',
    playerName: 'Bram Copperwing',
    score: 6,
    birdId: 'zephyr',
    environmentId: 'clockwork',
    maxCombo: 3,
    peakComboMultiplier: 2,
    medal: getMedalForScore(6),
    createdAt: 1730000080000,
  },

  // Bamboo Forest
  {
    id: 'seed-bm-1',
    playerName: 'Master Shen',
    score: 22,
    birdId: 'zephyr',
    environmentId: 'bamboo',
    maxCombo: 6,
    peakComboMultiplier: 4,
    medal: getMedalForScore(22),
    createdAt: 1730000075000,
  },
  {
    id: 'seed-bm-2',
    playerName: 'Lin Windrunner',
    score: 12,
    birdId: 'chronos',
    environmentId: 'bamboo',
    maxCombo: 4,
    peakComboMultiplier: 3,
    medal: getMedalForScore(12),
    createdAt: 1730000070000,
  },
  {
    id: 'seed-bm-3',
    playerName: 'Sora Jade',
    score: 5,
    birdId: 'kora',
    environmentId: 'bamboo',
    maxCombo: 2,
    peakComboMultiplier: 2,
    medal: getMedalForScore(5),
    createdAt: 1730000065000,
  },

  // Volcano Field
  {
    id: 'seed-vc-1',
    playerName: 'Pyra Ashborn',
    score: 26,
    birdId: 'ignis',
    environmentId: 'volcano',
    maxCombo: 8,
    peakComboMultiplier: 4,
    medal: getMedalForScore(26),
    createdAt: 1730000060000,
  },
  {
    id: 'seed-vc-2',
    playerName: 'Forge Warden',
    score: 15,
    birdId: 'kora',
    environmentId: 'volcano',
    maxCombo: 4,
    peakComboMultiplier: 3,
    medal: getMedalForScore(15),
    createdAt: 1730000055000,
  },
  {
    id: 'seed-vc-3',
    playerName: 'Cinder Scout',
    score: 7,
    birdId: 'ignis',
    environmentId: 'volcano',
    maxCombo: 3,
    peakComboMultiplier: 2,
    medal: getMedalForScore(7),
    createdAt: 1730000050000,
  },

  // Cold Ice Field
  {
    id: 'seed-ic-1',
    playerName: 'Freya Borealis',
    score: 20,
    birdId: 'zephyr',
    environmentId: 'ice',
    maxCombo: 6,
    peakComboMultiplier: 4,
    medal: getMedalForScore(20),
    createdAt: 1730000045000,
  },
  {
    id: 'seed-ic-2',
    playerName: 'Glacier Hawk',
    score: 11,
    birdId: 'kora',
    environmentId: 'ice',
    maxCombo: 4,
    peakComboMultiplier: 3,
    medal: getMedalForScore(11),
    createdAt: 1730000040000,
  },
  {
    id: 'seed-ic-3',
    playerName: 'Rime Drifter',
    score: 4,
    birdId: 'chronos',
    environmentId: 'ice',
    maxCombo: 2,
    peakComboMultiplier: 2,
    medal: getMedalForScore(4),
    createdAt: 1730000035000,
  },

  // Cybernetic City
  {
    id: 'seed-cy-1',
    playerName: 'Nova Pulse',
    score: 29,
    birdId: 'chronos',
    environmentId: 'cyber',
    maxCombo: 9,
    peakComboMultiplier: 5,
    medal: getMedalForScore(29),
    createdAt: 1730000030000,
  },
  {
    id: 'seed-cy-2',
    playerName: 'Zero Vector',
    score: 16,
    birdId: 'ignis',
    environmentId: 'cyber',
    maxCombo: 5,
    peakComboMultiplier: 3,
    medal: getMedalForScore(16),
    createdAt: 1730000025000,
  },
  {
    id: 'seed-cy-3',
    playerName: 'Neon Valkyrie',
    score: 8,
    birdId: 'zephyr',
    environmentId: 'cyber',
    maxCombo: 3,
    peakComboMultiplier: 2,
    medal: getMedalForScore(8),
    createdAt: 1730000020000,
  },
];

export function validatePilotName(rawName: string): {
  valid: boolean;
  sanitized: string;
  error?: string;
} {
  const collapsed = rawName.replace(/\s+/g, ' ').trim();
  if (!collapsed) {
    return {
      valid: false,
      sanitized: '',
      error: 'Please enter a pilot callsign before recording your score.',
    };
  }
  if (collapsed.length < 2) {
    return {
      valid: false,
      sanitized: collapsed,
      error: 'Pilot callsign must be at least 2 characters.',
    };
  }
  if (collapsed.length > 18) {
    return {
      valid: false,
      sanitized: collapsed.slice(0, 18).trim(),
      error: 'Pilot callsign cannot exceed 18 characters.',
    };
  }
  return {
    valid: true,
    sanitized: collapsed,
  };
}

export function sortLeaderboardEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.maxCombo !== a.maxCombo) return b.maxCombo - a.maxCombo;
    return b.createdAt - a.createdAt;
  });
}

export function getGlobalLeaderboard(
  entries: LeaderboardEntry[],
  limit = MAX_LEADERBOARD_ENTRIES_PER_VIEW
): LeaderboardEntry[] {
  return sortLeaderboardEntries(entries).slice(0, limit);
}

export function getEnvironmentLeaderboard(
  entries: LeaderboardEntry[],
  environmentId: EnvironmentId,
  limit = MAX_LEADERBOARD_ENTRIES_PER_VIEW
): LeaderboardEntry[] {
  return sortLeaderboardEntries(
    entries.filter((entry) => entry.environmentId === environmentId)
  ).slice(0, limit);
}

export function loadLeaderboardEntries(
  storageKey = 'aether_glider_leaderboards'
): LeaderboardEntry[] {
  const raw = safeGetStorageItem(storageKey);
  if (!raw) {
    return sortLeaderboardEntries(DEFAULT_SEED_LEADERBOARD_ENTRIES);
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return sortLeaderboardEntries(DEFAULT_SEED_LEADERBOARD_ENTRIES);
    }
    const validEntries: LeaderboardEntry[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item.id === 'string' &&
        typeof item.playerName === 'string' &&
        typeof item.score === 'number' &&
        Number.isFinite(item.score) &&
        BIRD_PROFILES.some((b) => b.id === item.birdId) &&
        ENVIRONMENT_PROFILES.some((e) => e.id === item.environmentId)
      ) {
        validEntries.push({
          id: item.id,
          playerName: item.playerName,
          score: Math.max(0, Math.floor(item.score)),
          birdId: item.birdId as BirdId,
          environmentId: item.environmentId as EnvironmentId,
          maxCombo:
            typeof item.maxCombo === 'number' && Number.isFinite(item.maxCombo)
              ? Math.max(0, Math.floor(item.maxCombo))
              : 0,
          peakComboMultiplier:
            typeof item.peakComboMultiplier === 'number' &&
            Number.isFinite(item.peakComboMultiplier)
              ? Math.max(1, Math.floor(item.peakComboMultiplier))
              : 1,
          medal: item.medal ?? getMedalForScore(item.score),
          createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
          isPlayerEntry: Boolean(item.isPlayerEntry),
        });
      }
    }
    if (validEntries.length === 0) {
      return sortLeaderboardEntries(DEFAULT_SEED_LEADERBOARD_ENTRIES);
    }
    return sortLeaderboardEntries(validEntries);
  } catch {
    return sortLeaderboardEntries(DEFAULT_SEED_LEADERBOARD_ENTRIES);
  }
}

export function saveLeaderboardEntries(
  entries: LeaderboardEntry[],
  storageKey = 'aether_glider_leaderboards'
): LeaderboardEntry[] {
  const sorted = sortLeaderboardEntries(entries).slice(0, MAX_STORED_LEADERBOARD_ENTRIES);
  safeSetStorageItem(storageKey, JSON.stringify(sorted));
  return sorted;
}

export function loadEnvironmentBestScores(
  storageKey = 'aether_glider_env_best_scores'
): Record<EnvironmentId, number> {
  const defaults: Record<EnvironmentId, number> = {
    clockwork: 0,
    bamboo: 0,
    volcano: 0,
    ice: 0,
    cyber: 0,
  };
  const raw = safeGetStorageItem(storageKey);
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaults;
    for (const env of ENVIRONMENT_PROFILES) {
      const val = parsed[env.id];
      if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
        defaults[env.id] = Math.floor(val);
      }
    }
    return defaults;
  } catch {
    return defaults;
  }
}

export function saveEnvironmentBestScore(
  environmentId: EnvironmentId,
  score: number,
  storageKey = 'aether_glider_env_best_scores'
): Record<EnvironmentId, number> {
  const current = loadEnvironmentBestScores(storageKey);
  const cleanScore = Math.max(0, Math.floor(score));
  if (cleanScore > (current[environmentId] ?? 0)) {
    current[environmentId] = cleanScore;
    safeSetStorageItem(storageKey, JSON.stringify(current));
  }
  return current;
}

export function loadLastPilotName(storageKey = 'aether_glider_pilot_name'): string {
  const raw = safeGetStorageItem(storageKey);
  if (!raw) return '';
  return raw.trim().slice(0, 18);
}

export function saveLastPilotName(
  playerName: string,
  storageKey = 'aether_glider_pilot_name'
): void {
  const validation = validatePilotName(playerName);
  if (validation.valid) {
    safeSetStorageItem(storageKey, validation.sanitized);
  }
}

export function evaluateHighScoreQualification(
  entries: LeaderboardEntry[],
  score: number,
  environmentId: EnvironmentId,
  previousGlobalBest: number,
  previousEnvBest: number,
  limit = MAX_LEADERBOARD_ENTRIES_PER_VIEW
): HighScoreQualification {
  const cleanScore = Math.max(0, Math.floor(score));
  const isNewGlobalPersonalBest = cleanScore > 0 && cleanScore >= previousGlobalBest;
  const isNewEnvironmentPersonalBest = cleanScore > 0 && cleanScore >= previousEnvBest;

  // Compute projected rank in Global and Environment leaderboards
  const probeEntry: LeaderboardEntry = {
    id: '__probe__',
    playerName: 'Probe',
    score: cleanScore,
    birdId: 'kora',
    environmentId,
    maxCombo: 999,
    peakComboMultiplier: 5,
    medal: getMedalForScore(cleanScore),
    createdAt: Number.MAX_SAFE_INTEGER,
  };

  const globalSorted = sortLeaderboardEntries([...entries, probeEntry]);
  const globalIdx = globalSorted.findIndex((e) => e.id === '__probe__');
  const projectedGlobalRank =
    cleanScore > 0 && globalIdx !== -1 && globalIdx < limit ? globalIdx + 1 : null;

  const envSorted = sortLeaderboardEntries([
    ...entries.filter((e) => e.environmentId === environmentId),
    probeEntry,
  ]);
  const envIdx = envSorted.findIndex((e) => e.id === '__probe__');
  const projectedEnvironmentRank =
    cleanScore > 0 && envIdx !== -1 && envIdx < limit ? envIdx + 1 : null;

  const qualifies =
    cleanScore > 0 &&
    (isNewGlobalPersonalBest ||
      isNewEnvironmentPersonalBest ||
      projectedGlobalRank !== null ||
      projectedEnvironmentRank !== null);

  return {
    qualifies,
    isNewGlobalPersonalBest,
    isNewEnvironmentPersonalBest,
    projectedGlobalRank,
    projectedEnvironmentRank,
  };
}

export function submitLeaderboardScore(
  input: SubmitHighScoreInput,
  leaderboardStorageKey = 'aether_glider_leaderboards',
  pilotNameStorageKey = 'aether_glider_pilot_name',
  envBestStorageKey = 'aether_glider_env_best_scores'
): SubmitHighScoreResult {
  const existing = loadLeaderboardEntries(leaderboardStorageKey);
  const validation = validatePilotName(input.playerName);
  if (!validation.valid) {
    return {
      ok: false,
      error: validation.error,
      entries: existing,
      globalRank: null,
      environmentRank: null,
    };
  }

  const cleanScore = Math.max(0, Math.floor(input.score));
  const now = input.createdAt ?? Date.now();
  const newEntry: LeaderboardEntry = {
    id: `pilot-${now}-${Math.random().toString(36).slice(2, 7)}`,
    playerName: validation.sanitized,
    score: cleanScore,
    birdId: input.birdId,
    environmentId: input.environmentId,
    maxCombo: Math.max(0, Math.floor(input.maxCombo ?? 0)),
    peakComboMultiplier: Math.max(1, Math.floor(input.peakComboMultiplier ?? 1)),
    medal: input.medal ?? getMedalForScore(cleanScore),
    createdAt: now,
    isPlayerEntry: true,
  };

  const nextEntries = saveLeaderboardEntries([...existing, newEntry], leaderboardStorageKey);
  saveLastPilotName(validation.sanitized, pilotNameStorageKey);
  saveEnvironmentBestScore(input.environmentId, cleanScore, envBestStorageKey);

  const globalSorted = sortLeaderboardEntries(nextEntries);
  const globalIdx = globalSorted.findIndex((e) => e.id === newEntry.id);
  const globalRank = globalIdx !== -1 ? globalIdx + 1 : null;

  const envSorted = sortLeaderboardEntries(
    nextEntries.filter((e) => e.environmentId === input.environmentId)
  );
  const envIdx = envSorted.findIndex((e) => e.id === newEntry.id);
  const environmentRank = envIdx !== -1 ? envIdx + 1 : null;

  return {
    ok: true,
    entry: newEntry,
    entries: nextEntries,
    globalRank,
    environmentRank,
  };
}
