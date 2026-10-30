import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseAIMove } from './aiStrategy';
import {
  buildMoveIndicators,
  getGlobalTrackIndex,
  getStackOffset,
  getThemeTileSpec,
  getTokenGridCoord,
  getTurnLightingConfig,
  groupTokensByCell,
  isSafeTrackIndex,
  MAIN_TRACK_COORDS,
} from './boardLayout';
import {
  AVATAR_OPTIONS,
  BOARD_THEME_OPTIONS,
  computeDiceRollTransform,
  DEFAULT_HOUSE_RULES,
  DEFAULT_STATS,
  DICE_STYLE_OPTIONS,
  FINISH_STEP,
  getBoardThemeOption,
  getDiceStyleOption,
  HOME_PATH_START_STEP,
  MAX_TRACK_STEPS,
  PLAYER_COLORS,
  START_TRACK_INDEX,
} from './constants';
import {
  commitDiceRoll,
  completeTurnTransition,
  createInitialGameState,
  executeTokenMove,
} from './gameEngine';
import { PlayerConfig, PlayerStats, UserProfile } from './gameTypes';
import { getLegalMovesForPlayer } from './legalMoves';
import {
  calculateMatchEarnedXP,
  calculatePlayerLevel,
  getAvatarUnlockProgress,
  isAvatarUnlocked,
} from './progression';
import { buildSetupPlayerRoster, getDefaultSeatName } from './rules';
import { computeHapticDuration, soundManager } from '../services/sound';

const twoPlayers: PlayerConfig[] = [
  { color: 'red', name: 'Alice', avatar: 'crown', type: 'human' },
  { color: 'yellow', name: 'Bob', avatar: 'knight', type: 'human' },
];

const fourPlayers: PlayerConfig[] = [
  { color: 'red', name: 'Red', avatar: 'crown', type: 'human' },
  { color: 'green', name: 'Green', avatar: 'knight', type: 'ai', aiDifficulty: 'easy' },
  { color: 'yellow', name: 'Yellow', avatar: 'shield', type: 'ai', aiDifficulty: 'medium' },
  { color: 'blue', name: 'Blue', avatar: 'falcon', type: 'ai', aiDifficulty: 'hard' },
];

test('1. Every player has a valid 57-step movement path from start square (0) through track (50), home path (51..55), and finish (56)', () => {
  assert.equal(MAIN_TRACK_COORDS.length, 52);

  for (const color of PLAYER_COLORS) {
    // Yard (-1)
    const yardCoord = getTokenGridCoord(color, -1, 0);
    assert.ok(yardCoord.row >= 0 && yardCoord.row <= 14);
    assert.ok(yardCoord.col >= 0 && yardCoord.col <= 14);

    // Step 0 is player's start square
    const startIdx = getGlobalTrackIndex(color, 0);
    assert.equal(startIdx, START_TRACK_INDEX[color]);

    // Step 50 is the last shared track square before entering home path
    const turnIdx = getGlobalTrackIndex(color, MAX_TRACK_STEPS);
    assert.equal(turnIdx, (START_TRACK_INDEX[color] + 50) % 52);

    // Steps 51..55 are private home path squares (global track index is null)
    for (let s = HOME_PATH_START_STEP; s < FINISH_STEP; s++) {
      assert.equal(getGlobalTrackIndex(color, s), null);
      const hc = getTokenGridCoord(color, s, 0);
      assert.ok(hc.row >= 1 && hc.row <= 13);
      assert.ok(hc.col >= 1 && hc.col <= 13);
    }

    // Step 56 is central finish triangle
    const finishCoord = getTokenGridCoord(color, FINISH_STEP, 0);
    assert.ok(finishCoord.row >= 6 && finishCoord.row <= 8);
    assert.ok(finishCoord.col >= 6 && finishCoord.col <= 8);
  }
});

test('2. Entering the board from the yard requires rolling a 6', () => {
  const state = createInitialGameState({ mode: 'local', players: twoPlayers });

  // Rolling 1..5 when all tokens are in yard (-1) produces 0 legal moves and transitions turn
  for (const roll of [1, 2, 3, 4, 5]) {
    const afterRoll = commitDiceRoll(state, roll);
    assert.equal(afterRoll.legalMoves.length, 0);
    assert.equal(afterRoll.turnPhase, 'TURN_TRANSITION');
  }

  // Rolling a 6 produces 4 legal moves (one for each token in yard) to step 0
  const afterSix = commitDiceRoll(state, 6);
  assert.equal(afterSix.legalMoves.length, 4);
  assert.equal(afterSix.turnPhase, 'SELECTING_TOKEN');
  assert.equal(afterSix.legalMoves[0].fromSteps, -1);
  assert.equal(afterSix.legalMoves[0].toSteps, 0);
});

