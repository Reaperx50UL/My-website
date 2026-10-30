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
  code?: string;
  entry?: LeaderboardEntry;
  entries: LeaderboardEntry[];
  globalRank: number | null;
  environmentRank: number | null;
  updated?: boolean;
  keptExistingBest?: boolean;
  storageMode?: string;
}

export interface SharedLeaderboardResponse {
  ok: boolean;
  entries: LeaderboardEntry[];
  storageMode?: string;
  error?: string;
  code?: string;
}

export const MAX_LEADERBOARD_ENTRIES_PER_VIEW = 10;
export const MAX_STORED_LEADERBOARD_ENTRIES = 100;
export const MAX_VALID_SCORE = 9999;

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
  if (typeof rawName !== 'string') {
    return {
      valid: false,
      sanitized: '',
      error: 'Please enter a pilot callsign before recording your score.',
    };
  }
  const collapsed = rawName.replace(/\s+/g, ' ').trim();
  if (!collapsed) {
    return {
      valid: false,
      sanitized: '',
      error: 'Please enter a pilot callsign before recording your score.',
    };
  }
  if (/[<>\\/{}[\]\x00-\x1F\x7F]/.test(collapsed)) {
    return {
      valid: false,
      sanitized: collapsed.replace(/[<>\\/{}[\]\x00-\x1F\x7F]/g, '').trim(),
      error: 'Pilot callsign contains invalid characters.',
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
  if (!/[A-Za-z0-9]/.test(collapsed)) {
    return {
      valid: false,
      sanitized: collapsed,
      error: 'Pilot callsign must include at least one letter or number.',
    };
  }
  return {
    valid: true,
    sanitized: collapsed,
  };
}

export function validateScoreSubmission(input: Partial<SubmitHighScoreInput>): {
  valid: boolean;
  error?: string;
  sanitizedName: string;
  cleanScore: number;
  birdId: BirdId;
  environmentId: EnvironmentId;
  maxCombo: number;
  peakComboMultiplier: number;
} {
  const nameCheck = validatePilotName(input.playerName ?? '');
  if (!nameCheck.valid) {
    return {
      valid: false,
      error: nameCheck.error,
      sanitizedName: nameCheck.sanitized,
      cleanScore: 0,
      birdId: 'kora',
      environmentId: 'clockwork',
      maxCombo: 0,
      peakComboMultiplier: 1,
    };
  }

  if (
    typeof input.score !== 'number' ||
    !Number.isFinite(input.score) ||
    Math.floor(input.score) < 1 ||
    Math.floor(input.score) > MAX_VALID_SCORE
  ) {
    return {
      valid: false,
      error: 'Score must be at least 1 valid point to record on the leaderboard.',
      sanitizedName: nameCheck.sanitized,
      cleanScore: 0,
      birdId: 'kora',
      environmentId: 'clockwork',
      maxCombo: 0,
      peakComboMultiplier: 1,
    };
  }

  const cleanScore = Math.floor(input.score);
  const validBird = BIRD_PROFILES.find((b) => b.id === input.birdId);
  const validEnv = ENVIRONMENT_PROFILES.find((e) => e.id === input.environmentId);

  if (!validBird || !validEnv) {
    return {
      valid: false,
      error: 'Invalid aviator or sky realm in score submission.',
      sanitizedName: nameCheck.sanitized,
      cleanScore,
      birdId: 'kora',
      environmentId: 'clockwork',
      maxCombo: 0,
      peakComboMultiplier: 1,
    };
  }

  const rawCombo =
    typeof input.maxCombo === 'number' && Number.isFinite(input.maxCombo)
      ? Math.max(0, Math.min(MAX_VALID_SCORE, Math.floor(input.maxCombo)))
      : 0;
  const rawPeakMult =
    typeof input.peakComboMultiplier === 'number' && Number.isFinite(input.peakComboMultiplier)
      ? Math.max(1, Math.min(5, Math.floor(input.peakComboMultiplier)))
      : 1;

  return {
    valid: true,
    sanitizedName: nameCheck.sanitized,
    cleanScore,
    birdId: validBird.id,
    environmentId: validEnv.id,
    maxCombo: rawCombo,
    peakComboMultiplier: rawPeakMult,
  };
}

/**
 * Deterministic ranking sort used identically on server and all clients:
 * 1. Higher score first (descending)
 * 2. Higher maxCombo streak first (descending)
 * 3. Earlier achievement timestamp first (ascending — first pilot to set the score holds higher rank)
 * 4. Lexical pilot name + ID tie-breaker for 100% deterministic ordering across all devices
 */
export function sortLeaderboardEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.maxCombo !== a.maxCombo) return b.maxCombo - a.maxCombo;
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    const nameCmp = a.playerName.localeCompare(b.playerName, undefined, { sensitivity: 'base' });
    if (nameCmp !== 0) return nameCmp;
    return a.id.localeCompare(b.id);
  });
}

