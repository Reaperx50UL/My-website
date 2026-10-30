import { NextRequest } from 'next/server';
import { multiplayerStore, ServerMessage } from '@/components/experiments/ludo-royale/server/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId') || `plr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const roomCode = (searchParams.get('roomCode') || '').trim().toUpperCase();

  multiplayerStore.registerPresence(clientId);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial WELCOME event
      const welcomeMsg: ServerMessage = {
        type: 'WELCOME',
        clientId,
        onlineCount: multiplayerStore.getOnlineCount(),
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(welcomeMsg)}\n\n`));

      // If roomCode was passed, immediately sync current room state to user
      if (roomCode) {
        const room = await multiplayerStore.getRoom(roomCode);
        if (room) {
          const myPlayer = room.players.find((p) => p.id === clientId);
          const assignedColor = myPlayer ? myPlayer.color : 'red';
          const updateMsg: ServerMessage = {
            type: 'ROOM_UPDATED',
            room,
            assignedColor,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(updateMsg)}\n\n`));

          if (room.gameState) {
            const stateMsg: ServerMessage = {
              type: 'GAME_STATE_SYNC',
              gameState: room.gameState,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(stateMsg)}\n\n`));
          }
        }
      }

      // Subscribe to personal client channel and room channel
      const unsubClient = multiplayerStore.subscribe(`client:${clientId}`, (msg) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
        } catch {
          // Stream closed
        }
      });

      let unsubRoom: (() => void) | null = null;
      if (roomCode) {
        unsubRoom = multiplayerStore.subscribe(`room:${roomCode}`, (msg) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
          } catch {
            // Stream closed
          }
        });
      }

      // Heartbeat ping interval to keep connection alive on Vercel
      const pingInterval = setInterval(() => {
        try {
          multiplayerStore.registerPresence(clientId);
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        unsubClient();
        if (unsubRoom) unsubRoom();
        multiplayerStore.removePresence(clientId);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