test('3. Rolling a 6 grants another turn after executing the move', () => {
  let state = createInitialGameState({ mode: 'local', players: twoPlayers });
  state = commitDiceRoll(state, 6);
  state = executeTokenMove(state, 'red-0');

  // Red token 0 is now at step 0, and activePlayerIndex is still 0 (Red)
  assert.equal(state.players[0].tokens[0].steps, 0);
  assert.equal(state.activePlayerIndex, 0);
  assert.equal(state.turnPhase, 'WAITING_FOR_ROLL');
  assert.equal(state.consecutiveSixes, 1);
});

test('4. Capturing an opponent on a non-safe square sends them back to yard (-1) and grants bonus roll', () => {
  let state = createInitialGameState({ mode: 'local', players: twoPlayers });
  // Place Red at step 28 (global index 28) and Yellow at step 5 (global index (26+5)%52 = 31)
  state.players[0].tokens[0].steps = 28;
  state.players[1].tokens[0].steps = 5;

  // Verify global index 31 is not a safe square
  assert.equal(isSafeTrackIndex(31, state.rules), false);

  // Red rolls a 3 -> moves from step 28 to step 31 (global index 31), capturing Yellow's token!
  state = commitDiceRoll(state, 3);
  const move = state.legalMoves.find((m) => m.tokenId === 'red-0');
  assert.ok(move);
  assert.deepEqual(move.capturesTokenIds, ['yellow-0']);

  state = executeTokenMove(state, 'red-0');
  // Red is now at step 31, Yellow token 0 is sent back to yard (-1), Red gets bonus roll!
  assert.equal(state.players[0].tokens[0].steps, 31);
  assert.equal(state.players[1].tokens[0].steps, -1);
  assert.equal(state.players[0].capturesMade, 1);
  assert.equal(state.activePlayerIndex, 0);
  assert.equal(state.turnPhase, 'WAITING_FOR_ROLL');
});

test('5. Safe-square protection prevents captures on start squares and star squares', () => {
  let state = createInitialGameState({ mode: 'local', players: twoPlayers });
  // Yellow is at step 0 (global index 26, Yellow's start square - safe!)
  // Place Red at step 22 (global index 22) and roll 4 -> lands on global index 26
  state.players[0].tokens[0].steps = 22;
  state.players[1].tokens[0].steps = 0;

  state = commitDiceRoll(state, 4);
  const move = state.legalMoves.find((m) => m.tokenId === 'red-0')!;
  assert.equal(move.reachesSafeSquare, true);
  assert.equal(move.capturesTokenIds.length, 0);

  state = executeTokenMove(state, 'red-0');
  // Both tokens peacefully coexist on global index 26
  assert.equal(state.players[0].tokens[0].steps, 26);
  assert.equal(state.players[1].tokens[0].steps, 0);
});

test('6. Moving into the home path (51..55) and exact-roll finishing (56)', () => {
  let state = createInitialGameState({ mode: 'local', players: twoPlayers });
  // Place Red token 0 at step 53 (3 steps away from FINISH_STEP = 56)
  state.players[0].tokens[0].steps = 53;

  // Rolling a 4 exceeds 56 -> illegal move!
  const afterFour = commitDiceRoll(state, 4);
  assert.equal(afterFour.legalMoves.length, 0);
  assert.equal(afterFour.turnPhase, 'TURN_TRANSITION');

  // Rolling an exact 3 reaches FINISH_STEP (56)
  const afterThree = commitDiceRoll(state, 3);
  assert.equal(afterThree.legalMoves.length, 1);
  assert.equal(afterThree.legalMoves[0].toSteps, FINISH_STEP);
  assert.equal(afterThree.legalMoves[0].reachesHome, true);
});

test('7. Players with no legal moves transition cleanly to the next player', () => {
  let state = createInitialGameState({ mode: 'local', players: twoPlayers });
  state = commitDiceRoll(state, 2); // No legal moves from yard
  assert.equal(state.turnPhase, 'TURN_TRANSITION');

  state = completeTurnTransition(state);
  assert.equal(state.activePlayerIndex, 1); // Switched to Yellow
  assert.equal(state.turnPhase, 'WAITING_FOR_ROLL');
});

