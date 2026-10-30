import { NextRequest, NextResponse } from 'next/server';
import { processRoomTick } from '@/components/experiments/ludo-royale/server/roomEngine';
import { multiplayerStore } from '@/components/experiments/ludo-royale/server/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const roomCode = (searchParams.get('roomCode') || '').trim().toUpperCase();
    const clientVersion = searchParams.has('version')
      ? Number(searchParams.get('version'))
      : -1;

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing clientId parameter' },
        { status: 400 }
      );
    }

    multiplayerStore.registerPresence(clientId);
    const onlineCount = multiplayerStore.getOnlineCount();
    const backendStatus = multiplayerStore.getBackendStatus();

    // 1. If syncing a specific Room (Lobby or Active Game)
    if (roomCode) {
      const room = await multiplayerStore.getRoom(roomCode);
      if (!room) {
        return NextResponse.json(
          { notFound: true, error: `Room "${roomCode}" was not found or expired.` },
          { status: 404 }
        );
      }

      // Check if room needs an auto-tick (bot turn or transition)
      await processRoomTick(room);

      // Fast-path: unchanged version
      if (clientVersion > 0 && clientVersion === room.version) {
        return NextResponse.json({
          unchanged: true,
          version: room.version,
          onlineCount,
          backend: backendStatus,
        });
      }

      const player = room.players.find((p) => p.id === clientId);
      const assignedColor = player ? player.color : 'red';

      return NextResponse.json({
        success: true,
        room,
        gameState: room.gameState,
        assignedColor,
        version: room.version,
        onlineCount,
        backend: backendStatus,
      });
    }

    // 2. If client is in Matchmaking Queue (no roomCode yet)
    const matchRecord = await multiplayerStore.getMatchForClient(clientId);
    if (matchRecord) {
      const room = await multiplayerStore.getRoom(matchRecord.roomCode);
      if (room) {
        return NextResponse.json({
          status: 'matched',
          room,
          gameState: room.gameState,
          assignedColor: matchRecord.color,
          version: room.version,
          onlineCount,
          backend: backendStatus,
        });
      }
    }

    const queueSize = await multiplayerStore.getMatchmakingQueueSize();
    return NextResponse.json({
      status: 'searching',
      queueSize,
      onlineCount,
      backend: backendStatus,
    });
  } catch (err: any) {
    console.error('Ludo API sync error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
