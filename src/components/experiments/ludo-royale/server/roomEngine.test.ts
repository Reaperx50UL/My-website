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

test('10. 3-Player & 4-Player Matchmaking Brackets: queue independently and match exact player counts', async () => {
  const p3_1 = `p3-1-${Date.now()}`;
  const p3_2 = `p3-2-${Date.now()}`;
  const p3_3 = `p3-3-${Date.now()}`;

  // 3-Player queue: 1st player queues
  const res1 = await handleJoinMatchmaking(p3_1, 'Trio1', 'crown', 3);
  assert.equal(res1.status, 'searching');
  assert.equal(res1.targetPlayers, 3);

  // Verify getTicket works
  const ticket1 = await multiplayerStore.getTicket(p3_1);
  assert.ok(ticket1);
  assert.equal(ticket1.targetPlayers, 3);

  // 2nd player queues
  const res2 = await handleJoinMatchmaking(p3_2, 'Trio2', 'shield', 3);
  assert.equal(res2.status, 'searching');
  assert.equal(res2.foundPlayers, 2);

  // 3rd player queues -> match triggered!
  const res3 = await handleJoinMatchmaking(p3_3, 'Trio3', 'knight', 3);
  assert.equal(res3.status, 'matched');
  assert.ok(res3.room);
  assert.equal(res3.room.players.length, 3);
  assert.equal(res3.room.targetPlayers, 3);

  // All 3 players now have match records
  const m1 = await multiplayerStore.getMatchForClient(p3_1);
  const m2 = await multiplayerStore.getMatchForClient(p3_2);
  const m3 = await multiplayerStore.getMatchForClient(p3_3);
  assert.ok(m1 && m2 && m3);
  assert.equal(m1.roomCode, res3.room.roomCode);
  assert.equal(m2.roomCode, res3.room.roomCode);
  assert.equal(m3.roomCode, res3.room.roomCode);
});

test('11. Ticket lifecycle: getTicket returns null after match or cancellation', async () => {
  const pId = `ticket-test-${Date.now()}`;
  assert.equal(await multiplayerStore.getTicket(pId), null);

  await handleJoinMatchmaking(pId, 'TicketUser', 'crown', 4);
  const activeTicket = await multiplayerStore.getTicket(pId);
  assert.ok(activeTicket);
  assert.equal(activeTicket.targetPlayers, 4);

  await handleLeaveMatchmaking(pId);
  assert.equal(await multiplayerStore.getTicket(pId), null);
});

test('12. 2P Match Departure: terminates match, clears match records for both players, room status is terminated', async () => {
  const p1 = `p2p-leave-1-${Date.now()}`;
  const p2 = `p2p-leave-2-${Date.now()}`;

  await handleJoinMatchmaking(p1, 'Player1', 'crown', 2);
  const matched = await handleJoinMatchmaking(p2, 'Player2', 'shield', 2);
  assert.equal(matched.status, 'matched');
  const code = matched.room!.roomCode;

  // Both have match records
  assert.ok(await multiplayerStore.getMatchForClient(p1));
  assert.ok(await multiplayerStore.getMatchForClient(p2));

  // Player 1 leaves the active match
  const leaveRes = await handleLeaveRoom(code, p1);
  assert.equal(leaveRes.success, true);

  // Match records cleared for both players so neither is trapped
  assert.equal(await multiplayerStore.getMatchForClient(p1), null);
  assert.equal(await multiplayerStore.getMatchForClient(p2), null);

  // Room status is updated to terminated
  const terminatedRoom = await multiplayerStore.getRoom(code);
  assert.ok(terminatedRoom);
  assert.equal(terminatedRoom!.status, 'terminated');
  assert.equal(terminatedRoom!.terminatedReason, 'opponent_left_2p');
  assert.equal(terminatedRoom!.returnTo, 'matchmaking');

  // Player 1 can now immediately start fresh matchmaking without being forced back into previous room
  const freshSearch = await handleJoinMatchmaking(p1, 'Player1', 'crown', 2);
  assert.equal(freshSearch.status, 'searching');
  await handleLeaveMatchmaking(p1);
});

test('13. 3P Match Departure: 1st human departure replaces seat with bot, 2nd departure terminates match', async () => {
  const p1 = `p3p-1-${Date.now()}`;
  const p2 = `p3p-2-${Date.now()}`;
  const p3 = `p3p-3-${Date.now()}`;

  await handleJoinMatchmaking(p1, 'P1', 'crown', 3);
  await handleJoinMatchmaking(p2, 'P2', 'shield', 3);
  const matched = await handleJoinMatchmaking(p3, 'P3', 'knight', 3);
  assert.equal(matched.status, 'matched');
  const code = matched.room!.roomCode;

  // 1st player leaves -> seat converted to AI Bot, match continues for remaining 2 humans
  await handleLeaveRoom(code, p1);
  assert.equal(await multiplayerStore.getMatchForClient(p1), null);
  assert.ok(await multiplayerStore.getMatchForClient(p2));
  assert.ok(await multiplayerStore.getMatchForClient(p3));

  const roomWithBot = await multiplayerStore.getRoom(code);
  assert.ok(roomWithBot);
  assert.equal(roomWithBot!.status, 'playing');
  const seatP1 = roomWithBot!.players.find((p) => p.id === p1);
  assert.ok(seatP1);
  assert.equal(seatP1!.replacedByBot, true);
  assert.equal(seatP1!.isAI, true);

  // 2nd player leaves -> only 1 human remains -> match must terminate immediately!
  await handleLeaveRoom(code, p2);
  assert.equal(await multiplayerStore.getMatchForClient(p2), null);
  assert.equal(await multiplayerStore.getMatchForClient(p3), null);

  const finalRoom = await multiplayerStore.getRoom(code);
  assert.ok(finalRoom);
  assert.equal(finalRoom!.status, 'terminated');
  assert.equal(finalRoom!.terminatedReason, 'last_human_remaining');
});