test('8. Consecutive sixes rule forfeits turn on 3rd six when maxConsecutiveSixes is 3', () => {
  let state = createInitialGameState({
    mode: 'local',
    players: twoPlayers,
    rules: { ...DEFAULT_HOUSE_RULES, maxConsecutiveSixes: 3 },
  });

  // First 6
  state = commitDiceRoll(state, 6);
  state = executeTokenMove(state, 'red-0');
  assert.equal(state.consecutiveSixes, 1);
  assert.equal(state.activePlayerIndex, 0);

  // Second 6
  state = commitDiceRoll(state, 6);
  state = executeTokenMove(state, 'red-0');
  assert.equal(state.consecutiveSixes, 2);
  assert.equal(state.activePlayerIndex, 0);

  // Third consecutive 6 -> forfeits turn!
  state = commitDiceRoll(state, 6);
  assert.equal(state.turnPhase, 'TURN_TRANSITION');
  assert.equal(state.legalMoves.length, 0);

  state = completeTurnTransition(state);
  assert.equal(state.activePlayerIndex, 1);
  assert.equal(state.consecutiveSixes, 0);
});

test('9. Winning condition triggers when all 4 tokens of a player reach FINISH_STEP (56)', () => {
  let state = createInitialGameState({ mode: 'local', players: twoPlayers });
  state.players[0].tokens[0].steps = FINISH_STEP;
  state.players[0].tokens[1].steps = FINISH_STEP;
  state.players[0].tokens[2].steps = FINISH_STEP;
  state.players[0].tokens[3].steps = 54; // Needs 2 to finish

  state = commitDiceRoll(state, 2);
  state = executeTokenMove(state, 'red-3');

  assert.equal(state.turnPhase, 'GAME_OVER');
  assert.equal(state.winner, 'red');
  assert.equal(state.players[0].hasFinished, true);
});

test('10. AI strategy (Easy, Medium, Hard) always selects strictly from legal moves and prioritizes captures/safety', () => {
  let state = createInitialGameState({ mode: 'ai', players: fourPlayers });
  // Give Blue (Hard AI) two tokens: token 0 can capture Red at step 4, token 1 just moves normally
  state.activePlayerIndex = 3; // Blue
  state.players[3].tokens[0].steps = 0; // Blue start = global 39
  state.players[3].tokens[1].steps = 10; // Global 49
  // Place Red at global index 43 (which is Blue step 4)
  state.players[0].tokens[0].steps = 43;

  const legalMoves = getLegalMovesForPlayer(
    'blue',
    4,
    state.players,
    state.rules
  );
  assert.equal(legalMoves.length, 2);

  for (const diff of ['easy', 'medium', 'hard'] as const) {
    const chosen = chooseAIMove(
      legalMoves,
      diff,
      'blue',
      state.players,
      state.rules,
      () => 0.5
    );
    assert.ok(chosen);
    assert.ok(legalMoves.some((m) => m.tokenId === chosen.tokenId));
    if (diff === 'medium' || diff === 'hard') {
      // Medium and Hard AI must pick blue-0 because it captures Red's advanced token!
      assert.equal(chosen.tokenId, 'blue-0');
    }
  }
});

test('11. Multiple tokens sharing the same square are grouped and receive distinct stack offsets', () => {
  const state = createInitialGameState({ mode: 'local', players: twoPlayers });
  state.players[0].tokens[0].steps = 0; // Red start (global 0)
  state.players[0].tokens[1].steps = 0; // Red start (global 0)

  const grouped = groupTokensByCell([
    ...state.players[0].tokens,
    ...state.players[1].tokens,
  ]);
  const trackZeroTokens = grouped.get('track-0') || [];
  assert.equal(trackZeroTokens.length, 2);

  const offset0 = getStackOffset(0, 2);
  const offset1 = getStackOffset(1, 2);
  assert.notEqual(offset0.dx, offset1.dx);
  assert.notEqual(offset0.dy, offset1.dy);
});

test('12. Duplicate or out-of-phase moves are prevented by the game engine', () => {
  let state = createInitialGameState({ mode: 'local', players: twoPlayers });
  // Cannot execute a token move while WAITING_FOR_ROLL
  const unchanged = executeTokenMove(state, 'red-0');
  assert.equal(unchanged, state);

  // Roll 6 and move once
  state = commitDiceRoll(state, 6);
  state = executeTokenMove(state, 'red-0');
  assert.equal(state.turnPhase, 'WAITING_FOR_ROLL');

  // Attempting to execute the same move again immediately is ignored
  const afterDuplicate = executeTokenMove(state, 'red-0');
  assert.equal(afterDuplicate.players[0].tokens[0].steps, 0);
});