export function sanitizeLeaderboardEntriesArray(rawArray: unknown): LeaderboardEntry[] {
  if (!Array.isArray(rawArray)) return [];
  const validEntries: LeaderboardEntry[] = [];
  for (const item of rawArray) {
    if (
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.playerName === 'string' &&
      typeof item.score === 'number' &&
      Number.isFinite(item.score) &&
      item.score >= 1 &&
      BIRD_PROFILES.some((b) => b.id === item.birdId) &&
      ENVIRONMENT_PROFILES.some((e) => e.id === item.environmentId)
    ) {
      const nameCheck = validatePilotName(item.playerName);
      if (!nameCheck.valid) continue;
      const cleanScore = Math.max(1, Math.min(MAX_VALID_SCORE, Math.floor(item.score)));
      validEntries.push({
        id: item.id,
        playerName: nameCheck.sanitized,
        score: cleanScore,
        birdId: item.birdId as BirdId,
        environmentId: item.environmentId as EnvironmentId,
        maxCombo:
          typeof item.maxCombo === 'number' && Number.isFinite(item.maxCombo)
            ? Math.max(0, Math.min(MAX_VALID_SCORE, Math.floor(item.maxCombo)))
            : 0,
        peakComboMultiplier:
          typeof item.peakComboMultiplier === 'number' &&
          Number.isFinite(item.peakComboMultiplier)
            ? Math.max(1, Math.min(5, Math.floor(item.peakComboMultiplier)))
            : 1,
        medal: item.medal ?? getMedalForScore(cleanScore),
        createdAt: typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)
          ? item.createdAt
          : Date.now(),
        isPlayerEntry: Boolean(item.isPlayerEntry),
      });
    }
  }
  return sortLeaderboardEntries(validEntries);
}

/**
 * Pure reducer that applies a new score submission to an existing list of entries.
 * - Prevents duplicate entries for the same (playerName, environmentId) pair.
 * - Preserves "best score" behavior: only replaces an existing pilot's record in that
 *   environment if the new score is strictly higher (or equal score with a higher combo).
 */
