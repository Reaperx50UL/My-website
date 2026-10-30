import assert from 'node:assert/strict';
import test from 'node:test';
import {
  handleAddBot,
  handleCreateRoom,
  handleJoinMatchmaking,
  handleJoinRoom,
  handleLeaveMatchmaking,
  handleLeaveRoom,
  handleMoveToken,
  handleRollDice,
  handleStartMatch,
  handleToggleReady,
} from './roomEngine';
import { multiplayerStore } from './store';

test('1. Room Creation: generates 6-character room code, assigns host to Red, initializes lobby', async () => {
  const hostId = `host-${Date.now()}`;
  const res = await handleCreateRoom(hostId, 'HostAlice', 'crown');

  assert.equal(res.success, true);
  assert.ok(res.room);
  assert.equal(res.room.roomCode.length, 6);
  assert.match(res.room.roomCode, /^[A-Z0-9]{6}$/);
  assert.equal(res.room.status, 'lobby');
  assert.equal(res.room.hostId, hostId);
  assert.equal(res.room.players.length, 1);
  assert.equal(res.room.players[0].id, hostId);
  assert.equal(res.room.players[0].color, 'red');
  assert.equal(res.room.players[0].isHost, true);
  assert.equal(res.assignedColor, 'red');
});

test('2. Room Joining & Normalization: case-insensitive, trims whitespace, assigns next color (green)', async () => {
  const hostId = `host-norm-${Date.now()}`;
  const createRes = await handleCreateRoom(hostId, 'Alice', 'crown');
  const code = createRes.room!.roomCode;

  // Join with lowercase and surrounding spaces
  const player2Id = `p2-${Date.now()}`;
  const joinRes = await handleJoinRoom(`  ${code.toLowerCase()}  `, player2Id, 'Bob', 'knight');

  assert.equal(joinRes.success, true);
  assert.ok(joinRes.room);
  assert.equal(joinRes.room.players.length, 2);
  assert.equal(joinRes.room.players[1].id, player2Id);
  assert.equal(joinRes.room.players[1].name, 'Bob');
  assert.equal(joinRes.assignedColor, 'green');
  assert.equal(joinRes.room.players[1].color, 'green');
});

test('3. Room Validation: rejects invalid codes, non-existent rooms, and full rooms (max 4)', async () => {
  // Invalid format
  const res1 = await handleJoinRoom('ABC', 'p', 'Name', 'crown');
  assert.equal(res1.success, false);
  assert.match(res1.error!, /must be 6 alphanumeric/i);

  // Non-existent room
  const res2 = await handleJoinRoom('ZZZZZZ', 'p', 'Name', 'crown');
  assert.equal(res2.success, false);
  assert.match(res2.error!, /not found/i);

  // Full room capacity check (4 players)
  const hostRes = await handleCreateRoom(`host-full-${Date.now()}`, 'Host', 'crown');
  const code = hostRes.room!.roomCode;

  await handleJoinRoom(code, 'p2', 'P2', 'knight');
  await handleJoinRoom(code, 'p3', 'P3', 'shield');
  await handleJoinRoom(code, 'p4', 'P4', 'falcon');

  const res5 = await handleJoinRoom(code, 'p5', 'P5', 'crown');
  assert.equal(res5.success, false);
  assert.match(res5.error!, /full \(4\/4 players\)/i);
});

test('4. Duplicate Join Reconnect: existing player re-joining recovers seat without duplicate entries', async () => {
  const hostRes = await handleCreateRoom(`host-rec-${Date.now()}`, 'Host', 'crown');
  const code = hostRes.room!.roomCode;
  const p2Id = `p2-rec-${Date.now()}`;

  const join1 = await handleJoinRoom(code, p2Id, 'PlayerTwo', 'knight');
  assert.equal(join1.success, true);
  assert.equal(join1.room!.players.length, 2);

  // Re-join with same ID
  const join2 = await handleJoinRoom(code, p2Id, 'PlayerTwo', 'knight');
  assert.equal(join2.success, true);
  assert.equal(join2.room!.players.length, 2);
  assert.equal(join2.assignedColor, 'green');
});

test('5. Ready Toggle & AI Bot Addition in Lobby', async () => {
  const hostId = `host-bot-${Date.now()}`;
  const hostRes = await handleCreateRoom(hostId, 'Host', 'crown');
  const code = hostRes.room!.roomCode;

  // Toggle ready
  const toggleRes = await handleToggleReady(code, hostId);
  assert.equal(toggleRes.success, true);
  assert.equal(toggleRes.room!.players[0].ready, false);

  // Add Bot
  const botRes = await handleAddBot(code, hostId);
  assert.equal(botRes.success, true);
  assert.equal(botRes.room!.players.length, 2);
  assert.equal(botRes.room!.players[1].isAI, true);
  assert.equal(botRes.room!.players[1].color, 'green');
});