test('13. Starter avatars are always unlocked by default for new profiles', () => {
  const profile: UserProfile = {
    nickname: 'Rookie',
    avatar: 'crown',
    experiencePoints: 0,
    wins: 0,
  };
  const stats: PlayerStats = { ...DEFAULT_STATS };

  const starterAvatars = AVATAR_OPTIONS.filter((a) => a.category === 'starter');
  assert.equal(starterAvatars.length, 8);

  for (const avatar of starterAvatars) {
    assert.equal(isAvatarUnlocked(avatar, profile, stats), true);
    const progress = getAvatarUnlockProgress(avatar, profile, stats);
    assert.equal(progress.unlocked, true);
    assert.equal(progress.progressPercent, 100);
  }
});

test('14. Progression avatars are locked until player statistics meet specified thresholds', () => {
  const noviceProfile: UserProfile = {
    nickname: 'Novice',
    avatar: 'crown',
    experiencePoints: 50,
    wins: 0,
  };
  const noviceStats: PlayerStats = {
    ...DEFAULT_STATS,
    wins: 0,
    tokensCaptured: 2,
    longestWinStreak: 0,
  };

  // Gladiator requires 1 win
  const gladiator = AVATAR_OPTIONS.find((a) => a.id === 'swords')!;
  assert.ok(gladiator);
  assert.equal(isAvatarUnlocked(gladiator, noviceProfile, noviceStats), false);
  const progGladiator = getAvatarUnlockProgress(gladiator, noviceProfile, noviceStats);
  assert.equal(progGladiator.unlocked, false);
  assert.equal(progGladiator.current, 0);
  assert.equal(progGladiator.target, 1);

  // Sharpshooter requires 5 captures
  const sharpshooter = AVATAR_OPTIONS.find((a) => a.id === 'target')!;
  assert.equal(isAvatarUnlocked(sharpshooter, noviceProfile, noviceStats), false);
  assert.equal(getAvatarUnlockProgress(sharpshooter, noviceProfile, noviceStats).current, 2);

  // Now simulate a victorious veteran profile
  const veteranProfile: UserProfile = {
    nickname: 'Veteran',
    avatar: 'crown',
    experiencePoints: 1200,
    wins: 6,
  };
  const veteranStats: PlayerStats = {
    ...DEFAULT_STATS,
    wins: 6,
    tokensCaptured: 15,
    longestWinStreak: 3,
  };

  // Both should now be unlocked!
  assert.equal(isAvatarUnlocked(gladiator, veteranProfile, veteranStats), true);
  assert.equal(isAvatarUnlocked(sharpshooter, veteranProfile, veteranStats), true);

  // Mythic Dragon (12 captures) & Grand Champion (5 wins) & Immortal Phoenix (1000 XP) should all be unlocked
  const dragon = AVATAR_OPTIONS.find((a) => a.id === 'dragon')!;
  const champion = AVATAR_OPTIONS.find((a) => a.id === 'trophy')!;
  const phoenix = AVATAR_OPTIONS.find((a) => a.id === 'phoenix')!;
  assert.equal(isAvatarUnlocked(dragon, veteranProfile, veteranStats), true);
  assert.equal(isAvatarUnlocked(champion, veteranProfile, veteranStats), true);
  assert.equal(isAvatarUnlocked(phoenix, veteranProfile, veteranStats), true);
});

test('15. XP calculation awards victory, completion, captures, and home tokens correctly', () => {
  // Loss with 1 capture and 1 token home: 50 base + 20 + 25 = 95 XP
  const lossXp = calculateMatchEarnedXP({ won: false, captures: 1, tokensHome: 1 });
  assert.equal(lossXp, 95);

  // Win with 3 captures and 4 tokens home: 50 base + 100 win bonus + 3*20 + 4*25 = 310 XP
  const winXp = calculateMatchEarnedXP({ won: true, captures: 3, tokensHome: 4 });
  assert.equal(winXp, 310);

  // Level calculations
  const lvl1 = calculatePlayerLevel(0);
  assert.equal(lvl1.level, 1);
  assert.equal(lvl1.currentLevelXp, 0);
  assert.equal(lvl1.progressPercent, 0);

  const lvl2 = calculatePlayerLevel(300); // 250 XP per level -> Level 2, 50 XP into level
  assert.equal(lvl2.level, 2);
  assert.equal(lvl2.currentLevelXp, 50);
  assert.equal(lvl2.nextLevelXp, 250);
  assert.equal(lvl2.progressPercent, 20);
});

