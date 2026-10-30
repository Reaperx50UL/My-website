import fs from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_SEED_LEADERBOARD_ENTRIES,
  LeaderboardEntry,
  SharedLeaderboardResponse,
  SubmitHighScoreInput,
  SubmitHighScoreResult,
  applyScoreSubmissionToEntries,
  sanitizeLeaderboardEntriesArray,
  sortLeaderboardEntries,
} from '../game/leaderboard';

export type StorageBackendMode =
  | 'vercel-kv'
  | 'supabase'
  | 'disk-file'
  | 'unconfigured';

const REDIS_KEY =
  process.env.LEADERBOARD_KV_KEY || 'aether_glider:shared_leaderboard_v1';

interface PersistedLeaderboardDocument {
  version: 1;
  updatedAt: number;
  entries: LeaderboardEntry[];
}

// Serializes concurrent read-modify-write operations on the same node
let writeLockPromise: Promise<unknown> = Promise.resolve();

function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeLockPromise.then(fn, fn);
  writeLockPromise = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

export function resolveStorageBackendMode(): StorageBackendMode {
  if (process.env.LEADERBOARD_FORCE_UNCONFIGURED === 'true') {
    return 'unconfigured';
  }
  const kvUrl =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (kvUrl && kvToken) {
    return 'vercel-kv';
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    return 'supabase';
  }

  // On Vercel serverless without cloud env vars configured, do not silently use ephemeral /tmp
  if (process.env.VERCEL === '1' && !process.env.LEADERBOARD_DATA_PATH) {
    return 'unconfigured';
  }

  return 'disk-file';
}

function getDiskFilePath(): string {
  if (process.env.LEADERBOARD_DATA_PATH) {
    return path.resolve(process.env.LEADERBOARD_DATA_PATH);
  }
  return path.resolve(process.cwd(), '.data', 'aether-glider-leaderboard.json');
}

async function readFromVercelKv(): Promise<LeaderboardEntry[]> {
  const kvUrl = (
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    ''
  ).replace(/\/$/, '');
  const kvToken =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

  const res = await fetch(`${kvUrl}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${kvToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['GET', REDIS_KEY]),
  });

  if (!res.ok) {
    throw new Error(`KV read failed with HTTP ${res.status}`);
  }

  const data = (await res.json()) as { result?: string | null };
  if (!data.result) {
    const initial = sortLeaderboardEntries(DEFAULT_SEED_LEADERBOARD_ENTRIES);
    await writeToVercelKv(initial);
    return initial;
  }

  const parsed = JSON.parse(data.result) as PersistedLeaderboardDocument | LeaderboardEntry[];
  const rawEntries = Array.isArray(parsed) ? parsed : parsed?.entries ?? [];
  return sanitizeLeaderboardEntriesArray(rawEntries);
}

async function writeToVercelKv(entries: LeaderboardEntry[]): Promise<void> {
  const kvUrl = (
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    ''
  ).replace(/\/$/, '');
  const kvToken =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

  const doc: PersistedLeaderboardDocument = {
    version: 1,
    updatedAt: Date.now(),
    entries: sortLeaderboardEntries(entries).map(({ isPlayerEntry: _ignore, ...rest }) => rest),
  };

  const res = await fetch(`${kvUrl}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${kvToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['SET', REDIS_KEY, JSON.stringify(doc)]),
  });

  if (!res.ok) {
    throw new Error(`KV write failed with HTTP ${res.status}`);
  }
}

async function readFromSupabase(): Promise<LeaderboardEntry[]> {
  const baseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const table = process.env.SUPABASE_LEADERBOARD_TABLE || 'aether_glider_leaderboard';

  const res = await fetch(
    `${baseUrl}/rest/v1/${table}?select=*&order=score.desc,maxCombo.desc,createdAt.asc&limit=100`,
    {
      method: 'GET',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Supabase read failed with HTTP ${res.status}`);
  }

  const rows = (await res.json()) as unknown[];
  return sanitizeLeaderboardEntriesArray(rows);
}

async function writeToSupabase(entries: LeaderboardEntry[]): Promise<void> {
  const baseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const table = process.env.SUPABASE_LEADERBOARD_TABLE || 'aether_glider_leaderboard';

  const cleanPayload = sortLeaderboardEntries(entries).map(
    ({ isPlayerEntry: _ignore, ...rest }) => rest
  );

  const res = await fetch(`${baseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(cleanPayload),
  });

  if (!res.ok) {
    throw new Error(`Supabase write failed with HTTP ${res.status}`);
  }
}

async function readFromDiskFile(): Promise<LeaderboardEntry[]> {
  const filePath = getDiskFilePath();
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as PersistedLeaderboardDocument | LeaderboardEntry[];
    const rawEntries = Array.isArray(parsed) ? parsed : parsed?.entries ?? [];
    return sanitizeLeaderboardEntriesArray(rawEntries);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      const initial = sortLeaderboardEntries(DEFAULT_SEED_LEADERBOARD_ENTRIES);
      await writeToDiskFile(initial);
      return initial;
    }
    throw err;
  }
}