test('6. Authoritative Turn Validation: out-of-turn rolls and moves are rejected by server', async () => {
  const hostId = `host-turn-${Date.now()}`;
  const p2Id = `p2-turn-${Date.now()}`;
  const hostRes = await handleCreateRoom(hostId, 'HostAlice', 'crown');
  const code = hostRes.room!.roomCode;

  await handleJoinRoom(code, p2Id, 'BobGreen', 'knight');
  const startRes = await handleStartMatch(code, hostId);
  assert.equal(startRes.success, true);
  assert.equal(startRes.room!.status, 'playing');

  const activePlayer = startRes.gameState!.players[startRes.gameState!.activePlayerIndex];
  assert.equal(activePlayer.color, 'red'); // First player is red (host)

  // Player 2 (Green) attempts to roll out of turn
  const outOfTurnRoll = await handleRollDice(code, p2Id);
  assert.equal(outOfTurnRoll.success, false);
  assert.match(outOfTurnRoll.error!, /Out of turn/i);

  // Host (Red) rolls - must succeed
  const validRoll = await handleRollDice(code, hostId);
  assert.equal(validRoll.success, true);
  assert.ok(validRoll.gameState);
  assert.ok(validRoll.gameState.diceValue !== null);
  assert.ok(validRoll.gameState.diceValue! >= 1 && validRoll.gameState.diceValue! <= 6);

  // If in SELECTING_TOKEN, verify out-of-turn token move rejected
  if (validRoll.gameState.turnPhase === 'SELECTING_TOKEN') {
    const illegalMove = await handleMoveToken(code, p2Id, 'green-0');
    assert.equal(illegalMove.success, false);
    assert.match(illegalMove.error!, /Out of turn/i);
  }
});

test('7. Matchmaking: single player queues (searching); distinct player pairs into 2-player match; no self-matching', async () => {
  const client1Id = `mm1-${Date.now()}`;
  const client2Id = `mm2-${Date.now()}`;

  // Client 1 joins matchmaking
  const mm1 = await handleJoinMatchmaking(client1Id, 'Challenger1', 'crown');
  assert.equal(mm1.status, 'searching');
  assert.ok(mm1.queueSize >= 1);

  // Client 1 cannot match with themselves
  const mm1Dup = await handleJoinMatchmaking(client1Id, 'Challenger1', 'crown');
  assert.equal(mm1Dup.status, 'searching');

  // Client 2 joins matchmaking -> Pair formed!
  const mm2 = await handleJoinMatchmaking(client2Id, 'Challenger2', 'shield');
  assert.equal(mm2.status, 'matched');
  assert.ok(mm2.room);
  assert.equal(mm2.assignedColor, 'yellow');
  assert.equal(mm2.room.players.length, 2);
  assert.equal(mm2.room.status, 'playing');

  // Check that Client 1's match record is available for sync
  const client1Match = await multiplayerStore.getMatchForClient(client1Id);
  assert.ok(client1Match);
  assert.equal(client1Match.roomCode, mm2.room.roomCode);
  assert.equal(client1Match.color, 'red');

  // Client 1 can query and retrieve match
  const mm1Synced = await handleJoinMatchmaking(client1Id, 'Challenger1', 'crown');
  assert.equal(mm1Synced.status, 'matched');
  assert.equal(mm1Synced.room!.roomCode, mm2.room.roomCode);
  assert.equal(mm1Synced.assignedColor, 'red');
});

test('8. Matchmaking Cancellation: cleanly removes ticket from queue', async () => {
  const cancelClientId = `mm-cancel-${Date.now()}`;
  const queued = await handleJoinMatchmaking(cancelClientId, 'Canceler', 'knight');
  assert.equal(queued.status, 'searching');

  await handleLeaveMatchmaking(cancelClientId);
  const match = await multiplayerStore.getMatchForClient(cancelClientId);
  assert.equal(match, null);
});

test('9. Leaving Room: removes player from lobby and handles host transition or room deletion', async () => {
  const hostId = `host-leave-${Date.now()}`;
  const p2Id = `p2-leave-${Date.now()}`;
  const createRes = await handleCreateRoom(hostId, 'Host', 'crown');
  const code = createRes.room!.roomCode;

  await handleJoinRoom(code, p2Id, 'Player2', 'knight');

  // P2 leaves
  const leaveRes = await handleLeaveRoom(code, p2Id);
  assert.equal(leaveRes.success, true);
  const roomAfterP2Leave = await multiplayerStore.getRoom(code);
  assert.equal(roomAfterP2Leave!.players.length, 1);

  // Host leaves last -> room deleted
  await handleLeaveRoom(code, hostId);
  const roomAfterHostLeave = await multiplayerStore.getRoom(code);
  assert.equal(roomAfterHostLeave, null);
});