test('16. Dice design catalog provides 6 distinct styles with custom pip shapes and safe fallback', () => {
  assert.equal(DICE_STYLE_OPTIONS.length, 6);
  const uniqueIds = new Set(DICE_STYLE_OPTIONS.map((d) => d.id));
  assert.equal(uniqueIds.size, 6);

  const runic = getDiceStyleOption('celestial_runic');
  assert.equal(runic.label, 'Astral Runic');
  assert.equal(runic.pipShape, 'roman');

  const obsidian = getDiceStyleOption('obsidian_neon');
  assert.equal(obsidian.pipShape, 'hexagon');

  // Fallback to classic_ivory when undefined
  const fallback = getDiceStyleOption(undefined);
  assert.equal(fallback.id, 'classic_ivory');
});

test('17. Local Multiplayer supports mixed Human and AI Bot rosters with individual bot difficulties', () => {
  const hostProfile: UserProfile = {
    nickname: 'Commander',
    avatar: 'crown',
    experiencePoints: 250,
    wins: 2,
  };

  const mixedRoster = buildSetupPlayerRoster({
    playerCount: 4,
    seatTypes: {
      red: 'human',
      green: 'human',
      yellow: 'ai',
      blue: 'ai',
    },
    botDifficulties: {
      red: 'medium',
      green: 'medium',
      yellow: 'hard',
      blue: 'easy',
    },
    customNames: {
      red: 'Commander',
      green: 'Player 2',
      yellow: '', // Should fallback to Solar Bot
      blue: 'Cyber Bot',
    },
    profile: hostProfile,
  });

  assert.equal(mixedRoster.length, 4);
  assert.equal(mixedRoster[0].type, 'human');
  assert.equal(mixedRoster[0].name, 'Commander');
  assert.equal(mixedRoster[0].aiDifficulty, undefined);

  assert.equal(mixedRoster[1].type, 'human');
  assert.equal(mixedRoster[1].name, 'Player 2');
  assert.equal(mixedRoster[1].aiDifficulty, undefined);

  assert.equal(mixedRoster[2].type, 'ai');
  assert.equal(mixedRoster[2].name, 'Solar Bot');
  assert.equal(mixedRoster[2].aiDifficulty, 'hard');

  assert.equal(mixedRoster[3].type, 'ai');
  assert.equal(mixedRoster[3].name, 'Cyber Bot');
  assert.equal(mixedRoster[3].aiDifficulty, 'easy');

  assert.equal(getDefaultSeatName('green', 1, 'ai'), 'Emerald Bot');
  assert.equal(getDefaultSeatName('green', 1, 'human'), 'Player 2');

  // Verify local multiplayer game state initializes and runs AI moves properly for AI seats
  let localState = createInitialGameState({
    mode: 'local',
    players: mixedRoster,
  });
  localState.activePlayerIndex = 2; // Yellow AI Bot (Hard)
  localState = commitDiceRoll(localState, 6);
  assert.equal(localState.turnPhase, 'SELECTING_TOKEN');
  assert.equal(localState.legalMoves.length, 4);

  const aiMove = chooseAIMove(
    localState.legalMoves,
    localState.players[2].aiDifficulty || 'medium',
    'yellow',
    localState.players,
    localState.rules
  );
  assert.ok(aiMove);
  localState = executeTokenMove(localState, aiMove.tokenId);
  assert.equal(localState.players[2].tokens[aiMove.tokenIndex].steps, 0);
});

test('18. Mobile haptic feedback intensity scales duration accurately across off, light, medium, and heavy settings', () => {
  // Pure duration helper
  assert.equal(computeHapticDuration(20, 'off'), 0);
  assert.equal(computeHapticDuration(20, 'light'), 10);
  assert.equal(computeHapticDuration(20, 'medium'), 20);
  assert.equal(computeHapticDuration(20, 'heavy'), 36);

  // SoundManager integration (independent of soundEnabled)
  soundManager.configure(false, false, 'off');
  assert.equal(soundManager.getHapticIntensity(), 'off');
  assert.equal(soundManager.triggerHaptic(30), 0);

  soundManager.configure(false, false, 'light');
  assert.equal(soundManager.getHapticIntensity(), 'light');
  assert.equal(soundManager.triggerHaptic(30), 15);

  soundManager.configure(true, false, 'medium');
  assert.equal(soundManager.triggerHaptic(30), 30);

  soundManager.configure(true, false, 'heavy');
  assert.equal(soundManager.triggerHaptic(30), 54);
});

