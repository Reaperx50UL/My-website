import { BIRD_PROFILES, BirdId, ENVIRONMENT_PROFILES, EnvironmentId } from './config';

const memoryFallback = new Map<string, string>();

export function safeGetStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Ignore storage access errors in private browsing or restricted iframes
  }
  return memoryFallback.get(key) ?? null;
}

export function safeSetStorageItem(key: string, value: string): void {
  memoryFallback.set(key, value);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore quota or security errors
  }
}

export function loadBestScore(storageKey = 'aether_glider_best_score'): number {
  const raw = safeGetStorageItem(storageKey);
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function saveBestScore(score: number, storageKey = 'aether_glider_best_score'): number {
  const currentBest = loadBestScore(storageKey);
  const nextBest = Math.max(currentBest, Math.max(0, Math.floor(score)));
  safeSetStorageItem(storageKey, String(nextBest));
  return nextBest;
}

export function loadMutedPreference(storageKey = 'aether_glider_muted'): boolean {
  const raw = safeGetStorageItem(storageKey);
  if (raw === null) return false;
  return raw === 'true';
}

export function saveMutedPreference(muted: boolean, storageKey = 'aether_glider_muted'): void {
  safeSetStorageItem(storageKey, muted ? 'true' : 'false');
}

export function loadSelectedBird(storageKey = 'aether_glider_bird'): BirdId {
  const raw = safeGetStorageItem(storageKey);
  if (raw && BIRD_PROFILES.some((b) => b.id === raw)) {
    return raw as BirdId;
  }
  return 'kora';
}

export function saveSelectedBird(birdId: BirdId, storageKey = 'aether_glider_bird'): void {
  safeSetStorageItem(storageKey, birdId);
}

export function loadSelectedEnvironment(storageKey = 'aether_glider_env'): EnvironmentId {
  const raw = safeGetStorageItem(storageKey);
  if (raw && ENVIRONMENT_PROFILES.some((e) => e.id === raw)) {
    return raw as EnvironmentId;
  }
  return 'clockwork';
}

export function saveSelectedEnvironment(
  envId: EnvironmentId,
  storageKey = 'aether_glider_env'
): void {
  safeSetStorageItem(storageKey, envId);
}
