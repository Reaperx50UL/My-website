import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_HOUSE_RULES } from '@/components/experiments/ludo-royale/game/constants';
import { createMatchedOnlineRoom } from '@/components/experiments/ludo-royale/game/multiplayerLogic';
import {
  broadcastGameState,
  broadcastRoomUpdate,
  generateRoomCode,
  processRoomTick,
} from '@/components/experiments/ludo-royale/server/roomEngine';
import {
  multiplayerStore,
  ServerRoom,
} from '@/components/experiments/ludo-royale/server/store';

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

    // 2. If client has already been matched to a room
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

    // 3. Check if client has an active matchmaking ticket
    const userTicket = await multiplayerStore.getTicket(clientId);
    if (!userTicket) {
      // Client is idle/connected (e.g. browsing mode selection cards, not queuing yet)
      return NextResponse.json({
        status: 'idle',
        onlineCount,
        backend: backendStatus,
      });
    }

    // 4. Client is actively queuing. Check target bracket.
    const targetCount = userTicket.targetPlayers;

    // Distributed fallback: attempt match dequeue if bracket filled
    const matchedGroup = await multiplayerStore.dequeueMatchmakingGroup(targetCount);
    if (matchedGroup && matchedGroup.length === targetCount) {
      const roomCode = generateRoomCode();
      const matchedRoom = createMatchedOnlineRoom({
        roomCode,
        matchedEntries: matchedGroup.map((t) => ({
          id: t.id,
          name: t.name,
          avatar: t.avatar,
          targetPlayers: t.targetPlayers,
          joinedAt: t.timestamp,
        })),
        targetPlayers: targetCount,
        rules: DEFAULT_HOUSE_RULES,
      });

      const room: ServerRoom = {
        ...matchedRoom,
        players: matchedRoom.players.map((p) => ({
          ...p,
          lastSeen: Date.now(),
        })),
        updatedAt: Date.now(),
        version: 1,
      };

      await multiplayerStore.saveRoom(room);

      for (const player of room.players) {
        await multiplayerStore.setMatchForClient(player.id, {
          roomCode,
          color: player.color,
          matchedAt: Date.now(),
        });
      }

      broadcastRoomUpdate(room);
      broadcastGameState(room);

      const myPlayer = room.players.find((p) => p.id === clientId);
      const myColor = myPlayer?.color || 'red';

      return NextResponse.json({
        status: 'matched',
        room,
        gameState: room.gameState,
        assignedColor: myColor,
        version: room.version,
        onlineCount,
        backend: backendStatus,
      });
    }

    const bracket = await multiplayerStore.getMatchmakingBracket(targetCount);
    return NextResponse.json({
      status: 'searching',
      targetPlayers: targetCount,
      foundPlayers: bracket.length,
      queueSize: bracket.length,
      queuedPlayers: bracket.map((b) => ({
        id: b.id,
        name: b.name,
        avatar: b.avatar,
      })),
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