test('19. In 3+ player games, the match continues after 1st place finishes until 2nd, 3rd, and 4th places are decided', () => {
  let state = createInitialGameState({ mode: 'local', players: fourPlayers });

  // Prepare Red (idx 0), Green (idx 1), and Yellow (idx 2) so each has 3 tokens home and 1 token at step 55 (1 step from FINISH_STEP 56)
  for (const idx of [0, 1, 2]) {
    state.players[idx].tokens[0].steps = FINISH_STEP;
    state.players[idx].tokens[1].steps = FINISH_STEP;
    state.players[idx].tokens[2].steps = FINISH_STEP;
    state.players[idx].tokens[3].steps = 55;
  }
  // Blue (idx 3) has token 0 at step 10
  state.players[3].tokens[0].steps = 10;

  // 1. Red rolls 1 and finishes all 4 tokens -> becomes 1st Place, match MUST continue!
  state = commitDiceRoll(state, 1);
  state = executeTokenMove(state, 'red-3');

  assert.equal(state.players[0].hasFinished, true);
  assert.equal(state.players[0].finishRank, 1);
  assert.deepEqual(state.rankings, ['red']);
  assert.equal(state.winner, 'red');
  assert.equal(state.turnPhase, 'WAITING_FOR_ROLL'); // Not GAME_OVER!
  assert.equal(state.activePlayerIndex, 1); // Advances to Green

  // 2. Green rolls 1 and finishes all 4 tokens -> becomes 2nd Place, match MUST still continue for Yellow & Blue!
  state = commitDiceRoll(state, 1);
  state = executeTokenMove(state, 'green-3');

  assert.equal(state.players[1].hasFinished, true);
  assert.equal(state.players[1].finishRank, 2);
  assert.deepEqual(state.rankings, ['red', 'green']);
  assert.equal(state.turnPhase, 'WAITING_FOR_ROLL'); // Still not GAME_OVER!
  assert.equal(state.activePlayerIndex, 2); // Advances to Yellow

  // 3. Yellow rolls 2 (no legal move for token at 55) -> skips turn to Blue (idx 3), then Blue moves and skips finished Red & Green back to Yellow (idx 2)!
  state = commitDiceRoll(state, 2);
  assert.equal(state.turnPhase, 'TURN_TRANSITION');
  state = completeTurnTransition(state);
  assert.equal(state.activePlayerIndex, 3); // Blue's turn

  state = commitDiceRoll(state, 3);
  state = executeTokenMove(state, 'blue-0');
  // Must skip finished Red (0) and Green (1) and land on Yellow (2)!
  assert.equal(state.activePlayerIndex, 2);

  // 4. Yellow rolls 1 and finishes all 4 tokens -> Yellow gets 3rd Place, Blue automatically gets 4th Place, and GAME_OVER triggers!
  state = commitDiceRoll(state, 1);
  state = executeTokenMove(state, 'yellow-3');

  assert.equal(state.turnPhase, 'GAME_OVER');
  assert.equal(state.winner, 'red');
  assert.deepEqual(state.rankings, ['red', 'green', 'yellow', 'blue']);
  assert.equal(state.players[0].finishRank, 1);
  assert.equal(state.players[1].finishRank, 2);
  assert.equal(state.players[2].finishRank, 3);
  assert.equal(state.players[3].finishRank, 4);
});

test('20. Board theme catalog provides 6 distinct board designs each paired with its own unique 3D token style', () => {
  assert.equal(BOARD_THEME_OPTIONS.length, 6);

  const uniqueThemeIds = new Set(BOARD_THEME_OPTIONS.map((b) => b.id));
  const uniqueTokenStyles = new Set(BOARD_THEME_OPTIONS.map((b) => b.tokenStyle));
  assert.equal(uniqueThemeIds.size, 6);
  assert.equal(uniqueTokenStyles.size, 6);

  assert.equal(getBoardThemeOption('cosmic_galaxy').tokenStyle, 'cosmic_pawn');
  assert.equal(getBoardThemeOption('royal_classic').tokenStyle, 'royal_spires');
  assert.equal(getBoardThemeOption('elemental_realms').tokenStyle, 'elemental_totem');
  assert.equal(getBoardThemeOption('neon_tech').tokenStyle, 'cyber_beacon');
  assert.equal(getBoardThemeOption('nature_forest').tokenStyle, 'woodland_acorn');
  assert.equal(getBoardThemeOption('minimal_3d').tokenStyle, 'minimal_pawn');

  // Legacy theme values gracefully map to their corresponding signature design
  assert.equal(getBoardThemeOption('royal_slate').id, 'cosmic_galaxy');
  assert.equal(getBoardThemeOption('classic_parchment').id, 'royal_classic');
  assert.equal(getBoardThemeOption('midnight_emerald').id, 'nature_forest');
});