export function applyScoreSubmissionToEntries(
  existingEntries: LeaderboardEntry[],
  input: SubmitHighScoreInput
): SubmitHighScoreResult {
  const cleanExisting = sanitizeLeaderboardEntriesArray(existingEntries);
  const check = validateScoreSubmission(input);
  if (!check.valid) {
    return {
      ok: false,
      error: check.error,
      entries: cleanExisting,
      globalRank: null,
      environmentRank: null,
    };
  }

  const normalizedPilotKey = check.sanitizedName.toLowerCase();
  const existingIndex = cleanExisting.findIndex(
    (e) =>
      e.playerName.toLowerCase() === normalizedPilotKey &&
      e.environmentId === check.environmentId
  );

  const now =
    typeof input.createdAt === 'number' && Number.isFinite(input.createdAt)
      ? input.createdAt
      : Date.now();

  let targetEntry: LeaderboardEntry;
  let updated = true;
  let keptExistingBest = false;
  let nextList: LeaderboardEntry[];

  if (existingIndex !== -1) {
    const prev = cleanExisting[existingIndex];
    const isBetterScore =
      check.cleanScore > prev.score ||
      (check.cleanScore === prev.score && check.maxCombo > prev.maxCombo);

    if (!isBetterScore) {
      // Preserve existing best record without duplicating
      targetEntry = { ...prev, isPlayerEntry: true };
      updated = false;
      keptExistingBest = true;
      nextList = cleanExisting.map((item, idx) =>
        idx === existingIndex ? targetEntry : item
      );
    } else {
      targetEntry = {
        id: prev.id.startsWith('seed-')
          ? `pilot-${now}-${Math.random().toString(36).slice(2, 7)}`
          : prev.id,
        playerName: check.sanitizedName,
        score: check.cleanScore,
        birdId: check.birdId,
        environmentId: check.environmentId,
        maxCombo: check.maxCombo,
        peakComboMultiplier: check.peakComboMultiplier,
        medal: input.medal ?? getMedalForScore(check.cleanScore),
        createdAt: now,
        isPlayerEntry: true,
      };
      nextList = cleanExisting.map((item, idx) =>
        idx === existingIndex ? targetEntry : item
      );
    }
  } else {
    targetEntry = {
      id: `pilot-${now}-${Math.random().toString(36).slice(2, 7)}`,
      playerName: check.sanitizedName,
      score: check.cleanScore,
      birdId: check.birdId,
      environmentId: check.environmentId,
      maxCombo: check.maxCombo,
      peakComboMultiplier: check.peakComboMultiplier,
      medal: input.medal ?? getMedalForScore(check.cleanScore),
      createdAt: now,
      isPlayerEntry: true,
    };
    nextList = [...cleanExisting, targetEntry];
  }

  const sortedAll = sortLeaderboardEntries(nextList).slice(0, MAX_STORED_LEADERBOARD_ENTRIES);

  const globalIdx = sortedAll.findIndex((e) => e.id === targetEntry.id);
  const globalRank = globalIdx !== -1 ? globalIdx + 1 : null;

  const envSorted = sortLeaderboardEntries(
    sortedAll.filter((e) => e.environmentId === check.environmentId)
  );
  const envIdx = envSorted.findIndex((e) => e.id === targetEntry.id);
  const environmentRank = envIdx !== -1 ? envIdx + 1 : null;

  return {
    ok: true,
    entry: targetEntry,
    entries: sortedAll,
    globalRank,
    environmentRank,
    updated,
    keptExistingBest,
  };
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

/**
 * Marks entries matching the current device's pilotName with `isPlayerEntry: true`
 * for visual highlighting without mutating server records.
 */
export function markPlayerEntriesForPilot(
  entries: LeaderboardEntry[],
  pilotName: string
): LeaderboardEntry[] {
  const cleanPilot = pilotName.trim().toLowerCase();
  if (!cleanPilot) return entries;
  return entries.map((entry) => ({
    ...entry,
    isPlayerEntry: entry.playerName.trim().toLowerCase() === cleanPilot,
  }));
}

/**
 * Fetches the shared leaderboard from the server API (`/api/leaderboard`).
 * Never falls back to localStorage so visitors never see device-local data
 * masquerading as the shared global leaderboard.
 */
export async function fetchSharedLeaderboard(
  endpoint = '/api/leaderboard'
): Promise<SharedLeaderboardResponse> {
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.ok) {
      return {
        ok: false,
        entries: [],
        error:
          data?.error ??
          `Unable to load shared leaderboard (HTTP ${res.status}).`,
        code: data?.code,
      };
    }
    return {
      ok: true,
      entries: sanitizeLeaderboardEntriesArray(data.entries),
      storageMode: data.storageMode,
    };
  } catch (err) {
    return {
      ok: false,
      entries: [],
      error:
        err instanceof Error
          ? `Failed to reach shared leaderboard server: ${err.message}`
          : 'Failed to reach shared leaderboard server.',
    };
  }
}

/**
 * Submits a high score to the shared server API (`POST /api/leaderboard`).
 */
export async function submitSharedLeaderboardScore(
  input: SubmitHighScoreInput,
  endpoint = '/api/leaderboard'
): Promise<SubmitHighScoreResult> {
  const precheck = validateScoreSubmission(input);
  if (!precheck.valid) {
    return {
      ok: false,
      error: precheck.error,
      entries: [],
      globalRank: null,
      environmentRank: null,
    };
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.ok) {
      return {
        ok: false,
        error:
          data?.error ??
          `Failed to save score to shared leaderboard (HTTP ${res.status}).`,
        code: data?.code,
        entries: sanitizeLeaderboardEntriesArray(data?.entries ?? []),
        globalRank: null,
        environmentRank: null,
      };
    }

    const entries = sanitizeLeaderboardEntriesArray(data.entries);
    return {
      ok: true,
      entry: data.entry,
      entries,
      globalRank: typeof data.globalRank === 'number' ? data.globalRank : null,
      environmentRank:
        typeof data.environmentRank === 'number' ? data.environmentRank : null,
      updated: Boolean(data.updated),
      keptExistingBest: Boolean(data.keptExistingBest),
      storageMode: data.storageMode,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Network error while saving score: ${err.message}`
          : 'Network error while saving score.',
      entries: [],
      globalRank: null,
      environmentRank: null,
    };
  }
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
    const validEntries = sanitizeLeaderboardEntriesArray(parsed);
    if (validEntries.length === 0) {
      return sortLeaderboardEntries(DEFAULT_SEED_LEADERBOARD_ENTRIES);
    }
    return validEntries;
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
  const res = applyScoreSubmissionToEntries(existing, input);
  if (!res.ok) {
    return res;
  }

  const nextEntries = saveLeaderboardEntries(res.entries, leaderboardStorageKey);
  if (res.entry) {
    saveLastPilotName(res.entry.playerName, pilotNameStorageKey);
    saveEnvironmentBestScore(res.entry.environmentId, res.entry.score, envBestStorageKey);
  }

  return {
    ...res,
    entries: nextEntries,
  };
}
