import { NextRequest, NextResponse } from 'next/server';
import {
  handleAddBot,
  handleAdvanceTurn,
  handleCreateRoom,
  handleJoinMatchmaking,
  handleJoinRoom,
  handleLeaveMatchmaking,
  handleLeaveRoom,
  handleMoveToken,
  handleRollDice,
  handleStartMatch,
  handleToggleReady,
} from '@/components/experiments/ludo-royale/server/roomEngine';
import { multiplayerStore } from '@/components/experiments/ludo-royale/server/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, clientId } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing clientId parameter' },
        { status: 400 }
      );
    }

    multiplayerStore.registerPresence(clientId);

    switch (type) {
      case 'CREATE_ROOM': {
        const result = await handleCreateRoom(
          clientId,
          body.name,
          body.avatar,
          body.rules
        );
        return NextResponse.json(result);
      }

      case 'JOIN_ROOM': {
        const result = await handleJoinRoom(
          body.roomCode,
          clientId,
          body.name,
          body.avatar
        );
        return NextResponse.json(result);
      }

      case 'LEAVE_ROOM': {
        const result = await handleLeaveRoom(body.roomCode, clientId);
        return NextResponse.json(result);
      }

      case 'TOGGLE_READY': {
        const result = await handleToggleReady(body.roomCode, clientId);
        return NextResponse.json(result);
      }

      case 'ADD_BOT': {
        const result = await handleAddBot(body.roomCode, clientId);
        return NextResponse.json(result);
      }

      case 'START_MATCH': {
        const result = await handleStartMatch(body.roomCode, clientId);
        return NextResponse.json(result);
      }

      case 'ROLL_DICE': {
        const result = await handleRollDice(body.roomCode, clientId);
        return NextResponse.json(result);
      }

      case 'MOVE_TOKEN': {
        const result = await handleMoveToken(
          body.roomCode,
          clientId,
          body.tokenId
        );
        return NextResponse.json(result);
      }

      case 'ADVANCE_TURN': {
        const result = await handleAdvanceTurn(body.roomCode);
        return NextResponse.json(result);
      }

      case 'JOIN_MATCHMAKING': {
        const result = await handleJoinMatchmaking(
          clientId,
          body.name,
          body.avatar
        );
        return NextResponse.json(result);
      }

      case 'LEAVE_MATCHMAKING': {
        await handleLeaveMatchmaking(clientId);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action type "${type}"` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error('Ludo API action error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