test('21. Turn lighting config computes distinct quadrant positions, SVG centers, and color tokens for each active player turn', () => {
  const redLight = getTurnLightingConfig('red');
  const greenLight = getTurnLightingConfig('green');
  const yellowLight = getTurnLightingConfig('yellow');
  const blueLight = getTurnLightingConfig('blue');

  assert.deepEqual(redLight.quadrantPercent, { x: 20, y: 20 });
  assert.deepEqual(greenLight.quadrantPercent, { x: 80, y: 20 });
  assert.deepEqual(yellowLight.quadrantPercent, { x: 80, y: 80 });
  assert.deepEqual(blueLight.quadrantPercent, { x: 20, y: 80 });

  assert.deepEqual(redLight.svgCenter, { cx: 300, cy: 300 });
  assert.deepEqual(greenLight.svgCenter, { cx: 1200, cy: 300 });
  assert.deepEqual(yellowLight.svgCenter, { cx: 1200, cy: 1200 });
  assert.deepEqual(blueLight.svgCenter, { cx: 300, cy: 1200 });

  assert.equal(redLight.primaryHex, '#EF4444');
  assert.equal(greenLight.primaryHex, '#10B981');
  assert.equal(yellowLight.primaryHex, '#F59E0B');
  assert.equal(blueLight.primaryHex, '#3B82F6');
});

test('22. Every board theme has a unique tile geometry, surface pattern, safe-square emblem, home-lane motif, and spawn room architecture', () => {
  const specs = BOARD_THEME_OPTIONS.map((t) => getThemeTileSpec(t.id));
  assert.equal(specs.length, 6);

  const uniqueGeometries = new Set(specs.map((s) => s.tileGeometry));
  const uniquePatterns = new Set(specs.map((s) => s.surfacePattern));
  const uniqueSafeEmblems = new Set(specs.map((s) => s.safeSquareEmblem));
  const uniqueHomeMotifs = new Set(specs.map((s) => s.homeLaneMotif));
  const uniqueSpawnArchitectures = new Set(
    specs.map((s) => s.spawnRoomArchitecture)
  );
  const uniqueSocketStyles = new Set(specs.map((s) => s.socketStyle));
  const uniqueRedTitles = new Set(specs.map((s) => s.territoryTitles.red));

  assert.equal(uniqueGeometries.size, 6);
  assert.equal(uniquePatterns.size, 6);
  assert.equal(uniqueSafeEmblems.size, 6);
  assert.equal(uniqueHomeMotifs.size, 6);
  assert.equal(uniqueSpawnArchitectures.size, 6);
  assert.equal(uniqueSocketStyles.size, 6);
  assert.equal(uniqueRedTitles.size, 6);

  assert.equal(getThemeTileSpec('cosmic_galaxy').tileGeometry, 'faceted_crystal');
  assert.equal(getThemeTileSpec('cosmic_galaxy').spawnRoomArchitecture, 'orbital_reactor');
  assert.equal(getThemeTileSpec('royal_classic').tileGeometry, 'gilded_marble');
  assert.equal(getThemeTileSpec('royal_classic').spawnRoomArchitecture, 'imperial_citadel');
  assert.equal(getThemeTileSpec('elemental_realms').tileGeometry, 'chiseled_runestone');
  assert.equal(getThemeTileSpec('elemental_realms').spawnRoomArchitecture, 'elemental_sanctuary');
  assert.equal(getThemeTileSpec('neon_tech').tileGeometry, 'cyber_octagon');
  assert.equal(getThemeTileSpec('neon_tech').spawnRoomArchitecture, 'cyber_hex_bay');
  assert.equal(getThemeTileSpec('nature_forest').tileGeometry, 'carved_timber');
  assert.equal(getThemeTileSpec('nature_forest').spawnRoomArchitecture, 'woodland_glade');
  assert.equal(getThemeTileSpec('minimal_3d').tileGeometry, 'studio_pillow');
  assert.equal(getThemeTileSpec('minimal_3d').spawnRoomArchitecture, 'studio_podium');
});

