import { NextRequest, NextResponse } from 'next/server';
import {
  getSharedLeaderboardEntries,
  resetSharedLeaderboardForAdminOrTest,
  submitSharedScore,
} from '@/components/experiments/aether-glider/server/leaderboardStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await getSharedLeaderboardEntries();
    const status = result.ok
      ? 200
      : result.code === 'BACKEND_NOT_CONFIGURED'
      ? 503
      : 500;

    return NextResponse.json(result, {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        entries: [],
        code: 'STORAGE_READ_ERROR',
        error: err instanceof Error ? err.message : 'Failed to fetch leaderboard.',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let payload: Record<string, unknown> = {};
    try {
      payload = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          code: 'INVALID_JSON',
          error: 'Invalid JSON request body.',
          entries: [],
          globalRank: null,
          environmentRank: null,
        },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      );
    }

    const result = await submitSharedScore({
      playerName: typeof payload.playerName === 'string' ? payload.playerName : '',
      score: typeof payload.score === 'number' ? payload.score : Number(payload.score),
      birdId: payload.birdId as never,
      environmentId: payload.environmentId as never,
      maxCombo:
        typeof payload.maxCombo === 'number' ? payload.maxCombo : undefined,
      peakComboMultiplier:
        typeof payload.peakComboMultiplier === 'number'
          ? payload.peakComboMultiplier
          : undefined,
      medal: payload.medal as never,
      createdAt:
        typeof payload.createdAt === 'number' ? payload.createdAt : undefined,
    });

    const status = result.ok
      ? 200
      : result.code === 'VALIDATION_ERROR'
      ? 400
      : result.code === 'BACKEND_NOT_CONFIGURED'
      ? 503
      : 500;

    return NextResponse.json(result, {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        entries: [],
        globalRank: null,
        environmentRank: null,
        code: 'STORAGE_WRITE_ERROR',
        error: err instanceof Error ? err.message : 'Failed to submit score.',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { ok: false, error: 'Reset endpoint not permitted in production.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const modeParam = searchParams.get('mode');
  const preset = modeParam === 'empty' ? 'empty' : 'seed';
  const result = await resetSharedLeaderboardForAdminOrTest(preset);

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}