async function writeToDiskFile(entries: LeaderboardEntry[]): Promise<void> {
  const filePath = getDiskFilePath();
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const doc: PersistedLeaderboardDocument = {
    version: 1,
    updatedAt: Date.now(),
    entries: sortLeaderboardEntries(entries).map(
      ({ isPlayerEntry: _ignore, ...rest }) => rest
    ),
  };

  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(doc, null, 2), 'utf8');
  await fs.rename(tempPath, filePath);
}

async function readPersistentEntries(mode: StorageBackendMode): Promise<LeaderboardEntry[]> {
  if (mode === 'vercel-kv') return readFromVercelKv();
  if (mode === 'supabase') return readFromSupabase();
  if (mode === 'disk-file') return readFromDiskFile();
  throw new Error('Shared leaderboard database is not configured.');
}

async function writePersistentEntries(
  mode: StorageBackendMode,
  entries: LeaderboardEntry[]
): Promise<void> {
  if (mode === 'vercel-kv') return writeToVercelKv(entries);
  if (mode === 'supabase') return writeToSupabase(entries);
  if (mode === 'disk-file') return writeToDiskFile(entries);
  throw new Error('Shared leaderboard database is not configured.');
}

export async function getSharedLeaderboardEntries(): Promise<SharedLeaderboardResponse> {
  const mode = resolveStorageBackendMode();
  if (mode === 'unconfigured') {
    return {
      ok: false,
      entries: [],
      storageMode: mode,
      code: 'BACKEND_NOT_CONFIGURED',
      error:
        'Shared leaderboard database is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN (Upstash / Vercel KV) or SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    };
  }

  try {
    const entries = await readPersistentEntries(mode);
    return {
      ok: true,
      entries,
      storageMode: mode,
    };
  } catch (err) {
    return {
      ok: false,
      entries: [],
      storageMode: mode,
      code: 'STORAGE_READ_ERROR',
      error:
        err instanceof Error
          ? `Failed to load shared leaderboard: ${err.message}`
          : 'Failed to load shared leaderboard.',
    };
  }
}

export async function submitSharedScore(
  input: SubmitHighScoreInput
): Promise<SubmitHighScoreResult> {
  const mode = resolveStorageBackendMode();
  if (mode === 'unconfigured') {
    return {
      ok: false,
      entries: [],
      globalRank: null,
      environmentRank: null,
      storageMode: mode,
      code: 'BACKEND_NOT_CONFIGURED',
      error:
        'Shared leaderboard database is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN (Upstash / Vercel KV) or SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    };
  }

  return withWriteLock(async () => {
    try {
      const existing = await readPersistentEntries(mode);
      const result = applyScoreSubmissionToEntries(existing, input);
      if (!result.ok) {
        return {
          ...result,
          storageMode: mode,
          code: 'VALIDATION_ERROR',
        };
      }

      if (result.updated) {
        await writePersistentEntries(mode, result.entries);
      }

      return {
        ...result,
        storageMode: mode,
      };
    } catch (err) {
      return {
        ok: false,
        entries: [],
        globalRank: null,
        environmentRank: null,
        storageMode: mode,
        code: 'STORAGE_WRITE_ERROR',
        error:
          err instanceof Error
            ? `Failed to save score to shared leaderboard: ${err.message}`
            : 'Failed to save score to shared leaderboard.',
      };
    }
  });
}

export async function resetSharedLeaderboardForAdminOrTest(
  preset: 'seed' | 'empty' = 'seed'
): Promise<SharedLeaderboardResponse> {
  const mode = resolveStorageBackendMode();
  if (mode === 'unconfigured') {
    return {
      ok: false,
      entries: [],
      storageMode: mode,
      code: 'BACKEND_NOT_CONFIGURED',
      error: 'Shared leaderboard database is not configured.',
    };
  }

  return withWriteLock(async () => {
    const nextEntries =
      preset === 'empty'
        ? []
        : sortLeaderboardEntries(DEFAULT_SEED_LEADERBOARD_ENTRIES);
    await writePersistentEntries(mode, nextEntries);
    return {
      ok: true,
      entries: nextEntries,
      storageMode: mode,
    };
  });
}