test('23. Move indicator builder maps each playable token to its token number (1..4), trajectory path, and staggered destination slots', () => {
  let state = createInitialGameState({ mode: 'local', players: twoPlayers });

  // Case A: All 4 tokens in yard and player rolls a 6 -> all 4 target step 0 (row 6, col 1)
  state = commitDiceRoll(state, 6);
  const yardIndicators = buildMoveIndicators(state.legalMoves, 'red');
  assert.equal(yardIndicators.length, 4);

  for (let i = 0; i < 4; i++) {
    assert.equal(yardIndicators[i].tokenNumber, i + 1);
    assert.equal(yardIndicators[i].fromSteps, -1);
    assert.equal(yardIndicators[i].toSteps, 0);
    assert.deepEqual(yardIndicators[i].toCoord, { row: 6, col: 1 });
    assert.equal(yardIndicators[i].sharedTargetCount, 4);
    assert.equal(yardIndicators[i].sharedTargetIndex, i);
  }

  // Case B: Distinct tokens on track with different destinations (normal move, capture move, home finish)
  let trackState = createInitialGameState({ mode: 'local', players: twoPlayers });
  trackState.players[0].tokens[0].steps = 2; // Token #1 at step 2
  trackState.players[0].tokens[1].steps = 28; // Token #2 at step 28 -> +3 captures Yellow at global 31 (Yellow step 5)
  trackState.players[0].tokens[2].steps = 53; // Token #3 at step 53 -> +3 reaches FINISH_STEP (56)
  trackState.players[1].tokens[0].steps = 5; // Yellow at global 31

  trackState = commitDiceRoll(trackState, 3);
  const trackIndicators = buildMoveIndicators(trackState.legalMoves, 'red');
  assert.equal(trackIndicators.length, 3);

  const ind1 = trackIndicators.find((m) => m.tokenNumber === 1)!;
  assert.equal(ind1.fromSteps, 2);
  assert.equal(ind1.toSteps, 5);
  assert.equal(ind1.pathCoords.length, 3); // steps 3, 4, 5
  assert.equal(ind1.capturesOpponent, false);
  assert.equal(ind1.reachesHome, false);
  assert.equal(ind1.sharedTargetCount, 1);

  const ind2 = trackIndicators.find((m) => m.tokenNumber === 2)!;
  assert.equal(ind2.capturesOpponent, true);

  const ind3 = trackIndicators.find((m) => m.tokenNumber === 3)!;
  assert.equal(ind3.reachesHome, true);
  assert.equal(ind3.toSteps, FINISH_STEP);
});

test('24. Every 3D dice style defines a unique texture map, model geometry, animation profile, and roll physics transform', () => {
  assert.equal(DICE_STYLE_OPTIONS.length, 6);

  const uniqueTextures = new Set(DICE_STYLE_OPTIONS.map((d) => d.texturePattern));
  const uniqueAnimations = new Set(
    DICE_STYLE_OPTIONS.map((d) => d.animationProfile)
  );
  const uniqueModels = new Set(DICE_STYLE_OPTIONS.map((d) => d.modelGeometry));
  const uniqueIdleClasses = new Set(
    DICE_STYLE_OPTIONS.map((d) => d.rollPhysics.idleAnimationClass)
  );

  assert.equal(uniqueTextures.size, 6);
  assert.equal(uniqueAnimations.size, 6);
  assert.equal(uniqueModels.size, 6);
  assert.equal(uniqueIdleClasses.size, 6);

  assert.equal(getDiceStyleOption('classic_ivory').texturePattern, 'ivory_grain');
  assert.equal(getDiceStyleOption('royal_gold').texturePattern, 'brushed_bullion');
  assert.equal(getDiceStyleOption('obsidian_neon').texturePattern, 'carbon_circuit');
  assert.equal(getDiceStyleOption('emerald_jade').texturePattern, 'veined_jade');
  assert.equal(getDiceStyleOption('crimson_ruby').texturePattern, 'faceted_gemstone');
  assert.equal(getDiceStyleOption('celestial_runic').texturePattern, 'nebula_astrolabe');

  // Verify style-specific 3D roll transform calculations
  const ivoryRoll = computeDiceRollTransform({
    diceStyle: 'classic_ivory',
    face: 6,
    rollCount: 1,
    accumulatedSpin: { x: 720, y: 1080, z: -360 },
    isRolling: true,
    isHovered: false,
    size: 54,
    reducedMotion: false,
  });

  const cyberRoll = computeDiceRollTransform({
    diceStyle: 'obsidian_neon',
    face: 6,
    rollCount: 1,
    accumulatedSpin: { x: 1800, y: 2160, z: -720 },
    isRolling: true,
    isHovered: false,
    size: 54,
    reducedMotion: false,
  });

  assert.notEqual(ivoryRoll.cubeTransform, cyberRoll.cubeTransform);
  assert.notEqual(ivoryRoll.transitionStyle, cyberRoll.transitionStyle);
  assert.notEqual(ivoryRoll.borderRadiusPx, cyberRoll.borderRadiusPx);
  assert.ok(cyberRoll.nextSpinIncrement.x > ivoryRoll.nextSpinIncrement.x);
  assert.ok(cyberRoll.nextSpinIncrement.y > ivoryRoll.nextSpinIncrement.y);
});




