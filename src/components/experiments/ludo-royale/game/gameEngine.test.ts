import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseAIMove, chooseAITurnDecision } from './aiStrategy';
import {
  buildMoveIndicators,
  getGlobalTrackIndex,
  getStackOffset,
  getThemeTileSpec,
  getTokenGridCoord,
  getTurnLightingConfig,
  groupTokensByCell,
  HEXAGON_BOARD_GEOMETRY,
  isSafeTrackIndex,
  MAIN_TRACK_COORDS,
  PENTAGON_BOARD_GEOMETRY,
} from './boardLayout';
import {
  AVATAR_OPTIONS,
  BOARD_THEME_OPTIONS,
  buildCosmoIdleCelestialSpecs,
  buildCosmoRollingSupernovaSpecs,
  buildElectroBodyPulseSpecs,
  buildElectroCircularWaveRings,
  buildElectroIdleSparkSpecs,
  buildElectroRollingPulseSpecs,
  buildLavaDropSplashSpec,
  buildLavaSteamVentSpecs,
  buildTesseractIdleEnergyPulses,
  buildTesseractWarpFaceSpecs,
  computeDiceRollTransform,
  computeLavaThermalState,
  computeTesseractWarpPhase,
  createVictoryConfettiBurst,
  DEFAULT_HOUSE_RULES,
  DEFAULT_STATS,
  DICE_STYLE_OPTIONS,
  FINISH_STEP,
  getBoardThemeOption,
  getDiceStyleOption,
  getVictoryConfettiPalette,
  HOME_PATH_START_STEP,
  LAVA_COOLING_TIMEOUT_MS,
  LAVA_DROP_SPLASH_DURATION_MS,
  MAX_TRACK_STEPS,
  PLAYER_COLORS,
  START_TRACK_INDEX,
  stepVictoryConfettiParticles,
} from './constants';
import {
  breakTokenPair,
  commitDiceRoll,
  completeTurnTransition,
  createInitialGameState,
  executeTokenMove,
  formTokenPair,
} from './gameEngine';
import { PlayerConfig, PlayerStats, UserProfile } from './gameTypes';
import {
  canBreakPairAtPosition,
  getFormablePairOptionsForPlayer,
  getLegalMovesForPlayer,
  reconcileTokenPairs,
} from './legalMoves';
import {
  countConnectedHumanPlayers,
  createMatchedOnlineRoom,
  createPrivateLobbyRoom,
  enqueueMatchmakingPlayer,
  MatchmakingQueueEntry,
  removeMatchmakingPlayer,
  resolvePlayerDeparture,
} from './multiplayerLogic';
import {
  calculateMatchEarnedXP,
  calculatePlayerLevel,
  getAvatarUnlockProgress,
  isAvatarUnlocked,
} from './progression';
import {
  buildSetupPlayerRoster,
  getColorsForPlayerCount,
  getDefaultSeatName,
} from './rules';
import {
  computeHapticDuration,
  COSMO_CUBE_IDLE_AUDIO_ASSET,
  COSMO_CUBE_ROLL_AUDIO_ASSET,
  ELECTRO_CUBE_IDLE_AUDIO_ASSET,
  ELECTRO_CUBE_ROLL_AUDIO_ASSET,
  getDiceAudioIdentity,
  getDiceIdleAudioSpec,
  LAVA_CUBE_IDLE_AUDIO_ASSET,
  LAVA_CUBE_ROLL_AUDIO_ASSET,
  soundManager,
  TESSERACT_CUBE_IDLE_AUDIO_ASSET,
  TESSERACT_CUBE_ROLL_AUDIO_ASSET,
} from '../services/sound';

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

test('8. Three consecutive sixes triggers complete rollback of the sequence and gives the same player a fresh roll', () => {
  let state = createInitialGameState({
    mode: 'local',
    players: twoPlayers,
    rules: { ...DEFAULT_HOUSE_RULES, maxConsecutiveSixes: 3 },
  });

  // First 6 -> deploy red-0 to step 0
  state = commitDiceRoll(state, 6);
  state = executeTokenMove(state, 'red-0');
  assert.equal(state.consecutiveSixes, 1);
  assert.equal(state.players[0].tokens[0].steps, 0);
  assert.equal(state.activePlayerIndex, 0);

  // Second 6 -> move red-0 to step 6
  state = commitDiceRoll(state, 6);
  state = executeTokenMove(state, 'red-0');
  assert.equal(state.consecutiveSixes, 2);
  assert.equal(state.players[0].tokens[0].steps, 6);
  assert.equal(state.activePlayerIndex, 0);

  // Third consecutive 6 -> complete rollback to pre-first-six state!
  state = commitDiceRoll(state, 6);
  assert.equal(state.players[0].tokens[0].steps, -1); // Reverted back to Home Yard!
  assert.equal(state.consecutiveSixes, 0);
  assert.equal(state.activePlayerIndex, 0); // Same player stays active!
  assert.equal(state.turnPhase, 'WAITING_FOR_ROLL'); // Fresh roll opportunity!
  assert.equal(
    state.lastRollbackNotice?.message,
    'THREE SIXES! All moves from this sequence have been cancelled.'
  );
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

test('16. Dice design catalog provides 10 distinct styles (6 classic + 4 VOIDNOD 2D animated cubes) with custom pip shapes and safe fallback', () => {
  assert.equal(DICE_STYLE_OPTIONS.length, 10);
  const uniqueIds = new Set(DICE_STYLE_OPTIONS.map((d) => d.id));
  assert.equal(uniqueIds.size, 10);

  const runic = getDiceStyleOption('celestial_runic');
  assert.equal(runic.label, 'Astral Runic');
  assert.equal(runic.pipShape, 'roman');

  const obsidian = getDiceStyleOption('obsidian_neon');
  assert.equal(obsidian.pipShape, 'hexagon');

  // Verify the 4 new VOIDNOD 2D animated dice skins
  const lava = getDiceStyleOption('lava_cube');
  assert.equal(lava.label, 'Lava Cube');
  assert.equal(lava.pipShape, 'magma');
  assert.equal(lava.isPremium2D, true);

  const electro = getDiceStyleOption('electro_cube');
  assert.equal(electro.label, 'Electro Cube');
  assert.equal(electro.pipShape, 'plasma');
  assert.equal(electro.isPremium2D, true);

  const tesseract = getDiceStyleOption('tesseract_cube');
  assert.equal(tesseract.label, 'Tesseract Cube');
  assert.equal(tesseract.pipShape, 'tesseract');
  assert.equal(tesseract.isPremium2D, true);

  const cosmo = getDiceStyleOption('cosmo_cube');
  assert.equal(cosmo.label, 'Cosmo Cube');
  assert.equal(cosmo.pipShape, 'cosmos');
  assert.equal(cosmo.isPremium2D, true);

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
      purple: 'ai',
      orange: 'ai',
    },
    botDifficulties: {
      red: 'medium',
      green: 'medium',
      yellow: 'hard',
      blue: 'easy',
      purple: 'medium',
      orange: 'medium',
    },
    customNames: {
      red: 'Commander',
      green: 'Player 2',
      yellow: '', // Should fallback to Solar Bot
      blue: 'Cyber Bot',
      purple: 'Amethyst Bot',
      orange: 'Blaze Bot',
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

test('24. Every dice style defines a unique texture map, model geometry, animation profile, and roll physics transform', () => {
  assert.equal(DICE_STYLE_OPTIONS.length, 10);

  const uniqueTextures = new Set(DICE_STYLE_OPTIONS.map((d) => d.texturePattern));
  const uniqueAnimations = new Set(
    DICE_STYLE_OPTIONS.map((d) => d.animationProfile)
  );
  const uniqueModels = new Set(DICE_STYLE_OPTIONS.map((d) => d.modelGeometry));
  const uniqueIdleClasses = new Set(
    DICE_STYLE_OPTIONS.map((d) => d.rollPhysics.idleAnimationClass)
  );

  assert.equal(uniqueTextures.size, 10);
  assert.equal(uniqueAnimations.size, 10);
  assert.equal(uniqueModels.size, 10);
  assert.equal(uniqueIdleClasses.size, 10);

  assert.equal(getDiceStyleOption('classic_ivory').texturePattern, 'ivory_grain');
  assert.equal(getDiceStyleOption('royal_gold').texturePattern, 'brushed_bullion');
  assert.equal(getDiceStyleOption('obsidian_neon').texturePattern, 'carbon_circuit');
  assert.equal(getDiceStyleOption('emerald_jade').texturePattern, 'veined_jade');
  assert.equal(getDiceStyleOption('crimson_ruby').texturePattern, 'faceted_gemstone');
  assert.equal(getDiceStyleOption('celestial_runic').texturePattern, 'nebula_astrolabe');
  assert.equal(getDiceStyleOption('lava_cube').texturePattern, 'volcanic_magma');
  assert.equal(getDiceStyleOption('electro_cube').texturePattern, 'electric_plasma');
  assert.equal(getDiceStyleOption('tesseract_cube').texturePattern, 'dimensional_tesseract');
  assert.equal(getDiceStyleOption('cosmo_cube').texturePattern, 'voidnod_cosmos');

  // Verify style-specific roll transform calculations
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

test('25. VOIDNOD 2D animated dice skins each expose a unique rolling animation class, landing effect class, tagline, and audio identity while preserving classic dice', () => {
  const lavaOpt = getDiceStyleOption('lava_cube');
  const electroOpt = getDiceStyleOption('electro_cube');
  const tesseractOpt = getDiceStyleOption('tesseract_cube');
  const cosmoOpt = getDiceStyleOption('cosmo_cube');

  assert.equal(lavaOpt.tagline, 'FORGED IN VOLCANIC CORE');
  assert.equal(electroOpt.tagline, 'POWERED BY PURE ENERGY');
  assert.equal(tesseractOpt.tagline, 'BEYOND DIMENSIONS');
  assert.equal(cosmoOpt.tagline, 'A UNIVERSE IN YOUR HANDS');

  const uniqueRollClasses = new Set([
    lavaOpt.rollPhysics.rollingEffectClass,
    electroOpt.rollPhysics.rollingEffectClass,
    tesseractOpt.rollPhysics.rollingEffectClass,
    cosmoOpt.rollPhysics.rollingEffectClass,
  ]);
  const uniqueLandClasses = new Set([
    lavaOpt.rollPhysics.landingEffectClass,
    electroOpt.rollPhysics.landingEffectClass,
    tesseractOpt.rollPhysics.landingEffectClass,
    cosmoOpt.rollPhysics.landingEffectClass,
  ]);
  assert.equal(uniqueRollClasses.size, 4);
  assert.equal(uniqueLandClasses.size, 4);

  const lavaAudio = getDiceAudioIdentity('lava_cube');
  const electroAudio = getDiceAudioIdentity('electro_cube');
  const tesseractAudio = getDiceAudioIdentity('tesseract_cube');
  const cosmoAudio = getDiceAudioIdentity('cosmo_cube');
  const classicAudio = getDiceAudioIdentity('classic_ivory');

  assert.equal(lavaAudio.assetFolder, '/audio/ludo/lava/');
  assert.equal(electroAudio.assetFolder, '/audio/ludo/electro/');
  assert.equal(tesseractAudio.assetFolder, '/audio/ludo/tesseract/');
  assert.equal(cosmoAudio.assetFolder, '/audio/ludo/cosmo/');
  assert.equal(classicAudio.assetFolder, '/audio/ludo/classic/');

  const uniqueRollProfiles = new Set([
    lavaAudio.rollProfile,
    electroAudio.rollProfile,
    tesseractAudio.rollProfile,
    cosmoAudio.rollProfile,
    classicAudio.rollProfile,
  ]);
  const uniqueLandProfiles = new Set([
    lavaAudio.landProfile,
    electroAudio.landProfile,
    tesseractAudio.landProfile,
    cosmoAudio.landProfile,
    classicAudio.landProfile,
  ]);
  assert.equal(uniqueRollProfiles.size, 5);
  assert.equal(uniqueLandProfiles.size, 5);
});

test('26. Two-player matchmaking pairs 2 players and immediately terminates the entire match when either player leaves', () => {
  let queue: MatchmakingQueueEntry[] = [];

  const r1 = enqueueMatchmakingPlayer(queue, {
    id: 'plr-a',
    name: 'Player A',
    avatar: 'crown',
    targetPlayers: 2,
    joinedAt: 1000,
  });
  assert.equal(r1.matchedEntries, null);
  assert.equal(r1.bracketQueue.length, 1);
  queue = r1.remainingQueue;

  const r2 = enqueueMatchmakingPlayer(queue, {
    id: 'plr-b',
    name: 'Player B',
    avatar: 'knight',
    targetPlayers: 2,
    joinedAt: 1005,
  });
  assert.ok(r2.matchedEntries);
  assert.equal(r2.matchedEntries.length, 2);
  assert.equal(r2.remainingQueue.length, 0);

  const room = createMatchedOnlineRoom({
    roomCode: 'DUEL2P',
    matchedEntries: r2.matchedEntries,
    targetPlayers: 2,
  });
  assert.equal(room.status, 'playing');
  assert.equal(room.players.length, 2);
  assert.deepEqual(
    room.players.map((p) => p.color),
    ['red', 'yellow']
  );
  assert.equal(countConnectedHumanPlayers(room.players), 2);

  // Player A clicks Leave Room -> entire 2-player match terminates immediately
  const resolution = resolvePlayerDeparture(room, 'plr-a');
  assert.equal(resolution.action, 'terminate_match');
  if (resolution.action === 'terminate_match') {
    assert.equal(resolution.reasonCode, 'opponent_left_2p');
    assert.equal(
      resolution.notifyMessage,
      'Your opponent has left the match. Returning to matchmaking.'
    );
    assert.equal(resolution.returnTo, 'matchmaking');
    assert.equal(resolution.room.status, 'terminated');
  }
});

test('27. Three-player matchmaking replaces a departed player with an AI Bot preserving seat/tokens, and terminates when only 1 human remains', () => {
  const entries: MatchmakingQueueEntry[] = [
    { id: 'plr-a', name: 'Player A', avatar: 'crown', targetPlayers: 3, joinedAt: 1 },
    { id: 'plr-b', name: 'Player B', avatar: 'knight', targetPlayers: 3, joinedAt: 2 },
    { id: 'plr-c', name: 'Player C', avatar: 'shield', targetPlayers: 3, joinedAt: 3 },
  ];

  let room = createMatchedOnlineRoom({
    roomCode: 'TRIO3P',
    matchedEntries: entries,
    targetPlayers: 3,
  });
  assert.equal(room.players.length, 3);
  assert.deepEqual(
    room.players.map((p) => p.color),
    ['red', 'green', 'yellow']
  );

  // Advance Player B's (green) token 0 to step 14 on the board before leaving
  room.gameState!.players[1].tokens[0].steps = 14;
  room.gameState!.players[1].capturesMade = 2;

  // 1. Player B leaves -> replaced by AI Bot in exact seat ('green'), 2 humans remain (Player A & Player C)
  const step1 = resolvePlayerDeparture(room, 'plr-b');
  assert.equal(step1.action, 'replace_with_bot');
  room = step1.room;

  assert.equal(room.status, 'playing');
  assert.equal(countConnectedHumanPlayers(room.players), 2);
  const bSeat = room.players.find((p) => p.color === 'green')!;
  assert.equal(bSeat.isAI, true);
  assert.equal(bSeat.replacedByBot, true);
  assert.equal(bSeat.connected, false);

  const gsGreen = room.gameState!.players.find((p) => p.color === 'green')!;
  assert.equal(gsGreen.type, 'ai');
  assert.equal(gsGreen.replacedByBot, true);
  assert.equal(gsGreen.tokens[0].steps, 14); // Board position preserved!
  assert.equal(gsGreen.capturesMade, 2);

  // Duplicate leave call for Player B is a safe no-op
  const dup = resolvePlayerDeparture(room, 'plr-b');
  assert.equal(dup.action, 'noop');

  // 2. Player C subsequently leaves -> only 1 human (Player A) remains -> match terminates immediately!
  const step2 = resolvePlayerDeparture(room, 'plr-c');
  assert.equal(step2.action, 'terminate_match');
  if (step2.action === 'terminate_match') {
    assert.equal(step2.reasonCode, 'last_human_remaining');
    assert.equal(step2.room.status, 'terminated');
    assert.equal(countConnectedHumanPlayers(step2.room.players), 1);
  }
});

test('28. Four-player matchmaking replaces sequential departed players with AI Bots and terminates when human count drops to 1', () => {
  const entries: MatchmakingQueueEntry[] = [
    { id: 'plr-a', name: 'Player A', avatar: 'crown', targetPlayers: 4, joinedAt: 1 },
    { id: 'plr-b', name: 'Player B', avatar: 'knight', targetPlayers: 4, joinedAt: 2 },
    { id: 'plr-c', name: 'Player C', avatar: 'shield', targetPlayers: 4, joinedAt: 3 },
    { id: 'plr-d', name: 'Player D', avatar: 'falcon', targetPlayers: 4, joinedAt: 4 },
  ];

  let room = createMatchedOnlineRoom({
    roomCode: 'SQUAD4',
    matchedEntries: entries,
    targetPlayers: 4,
  });
  assert.equal(countConnectedHumanPlayers(room.players), 4);

  // Player B leaves -> replaced with bot (3 humans remain: A, C, D)
  const rB = resolvePlayerDeparture(room, 'plr-b');
  assert.equal(rB.action, 'replace_with_bot');
  room = rB.room;
  assert.equal(countConnectedHumanPlayers(room.players), 3);

  // Player D leaves -> replaced with bot (2 humans remain: A, C)
  const rD = resolvePlayerDeparture(room, 'plr-d');
  assert.equal(rD.action, 'replace_with_bot');
  room = rD.room;
  assert.equal(countConnectedHumanPlayers(room.players), 2);
  assert.equal(room.status, 'playing');

  // Verify both B (green) and D (blue) are now AI bots in gameState
  assert.equal(room.gameState!.players[1].type, 'ai');
  assert.equal(room.gameState!.players[3].type, 'ai');
  assert.equal(room.gameState!.players[0].type, 'human');
  assert.equal(room.gameState!.players[2].type, 'human');

  // Player C leaves -> only Player A remains as human (1 human) -> match terminates!
  const rC = resolvePlayerDeparture(room, 'plr-c');
  assert.equal(rC.action, 'terminate_match');
  if (rC.action === 'terminate_match') {
    assert.equal(rC.reasonCode, 'last_human_remaining');
    assert.equal(rC.room.status, 'terminated');
  }
});

test('29. Private room ("Play With Friends") handles guest departure cleanly and closes room when host leaves', () => {
  let room = createPrivateLobbyRoom({
    roomCode: 'PRIV01',
    hostId: 'host-1',
    hostName: 'Host',
    hostAvatar: 'crown',
  });
  room.players.push({
    id: 'guest-1',
    name: 'Guest One',
    avatar: 'knight',
    color: 'green',
    ready: true,
    isHost: false,
    isAI: false,
    connected: true,
  });
  room.players.push({
    id: 'guest-2',
    name: 'Guest Two',
    avatar: 'shield',
    color: 'yellow',
    ready: true,
    isHost: false,
    isAI: false,
    connected: true,
  });

  // Non-host guest-1 leaves lobby -> removed from room, lobby stays open for Host + Guest Two
  const guestLeave = resolvePlayerDeparture(room, 'guest-1');
  assert.equal(guestLeave.action, 'remove_lobby_player');
  room = guestLeave.room;
  assert.equal(room.players.length, 2);
  assert.equal(room.status, 'lobby');

  // Host leaves lobby -> room closes immediately and notifies Guest Two
  const hostLeave = resolvePlayerDeparture(room, 'host-1');
  assert.equal(hostLeave.action, 'terminate_match');
  if (hostLeave.action === 'terminate_match') {
    assert.equal(hostLeave.reasonCode, 'host_left_private_room');
    assert.equal(hostLeave.room.status, 'terminated');
    assert.equal(hostLeave.returnTo, 'friends');
  }
});

test('30. Matchmaking cancellation removes player from queue and prevents ghost matching', () => {
  let queue: MatchmakingQueueEntry[] = [];

  queue = enqueueMatchmakingPlayer(queue, {
    id: 'p1',
    name: 'One',
    avatar: 'crown',
    targetPlayers: 4,
    joinedAt: 10,
  }).remainingQueue;

  queue = enqueueMatchmakingPlayer(queue, {
    id: 'p2',
    name: 'Two',
    avatar: 'knight',
    targetPlayers: 4,
    joinedAt: 20,
  }).remainingQueue;

  assert.equal(queue.length, 2);

  // Player p1 cancels matchmaking before 4 players are found
  const cancelRes = removeMatchmakingPlayer(queue, 'p1');
  assert.equal(cancelRes.removedEntry?.id, 'p1');
  queue = cancelRes.remainingQueue;
  assert.equal(queue.length, 1);
  assert.equal(queue[0].id, 'p2');
});

test('31. [Part 11 Section A: Tests 1-10] Three Consecutive Sixes Complete Rollback restores movements, captures, pair formations/breaks, home-stretch/home entries, and keeps same player active', () => {
  let state = createInitialGameState({
    mode: 'local',
    players: twoPlayers,
    rules: { ...DEFAULT_HOUSE_RULES, maxConsecutiveSixes: 3 },
  });

  // Setup:
  // Red token 0 at step 25 (global 25)
  // Red token 1 at step 50 (1 step before Home Path 51, 6 steps before Home 56)
  // Red tokens 2 & 3 at step 0 (Starting Point, unpaired)
  // Yellow token 0 at step 5 (global (26+5)%52 = 31) -> 6 steps ahead of Red token 0!
  state.players[0].tokens[0].steps = 25;
  state.players[0].tokens[1].steps = 50;
  state.players[0].tokens[2].steps = 0;
  state.players[0].tokens[3].steps = 0;
  state.players[1].tokens[0].steps = 5;

  // Test 1, 2, 4, 5: First 6 -> Red manually pairs red-2 & red-3 at step 0 (even roll 6!),
  // and moves red-0 from 25 to 31, capturing yellow-0!
  state = commitDiceRoll(state, 6);
  assert.equal(state.consecutiveSixes, 1);
  assert.ok(state.sixSequenceSnapshot);

  // Form pair manually on even roll 6
  state = formTokenPair(state, 'red-2', 'red-3');
  assert.equal(state.pairs?.length, 1);
  assert.equal(state.pairs?.[0].steps, 0);

  state = executeTokenMove(state, 'red-0');
  assert.equal(state.players[0].tokens[0].steps, 31);
  assert.equal(state.players[1].tokens[0].steps, -1); // Captured!
  assert.equal(state.players[0].capturesMade, 1);

  // Test 2, 6, 7: Second consecutive 6 -> Red breaks the pair at step 0 and moves red-1 from 50 to 56 (Home)!
  state = commitDiceRoll(state, 6);
  assert.equal(state.consecutiveSixes, 2);
  state = breakTokenPair(state, 'pair-red-2-3');
  assert.equal(state.pairs?.length, 0);
  state = executeTokenMove(state, 'red-1');
  assert.equal(state.players[0].tokens[1].steps, FINISH_STEP); // Reached Home 56!

  // Test 3, 8, 9: Third consecutive 6 -> COMPLETE ROLLBACK to before the first 6!
  state = commitDiceRoll(state, 6);

  // Verify all movements, captures, pair formations/breaks, and home arrivals are completely reversed
  assert.equal(state.players[0].tokens[0].steps, 25);
  assert.equal(state.players[0].tokens[1].steps, 50);
  assert.equal(state.players[0].tokens[2].steps, 0);
  assert.equal(state.players[0].tokens[3].steps, 0);
  assert.equal(state.players[0].tokens[2].pairId, null);
  assert.equal(state.players[0].tokens[3].pairId, null);
  assert.equal(state.pairs?.length, 0);
  assert.equal(state.players[1].tokens[0].steps, 5); // Opponent token restored from yard!
  assert.equal(state.players[0].capturesMade, 0); // Capture stat restored!

  // Same player stays active, counter resets to 0, fresh roll granted
  assert.equal(state.activePlayerIndex, 0);
  assert.equal(state.consecutiveSixes, 0);
  assert.equal(state.turnPhase, 'WAITING_FOR_ROLL');
  assert.equal(state.sixSequenceSnapshot, null);
  assert.equal(
    state.lastRollbackNotice?.message,
    'THREE SIXES! All moves from this sequence have been cancelled.'
  );

  // Test 10: Rolling 6, 6, 4 does NOT rollback and resets consecutiveSixes to 0
  state = commitDiceRoll(state, 6);
  state = executeTokenMove(state, 'red-2'); // Move red-2 from 0 to 6
  assert.equal(state.consecutiveSixes, 1);

  state = commitDiceRoll(state, 6);
  state = executeTokenMove(state, 'red-2'); // Move red-2 from 6 to 12
  assert.equal(state.consecutiveSixes, 2);

  state = commitDiceRoll(state, 4);
  assert.equal(state.consecutiveSixes, 0);
  assert.equal(state.sixSequenceSnapshot, null);
  state = executeTokenMove(state, 'red-2'); // Move red-2 from 12 to 16
  assert.equal(state.players[0].tokens[2].steps, 16);
});

test('32. [Part 11 Section B: Tests 11-18] Manual Pair Formation — Never automatic, available on ANY dice roll (1..6 or before roll) whenever 2 same-color tokens share any board square (0..55), Prohibited in Home Yard (-1), and Multi-Token Selection', () => {
  // Test 11: Two same-color tokens landing on or occupying the same square do NOT automatically form a pair!
  let state = createInitialGameState({ mode: 'local', players: twoPlayers });
  state = commitDiceRoll(state, 6);
  state = executeTokenMove(state, 'red-0'); // red-0 deployed to step 0
  state = commitDiceRoll(state, 6);
  state = executeTokenMove(state, 'red-1'); // red-1 deployed to step 0
  assert.equal(state.players[0].tokens[0].steps, 0);
  assert.equal(state.players[0].tokens[1].steps, 0);
  assert.equal(state.pairs?.length, 0); // Must NOT auto-pair!
  assert.equal(state.players[0].tokens[0].pairId, null);
  assert.equal(state.players[0].tokens[1].pairId, null);

  // Even calling reconcileTokenPairs directly does not auto-form new pairs
  const rec = reconcileTokenPairs(state.players);
  assert.equal(rec.pairs.length, 0);

  // Before rolling (diceValue === null), manual pair formation is allowed because both tokens sit at step 0!
  let beforeRollPair = formTokenPair(state, 'red-0', 'red-1');
  assert.equal(beforeRollPair.pairs?.length, 1);
  beforeRollPair = breakTokenPair(beforeRollPair, 'pair-red-0-1');
  assert.equal(beforeRollPair.pairs?.length, 0);

  // Tests 12-17: Manual pair formation SUCCEEDS on ALL dice rolls 1, 2, 3, 4, 5, and 6 whenever two same-color tokens share a board position (0..55)!
  state.consecutiveSixes = 0;
  for (const rollVal of [1, 2, 3, 4, 5, 6] as const) {
    let rollState = commitDiceRoll(state, rollVal);
    const opts = getFormablePairOptionsForPlayer(
      'red',
      rollState.diceValue,
      rollState.players,
      rollState.pairs
    );
    assert.equal(
      opts.length,
      1,
      `Form Pair option must be available on dice roll ${rollVal}`
    );
    rollState = formTokenPair(rollState, 'red-0', 'red-1');
    assert.equal(
      rollState.pairs?.length,
      1,
      `Pair formation must succeed on dice roll ${rollVal}`
    );
    // Unpair works immediately on the same roll
    rollState = breakTokenPair(rollState, 'pair-red-0-1');
    assert.equal(
      rollState.pairs?.length,
      0,
      `Unpair must succeed on dice roll ${rollVal}`
    );
  }

  // Test 18: Pair formation in the Home Yard (steps === -1) is NEVER allowed on any roll (1..6)!
  for (const rollVal of [1, 2, 3, 4, 5, 6]) {
    let yardAttempt = commitDiceRoll(state, rollVal);
    // red-2 and red-3 are in the Home Yard (-1)
    yardAttempt = formTokenPair(yardAttempt, 'red-2', 'red-3');
    assert.equal(
      yardAttempt.pairs?.length,
      0,
      `Home Yard pair formation must be rejected on roll ${rollVal}`
    );
  }

  // Manual pair formation succeeds across all eligible board squares (0..55): Start (0), Safe Star (8), Home Stretch (52)
  for (const [rollVal, testStep] of [
    [1, 0], // Starting Point (step 0) on roll 1
    [2, 0], // Starting Point (step 0) on roll 2
    [3, 8], // Safe Star (step 8) on roll 3
    [4, 8], // Safe Star (step 8) on roll 4
    [5, 52], // Home Stretch (step 52) on roll 5
    [6, 52], // Home Stretch (step 52) on roll 6
  ] as const) {
    let stepState = createInitialGameState({
      mode: 'local',
      players: twoPlayers,
    });
    stepState.players[0].tokens[0].steps = testStep;
    stepState.players[0].tokens[1].steps = testStep;
    stepState = commitDiceRoll(stepState, rollVal);
    stepState = formTokenPair(stepState, 'red-0', 'red-1');
    assert.equal(stepState.pairs?.length, 1);
    assert.equal(stepState.pairs?.[0].id, 'pair-red-0-1');
    assert.equal(stepState.pairs?.[0].steps, testStep);
    assert.equal(stepState.players[0].tokens[0].pairId, 'pair-red-0-1');
    assert.equal(stepState.players[0].tokens[1].pairId, 'pair-red-0-1');
  }

  // Multi-token selection: When 3 same-color tokens occupy the same square,
  // the player can specifically choose which 2 tokens to pair (e.g. red-0 & red-2), leaving red-1 as a single token!
  let multiState = createInitialGameState({
    mode: 'local',
    players: twoPlayers,
  });
  multiState.players[0].tokens[0].steps = 12;
  multiState.players[0].tokens[1].steps = 12;
  multiState.players[0].tokens[2].steps = 12;
  multiState = commitDiceRoll(multiState, 4);
  multiState = formTokenPair(multiState, 'red-0', 'red-2');
  assert.equal(multiState.pairs?.length, 1);
  assert.deepEqual(multiState.pairs?.[0].tokenIds, ['red-0', 'red-2']);
  assert.equal(multiState.players[0].tokens[1].pairId, null); // red-1 remains single!
});

test('33. [Part 11 Section C: Tests 19-25] Pair Movement — Even dice move pairs by half the dice value (2->1, 4->2, 6->3) and odd dice (1, 3, 5) disallow pair movement', () => {
  let state = createInitialGameState({ mode: 'local', players: twoPlayers });
  state.players[0].tokens[0].steps = 10;
  state.players[0].tokens[1].steps = 10;
  // Form the pair manually
  state = commitDiceRoll(state, 2);
  state = formTokenPair(state, 'red-0', 'red-1');
  assert.equal(state.pairs?.length, 1);

  // Reset turnPhase to WAITING_FOR_ROLL with the formed pair at step 10 to test all dice rolls
  state.turnPhase = 'WAITING_FOR_ROLL';
  state.diceValue = null;

  // Test 19: Roll 2 -> pair moves 1 square (10 -> 11)
  let r2 = commitDiceRoll(state, 2);
  assert.equal(r2.legalMoves.length, 1);
  assert.equal(r2.legalMoves[0].isPairMove, true);
  assert.equal(r2.legalMoves[0].moveDistance, 1);
  assert.equal(r2.legalMoves[0].toSteps, 11);
  r2 = executeTokenMove(r2, r2.legalMoves[0].tokenId);
  assert.equal(r2.players[0].tokens[0].steps, 11);
  assert.equal(r2.players[0].tokens[1].steps, 11);

  // Test 20: Roll 4 -> pair moves 2 squares (10 -> 12)
  const r4 = commitDiceRoll(state, 4);
  assert.equal(r4.legalMoves.length, 1);
  assert.equal(r4.legalMoves[0].isPairMove, true);
  assert.equal(r4.legalMoves[0].moveDistance, 2);
  assert.equal(r4.legalMoves[0].toSteps, 12);

  // Test 21: Roll 6 -> pair moves 3 squares (10 -> 13)
  const r6 = commitDiceRoll(state, 6);
  const trackPairMove = r6.legalMoves.find((m) => m.isPairMove)!;
  assert.ok(trackPairMove);
  assert.equal(trackPairMove.moveDistance, 3);
  assert.equal(trackPairMove.toSteps, 13);

  // Tests 22, 23, 24: Roll 1, 3, 5 -> pair cannot move as a pair!
  for (const oddRoll of [1, 3, 5]) {
    const rOdd = commitDiceRoll(state, oddRoll);
    assert.equal(
      rOdd.legalMoves.some((m) => m.isPairMove),
      false
    );
    assert.deepEqual(rOdd.breakablePairIds, ['pair-red-0-1']);
    assert.equal(rOdd.turnPhase, 'SELECTING_TOKEN');
  }

  // Test 25: Pair near Home requires exact half-dice distance (step 54 needs roll 4 -> +2 = 56; roll 6 -> +3 = 57 is illegal for pair)
  let homePairState = createInitialGameState({
    mode: 'local',
    players: twoPlayers,
  });
  homePairState.players[0].tokens[0].steps = 54;
  homePairState.players[0].tokens[1].steps = 54;
  homePairState = commitDiceRoll(homePairState, 4);
  homePairState = formTokenPair(homePairState, 'red-0', 'red-1');
  homePairState.turnPhase = 'WAITING_FOR_ROLL';
  homePairState.diceValue = null;

  const overRoll = commitDiceRoll(homePairState, 6); // +3 overshoots 56 -> pair cannot move
  assert.equal(
    overRoll.legalMoves.some((m) => m.isPairMove),
    false
  );

  let exactRoll = commitDiceRoll(homePairState, 4); // +2 reaches 56!
  assert.equal(exactRoll.legalMoves.length, 1);
  assert.equal(exactRoll.legalMoves[0].isPairMove, true);
  assert.equal(exactRoll.legalMoves[0].toSteps, FINISH_STEP);
  exactRoll = executeTokenMove(exactRoll, exactRoll.legalMoves[0].tokenId);
  assert.equal(exactRoll.players[0].tokens[0].steps, FINISH_STEP);
  assert.equal(exactRoll.players[0].tokens[1].steps, FINISH_STEP);
});

test('34. [Part 11 Section D: Tests 26-32] Voluntary Pair Breaking — Unrestricted at ALL board locations (Ordinary, Safe Star, Start Square, Home Stretch)', () => {
  // Verify canBreakPairAtPosition allows breaking at ALL board locations 0..55 regardless of rules settings
  const rulesRestricted = {
    ...DEFAULT_HOUSE_RULES,
    allowBreakPairOnYardAndStar: false,
  };
  assert.equal(canBreakPairAtPosition('red', 0, rulesRestricted), true); // Starting Square
  assert.equal(canBreakPairAtPosition('red', 4, rulesRestricted), true); // Ordinary Square
  assert.equal(canBreakPairAtPosition('red', 8, rulesRestricted), true); // Safe Star Square
  assert.equal(canBreakPairAtPosition('red', 52, rulesRestricted), true); // Home Stretch Square
  assert.equal(canBreakPairAtPosition('red', -1, rulesRestricted), false); // Home Yard (pairs cannot exist here)
  assert.equal(canBreakPairAtPosition('red', 56, rulesRestricted), false); // Finished

  // Test 26, 27, 28, 29, 30, 31, 32: Break a pair at Ordinary Square (10), Safe Star (8), Starting Square (0), and Home Stretch (52)
  for (const [locationStep, rollVal] of [
    [10, 5], // Ordinary square with odd roll 5
    [8, 3], // Safe Star square with odd roll 3
    [0, 4], // Starting square with even roll 4
    [52, 3], // Home stretch square with odd roll 3
  ] as const) {
    let state = createInitialGameState({
      mode: 'local',
      players: twoPlayers,
      rules: rulesRestricted,
    });
    state.players[0].tokens[0].steps = locationStep;
    state.players[0].tokens[1].steps = locationStep;
    // Form pair manually first
    state = commitDiceRoll(state, 2);
    state = formTokenPair(state, 'red-0', 'red-1');
    assert.equal(state.pairs?.length, 1);

    // Now test rolling `rollVal` and voluntarily breaking the pair at `locationStep`
    state.turnPhase = 'WAITING_FOR_ROLL';
    state.diceValue = null;
    state = commitDiceRoll(state, rollVal);
    assert.ok(state.breakablePairIds?.includes('pair-red-0-1'));

    // Break the pair!
    state = breakTokenPair(state, 'pair-red-0-1');
    assert.equal(state.pairs?.length, 0);
    assert.equal(state.players[0].tokens[0].pairId, null); // Pair badge removed
    assert.equal(state.players[0].tokens[1].pairId, null);

    // Both separated tokens now have full-dice individual moves (`locationStep + rollVal`)
    const move0 = state.legalMoves.find((m) => m.tokenId === 'red-0');
    assert.ok(move0);
    assert.equal(move0.isPairMove, false);
    assert.equal(move0.toSteps, locationStep + rollVal);

    state = executeTokenMove(state, 'red-0');
    assert.equal(state.players[0].tokens[0].steps, locationStep + rollVal); // Moved by full dice value!
    assert.equal(state.players[0].tokens[1].steps, locationStep); // Other token remains behind!
  }
});

test('35. [Part 11 Section E: Tests 33-37] Special Capture Matrix: Single vs Single, Single vs Pair, Pair vs Single, Pair vs Pair, and Safe Star protection', () => {
  const createPairedState = (
    redSteps: number,
    redPaired: boolean,
    yellowSteps: number,
    yellowPaired: boolean
  ) => {
    const s = createInitialGameState({ mode: 'local', players: twoPlayers });
    s.pairs = s.pairs || [];
    s.players[0].tokens[0].steps = redSteps;
    if (redPaired) {
      s.players[0].tokens[1].steps = redSteps;
      s.players[0].tokens[0].pairId = 'pair-red-0-1';
      s.players[0].tokens[1].pairId = 'pair-red-0-1';
      s.pairs.push({
        id: 'pair-red-0-1',
        color: 'red',
        tokenIds: ['red-0', 'red-1'],
        steps: redSteps,
      });
    }
    s.players[1].tokens[0].steps = yellowSteps;
    if (yellowPaired) {
      s.players[1].tokens[1].steps = yellowSteps;
      s.players[1].tokens[0].pairId = 'pair-yellow-0-1';
      s.players[1].tokens[1].pairId = 'pair-yellow-0-1';
      s.pairs.push({
        id: 'pair-yellow-0-1',
        color: 'yellow',
        tokenIds: ['yellow-0', 'yellow-1'],
        steps: yellowSteps,
      });
    }
    return s;
  };

  // Test 33: Single vs Single -> captures
  let s1 = createPairedState(28, false, 5, false); // Red at 28, Yellow at 5 (global 31)
  s1 = commitDiceRoll(s1, 3);
  assert.deepEqual(s1.legalMoves[0].capturesTokenIds, ['yellow-0']);

  // Test 34: Single vs Pair -> NO capture (coexists on the square)
  let s2 = createPairedState(28, false, 5, true);
  s2 = commitDiceRoll(s2, 3);
  const singleOntoPairMove = s2.legalMoves.find((m) => m.tokenId === 'red-0')!;
  assert.ok(singleOntoPairMove);
  assert.equal(singleOntoPairMove.capturesTokenIds.length, 0);
  s2 = executeTokenMove(s2, 'red-0');
  assert.equal(s2.players[0].tokens[0].steps, 31);
  assert.equal(s2.players[1].tokens[0].steps, 5);
  assert.equal(s2.players[1].tokens[1].steps, 5);

  // Test 35: Pair vs Single -> NO capture (coexists on the square)
  let s3 = createPairedState(29, true, 5, false);
  s3 = commitDiceRoll(s3, 4); // Pair moves +2 from 29 to 31
  const pairOntoSingleMove = s3.legalMoves.find((m) => m.isPairMove)!;
  assert.ok(pairOntoSingleMove);
  assert.equal(pairOntoSingleMove.toSteps, 31);
  assert.equal(pairOntoSingleMove.capturesTokenIds.length, 0);
  s3 = executeTokenMove(s3, pairOntoSingleMove.tokenId);
  assert.equal(s3.players[0].tokens[0].steps, 31);
  assert.equal(s3.players[0].tokens[1].steps, 31);
  assert.equal(s3.players[1].tokens[0].steps, 5); // Yellow single is NOT captured!

  // Test 36: Pair vs Pair -> captures BOTH defending tokens and returns both to Home Yard (-1)
  let s4 = createPairedState(29, true, 5, true);
  s4 = commitDiceRoll(s4, 4); // Red pair moves +2 from 29 to 31
  const pairVsPairMove = s4.legalMoves.find((m) => m.isPairMove)!;
  assert.ok(pairVsPairMove);
  assert.deepEqual(pairVsPairMove.capturesTokenIds, ['yellow-0', 'yellow-1']);
  s4 = executeTokenMove(s4, pairVsPairMove.tokenId);
  assert.equal(s4.players[0].tokens[0].steps, 31);
  assert.equal(s4.players[0].tokens[1].steps, 31);
  assert.equal(s4.players[1].tokens[0].steps, -1); // Both returned to Home Yard!
  assert.equal(s4.players[1].tokens[1].steps, -1);
  assert.equal(s4.players[1].tokens[0].pairId, null);
  assert.equal(s4.players[0].capturesMade, 2);

  // Test 37: Pair vs Pair on Safe Star (global index 34 = Red step 34, Yellow step 8) -> NO capture
  let s5 = createPairedState(32, true, 8, true);
  s5 = commitDiceRoll(s5, 4); // Red pair moves +2 from 32 to 34 (Safe Star)
  const safePairMove = s5.legalMoves.find((m) => m.isPairMove)!;
  assert.ok(safePairMove);
  assert.equal(safePairMove.reachesSafeSquare, true);
  assert.equal(safePairMove.capturesTokenIds.length, 0);
});

test('36. [Part 11 Section F: Tests 38-44] Special Blockade Rules & Next-Roll Passing Exception for single tokens landing on an opposing pair', () => {
  let state = createInitialGameState({ mode: 'local', players: twoPlayers });
  // Place Yellow opposing pair at Yellow step 5 (global index 31)
  state.players[1].tokens[0].steps = 5;
  state.players[1].tokens[1].steps = 5;
  state.players[1].tokens[0].pairId = 'pair-yellow-0-1';
  state.players[1].tokens[1].pairId = 'pair-yellow-0-1';
  state.pairs = [
    {
      id: 'pair-yellow-0-1',
      color: 'yellow',
      tokenIds: ['yellow-0', 'yellow-1'],
      steps: 5,
    },
  ];
  // Place Red single token red-0 at step 28 (global 28) and red-1 at step 29 (global 29)
  state.players[0].tokens[0].steps = 28;
  state.players[0].tokens[1].steps = 29;

  // Test 38: Opposing pair at global 31 blocks normal passing (Red rolling 5 from 28 -> 33 or from 29 -> 34 is blocked at intermediate step 31)
  const blockedRoll = commitDiceRoll(state, 5);
  assert.equal(blockedRoll.legalMoves.length, 0);

  // Test 39: Single token CAN land directly on the opposing pair (Red rolling 3 moves red-0 from 28 to 31)
  state = commitDiceRoll(state, 3);
  const landMove = state.legalMoves.find((m) => m.tokenId === 'red-0');
  assert.ok(landMove);
  assert.equal(landMove.toSteps, 31);
  state = executeTokenMove(state, 'red-0');

  // Verify red-0 now has a temporary passing entitlement for `pair-yellow-0-1` at trackIndex 31!
  assert.equal(state.passingEntitlements?.length, 1);
  assert.equal(state.passingEntitlements?.[0].tokenId, 'red-0');
  assert.equal(state.passingEntitlements?.[0].pairId, 'pair-yellow-0-1');
  assert.equal(state.passingEntitlements?.[0].trackIndex, 31);

  // Test 42: Another token (red-1 at step 29) CANNOT use red-0's entitlement to pass through 31!
  state.activePlayerIndex = 0;
  state.turnPhase = 'WAITING_FOR_ROLL';
  const checkOtherToken = commitDiceRoll(state, 4); // red-1 (29 -> 33) tries to pass 31 -> blocked!
  assert.equal(
    checkOtherToken.legalMoves.some((m) => m.tokenId === 'red-1'),
    false
  );
  // Test 40 & 41: Meanwhile, red-0 (sitting at 31) CAN move forward to 35 and consume its entitlement!
  const passMove = checkOtherToken.legalMoves.find(
    (m) => m.tokenId === 'red-0'
  );
  assert.ok(passMove);
  assert.equal(passMove.toSteps, 35);
  assert.equal(passMove.consumesPassingEntitlement, true);

  const afterPass = executeTokenMove(checkOtherToken, 'red-0');
  assert.equal(afterPass.players[0].tokens[0].steps, 35);
  assert.equal(afterPass.passingEntitlements?.length, 0); // Entitlement cleared once consumed!

  // Test 43: Entitlement does NOT allow bypassing a SECOND unrelated opposing blockade ahead
  let twoBlockades = createInitialGameState({
    mode: 'local',
    players: fourPlayers,
  });
  // Yellow pair at global 31 (Red step 31), Green pair at global 33 (Green step 20 = (13+20)%52 = 33, Red step 33)
  twoBlockades.players[0].tokens[0].steps = 28;
  twoBlockades.players[1].tokens[0].steps = 20; // Green at global 33
  twoBlockades.players[1].tokens[1].steps = 20;
  twoBlockades.players[1].tokens[0].pairId = 'pair-green-0-1';
  twoBlockades.players[1].tokens[1].pairId = 'pair-green-0-1';
  twoBlockades.players[2].tokens[0].steps = 5; // Yellow at global 31
  twoBlockades.players[2].tokens[1].steps = 5;
  twoBlockades.players[2].tokens[0].pairId = 'pair-yellow-0-1';
  twoBlockades.players[2].tokens[1].pairId = 'pair-yellow-0-1';
  twoBlockades.pairs = [
    {
      id: 'pair-green-0-1',
      color: 'green',
      tokenIds: ['green-0', 'green-1'],
      steps: 20,
    },
    {
      id: 'pair-yellow-0-1',
      color: 'yellow',
      tokenIds: ['yellow-0', 'yellow-1'],
      steps: 5,
    },
  ];

  twoBlockades = commitDiceRoll(twoBlockades, 3);
  twoBlockades = executeTokenMove(twoBlockades, 'red-0'); // Lands on Yellow pair at 31
  assert.equal(twoBlockades.passingEntitlements?.length, 1);

  // Now Red is at 31 and rolls 4 (trying to reach 35, passing through Green's pair at 33) -> MUST be blocked by Green's pair!
  twoBlockades.activePlayerIndex = 0;
  twoBlockades.turnPhase = 'WAITING_FOR_ROLL';
  const blockedBySecond = commitDiceRoll(twoBlockades, 4);
  assert.equal(
    blockedBySecond.legalMoves.some((m) => m.tokenId === 'red-0'),
    false
  );

  // Test 44: If the opposing pair moves or breaks before the single token moves, the entitlement is cleared
  twoBlockades.activePlayerIndex = 2; // Yellow's turn
  twoBlockades.turnPhase = 'WAITING_FOR_ROLL';
  twoBlockades = commitDiceRoll(twoBlockades, 2); // Yellow pair moves +1 from 5 to 6 (global 31 -> 32)
  const yellowPairMove = twoBlockades.legalMoves.find((m) => m.isPairMove)!;
  twoBlockades = executeTokenMove(twoBlockades, yellowPairMove.tokenId);
  assert.equal(twoBlockades.passingEntitlements?.length, 0); // Cleared because Yellow pair moved!
});

test('37. [Part 11 Test 45] AI Turn Decision Engine evaluates manual pair formation, half-dice pair moves, and unrestricted voluntary pair breaking', () => {
  // 1. AI breaks a pair on a Safe Star (step 8) when rolling an odd 5
  let state = createInitialGameState({
    mode: 'ai',
    players: fourPlayers,
  });
  state.activePlayerIndex = 3; // Blue (Hard AI)
  state.players[3].tokens[0].steps = 8; // Safe Star square
  state.players[3].tokens[1].steps = 8;
  state.players[3].tokens[0].pairId = 'pair-blue-0-1';
  state.players[3].tokens[1].pairId = 'pair-blue-0-1';
  state.pairs = [
    {
      id: 'pair-blue-0-1',
      color: 'blue',
      tokenIds: ['blue-0', 'blue-1'],
      steps: 8,
    },
  ];

  state = commitDiceRoll(state, 5);
  assert.equal(state.legalMoves.length, 0);
  assert.deepEqual(state.breakablePairIds, ['pair-blue-0-1']);

  const breakDecision = chooseAITurnDecision(state, () => 0.5);
  assert.ok(breakDecision);
  assert.equal(breakDecision.breakPairId, 'pair-blue-0-1');
  assert.equal(breakDecision.move.toSteps, 13);

  // 2. AI manually forms a pair on an even roll (2) at step 55 when single tokens cannot move (+2 overshoots 56, but pair +1 reaches Home 56!)
  let formState = createInitialGameState({
    mode: 'ai',
    players: fourPlayers,
  });
  formState.activePlayerIndex = 3; // Blue (Hard AI)
  formState.players[3].tokens[0].steps = 55;
  formState.players[3].tokens[1].steps = 55;

  formState = commitDiceRoll(formState, 2);
  assert.equal(formState.turnPhase, 'SELECTING_TOKEN');
  const formDecision = chooseAITurnDecision(formState, () => 0.5);
  assert.ok(formDecision);
  assert.deepEqual(formDecision.formPairTokenIds, ['blue-0', 'blue-1']);
  assert.equal(formDecision.move.isPairMove, true);
  assert.equal(formDecision.move.toSteps, FINISH_STEP);
});

test('38. Unlimited Pair/Unpair ON/OFF Switch: Toggling Form Pair and Break Pair works unlimited times on the same roll, across all dice rolls (1..6), and across all 4 same-color tokens', () => {
  // Exact user scenario:
  // Roll two 6s and bring out two tokens (red-0, red-1) to the starting point (steps = 0), then roll 4.
  let state = createInitialGameState({ mode: 'local', players: twoPlayers });
  state = commitDiceRoll(state, 6);
  state = executeTokenMove(state, 'red-0');
  state = commitDiceRoll(state, 6);
  state = executeTokenMove(state, 'red-1');
  state = commitDiceRoll(state, 4);

  assert.equal(state.turnPhase, 'SELECTING_TOKEN');
  assert.equal(state.diceValue, 4);

  // 1. Toggle Form Pair (ON) <-> Break Pair (OFF) 6 times in a row on this exact roll 4!
  for (let cycle = 1; cycle <= 6; cycle++) {
    const optsBeforePair = getFormablePairOptionsForPlayer(
      'red',
      state.diceValue,
      state.players,
      state.pairs,
      state.brokenPairTokenIdsThisRoll
    );
    assert.equal(
      optsBeforePair.length,
      1,
      `Cycle ${cycle}: Form Pair option must be available before pairing`
    );
    assert.deepEqual(optsBeforePair[0].tokenIds, ['red-0', 'red-1']);

    // Switch ON: Form Pair
    state = formTokenPair(state, 'red-0', 'red-1');
    assert.equal(state.pairs?.length, 1, `Cycle ${cycle}: Pair must be active`);
    assert.equal(state.pairs?.[0].id, 'pair-red-0-1');
    assert.equal(state.players[0].tokens[0].pairId, 'pair-red-0-1');
    assert.equal(state.players[0].tokens[1].pairId, 'pair-red-0-1');
    assert.equal(state.legalMoves.some((m) => m.isPairMove && m.moveDistance === 2), true);

    // Switch OFF: Break Pair
    state = breakTokenPair(state, 'pair-red-0-1');
    assert.equal(state.pairs?.length, 0, `Cycle ${cycle}: Pair must be broken`);
    assert.equal(state.players[0].tokens[0].pairId, null);
    assert.equal(state.players[0].tokens[1].pairId, null);
    assert.equal(state.brokenPairTokenIdsThisRoll?.length, 0);

    // Immediately after breaking, Form Pair option MUST reappear!
    const optsAfterBreak = getFormablePairOptionsForPlayer(
      'red',
      state.diceValue,
      state.players,
      state.pairs,
      state.brokenPairTokenIdsThisRoll
    );
    assert.equal(
      optsAfterBreak.length,
      1,
      `Cycle ${cycle}: Form Pair option must immediately reappear after breaking`
    );
  }

  // 2. Verify across ALL rolls (1, 2, 3, 4, 5, 6) and across all 4 same-color tokens (#1, #2, #3, #4)
  // Place all 4 Red tokens at step 0
  state.players[0].tokens[0].steps = 0;
  state.players[0].tokens[1].steps = 0;
  state.players[0].tokens[2].steps = 0;
  state.players[0].tokens[3].steps = 0;

  for (const rollVal of [1, 2, 3, 4, 5, 6] as const) {
    state.turnPhase = 'WAITING_FOR_ROLL';
    state.diceValue = null;
    state.consecutiveSixes = 0;
    state = commitDiceRoll(state, rollVal);

    // With all 4 unpaired tokens at step 0, all 6 two-token combinations (#1&#2, #1&#3, #1&#4, #2&#3, #2&#4, #3&#4) are available
    const allCombos = getFormablePairOptionsForPlayer(
      'red',
      state.diceValue,
      state.players,
      state.pairs
    );
    assert.equal(allCombos.length, 6);

    // Pair #1 & #3 (red-0 & red-2) AND pair #2 & #4 (red-1 & red-3) simultaneously!
    state = formTokenPair(state, 'red-0', 'red-2');
    assert.equal(state.pairs?.length, 1);

    // #2 & #4 is still available as a formable pair option!
    const remainingCombos = getFormablePairOptionsForPlayer(
      'red',
      state.diceValue,
      state.players,
      state.pairs
    );
    assert.equal(remainingCombos.length, 1);
    assert.deepEqual(remainingCombos[0].tokenIds, ['red-1', 'red-3']);

    state = formTokenPair(state, 'red-1', 'red-3');
    assert.equal(state.pairs?.length, 2);

    // Break both pairs and re-pair them as #1 & #4 and #2 & #3!
    state = breakTokenPair(state, 'pair-red-0-2');
    state = breakTokenPair(state, 'pair-red-1-3');
    assert.equal(state.pairs?.length, 0);

    state = formTokenPair(state, 'red-0', 'red-3');
    state = formTokenPair(state, 'red-1', 'red-2');
    assert.equal(state.pairs?.length, 2);

    // Break both again to leave all 4 tokens unpaired for the next roll iteration
    state = breakTokenPair(state, 'pair-red-0-3');
    state = breakTokenPair(state, 'pair-red-1-2');
    assert.equal(state.pairs?.length, 0);
  }
});

test('39. Single-Token Move Preservation Across Pair/Unpair Toggles: Pairing and unpairing two tokens at Start or any board square NEVER loses or dims the move option of another single token on the board', () => {
  // Exact user scenario:
  // Suppose player has two tokens (#1 red-0 and #2 red-1) at Start (step 0)
  // AND one single token (#3 red-2) somewhere else on the board (step 14).
  let state = createInitialGameState({ mode: 'local', players: twoPlayers });
  state.players[0].tokens[0].steps = 0; // #1 at Start
  state.players[0].tokens[1].steps = 0; // #2 at Start
  state.players[0].tokens[2].steps = 14; // #3 single token on the board
  state.players[0].tokens[3].steps = -1; // #4 in Home Yard

  // 1. Roll an even number (4)
  state = commitDiceRoll(state, 4);
  assert.equal(state.turnPhase, 'SELECTING_TOKEN');
  assert.equal(state.selectedTokenId, null);

  // Initially all 3 tokens (#1, #2, #3) have individual moves, and #1 & #2 have the Form Pair option
  assert.equal(state.legalMoves.length, 3);
  assert.ok(state.legalMoves.some((m) => m.tokenId === 'red-0' && m.toSteps === 4));
  assert.ok(state.legalMoves.some((m) => m.tokenId === 'red-1' && m.toSteps === 4));
  assert.ok(state.legalMoves.some((m) => m.tokenId === 'red-2' && m.toSteps === 18));

  // 2. Player presses Form Pair (#1 & #2)
  state = formTokenPair(state, 'red-0', 'red-1');
  assert.equal(state.pairs?.length, 1);
  assert.equal(state.selectedTokenId, null); // Must NOT lock selection onto red-0!
  // Both the pair move (0 -> 2) AND the single token #3 move (14 -> 18) must be available!
  assert.equal(state.legalMoves.length, 2);
  assert.ok(
    state.legalMoves.some(
      (m) => m.tokenId === 'red-0' && m.isPairMove && m.toSteps === 2
    )
  );
  assert.ok(
    state.legalMoves.some(
      (m) => m.tokenId === 'red-2' && !m.isPairMove && m.toSteps === 18
    ),
    'Single token #3 move must remain available after forming pair'
  );
  // Break Pair option must also be available in any scenario
  assert.deepEqual(state.breakablePairIds, ['pair-red-0-1']);

  // 3. Player decides to unpair (#1 & #2) and move the single token (#3) which is at step 14
  state = breakTokenPair(state, 'pair-red-0-1');
  assert.equal(state.pairs?.length, 0);
  assert.equal(state.selectedTokenId, null); // Must NOT lock selection onto red-0!
  // All 3 individual moves (#1, #2, and single token #3) must be available!
  assert.equal(state.legalMoves.length, 3);
  assert.ok(state.legalMoves.some((m) => m.tokenId === 'red-0' && m.toSteps === 4));
  assert.ok(state.legalMoves.some((m) => m.tokenId === 'red-1' && m.toSteps === 4));
  const singleMoveAfterUnpair = state.legalMoves.find((m) => m.tokenId === 'red-2');
  assert.ok(
    singleMoveAfterUnpair,
    'Single token #3 move option must NEVER vanish after unpairing!'
  );
  assert.equal(singleMoveAfterUnpair.toSteps, 18);

  // 4. Also verify when the two paired tokens are at step 55 (where 55+4 > 56 so they cannot move on 4)
  // while single token #3 is at step 14: player can STILL pair and unpair #1 & #2 and move #3!
  let edgeState = createInitialGameState({ mode: 'local', players: twoPlayers });
  edgeState.players[0].tokens[0].steps = 55;
  edgeState.players[0].tokens[1].steps = 55;
  edgeState.players[0].tokens[2].steps = 14;
  edgeState = commitDiceRoll(edgeState, 4);
  edgeState = formTokenPair(edgeState, 'red-0', 'red-1');
  assert.equal(edgeState.pairs?.length, 1);
  assert.deepEqual(edgeState.breakablePairIds, ['pair-red-0-1']); // Unpair still available even though 55+4 > 56!
  assert.ok(edgeState.legalMoves.some((m) => m.tokenId === 'red-2' && m.toSteps === 18));

  edgeState = breakTokenPair(edgeState, 'pair-red-0-1');
  assert.equal(edgeState.pairs?.length, 0);
  assert.ok(edgeState.legalMoves.some((m) => m.tokenId === 'red-2' && m.toSteps === 18));

  // Execute the move on single token #3 (red-2)
  state = executeTokenMove(state, 'red-2');
  assert.equal(state.players[0].tokens[2].steps, 18);
});

test('40. 5-Player Pentagon Board & 6-Player Hexagon Board Geometry, Themes, Exact 1-Cell-Per-Step Alignment, Captures, Safe Stars, Pairing & Three Sixes Rollback', () => {
  // 1. Verify Pentagon (5P: 5 arms × 13 physical cells = 65 perimeter cells) and Hexagon (6P: 6 arms × 13 physical cells = 78 perimeter cells)
  assert.equal(PENTAGON_BOARD_GEOMETRY.trackCoords.length, 65);
  assert.equal(HEXAGON_BOARD_GEOMETRY.trackCoords.length, 78);
  assert.deepEqual(getColorsForPlayerCount(5), [
    'red',
    'green',
    'yellow',
    'blue',
    'purple',
  ]);
  assert.deepEqual(getColorsForPlayerCount(6), [
    'red',
    'green',
    'yellow',
    'blue',
    'purple',
    'orange',
  ]);

  // Verify all 6 board themes provide territory titles for purple and orange
  for (const themeOpt of BOARD_THEME_OPTIONS) {
    const spec = getThemeTileSpec(themeOpt.id);
    assert.ok(spec.territoryTitles.purple.length > 0);
    assert.ok(spec.territoryTitles.orange.length > 0);
  }

  // 2. Verify full step coordinate progression for 5P (0..69) and 6P (0..82) and assert every board step lands at the EXACT center of a physical visualArmCells cell!
  for (const playerCount of [5, 6] as const) {
    const geom =
      playerCount === 5 ? PENTAGON_BOARD_GEOMETRY : HEXAGON_BOARD_GEOMETRY;
    const finishStep = playerCount === 5 ? 69 : 82;
    const colors = getColorsForPlayerCount(playerCount);

    for (const color of colors) {
      for (let tIdx = 0; tIdx < 4; tIdx++) {
        const yardCoord = getTokenGridCoord(color, -1, tIdx, tIdx, playerCount);
        assert.ok(
          Number.isFinite(yardCoord.row) && Number.isFinite(yardCoord.col)
        );
      }

      for (let step = 0; step < finishStep; step++) {
        const coord = getTokenGridCoord(color, step, 0, undefined, playerCount);
        assert.ok(
          Number.isFinite(coord.row) && Number.isFinite(coord.col),
          `Invalid coord for ${playerCount}P ${color} at step ${step}`
        );
        // Every step 0..finishStep-1 MUST match the exact center of a physical cell in geom.visualArmCells!
        const matchesPhysicalCell = geom.visualArmCells.some(
          (cell) =>
            Math.abs(cell.coord.row - coord.row) < 1e-4 &&
            Math.abs(cell.coord.col - coord.col) < 1e-4
        );
        assert.equal(
          matchesPhysicalCell,
          true,
          `Step ${step} for ${playerCount}P ${color} at (${coord.row}, ${coord.col}) is not centered inside a physical arm cell!`
        );
      }

      const finishCoord = getTokenGridCoord(
        color,
        finishStep,
        0,
        undefined,
        playerCount
      );
      assert.ok(
        Number.isFinite(finishCoord.row) && Number.isFinite(finishCoord.col)
      );

      // Step 0 must be a Safe Start Square
      const startGlobal = getGlobalTrackIndex(color, 0, playerCount)!;
      assert.equal(
        isSafeTrackIndex(startGlobal, DEFAULT_HOUSE_RULES, playerCount),
        true
      );
      // Safe Star Square on the next arm is always at step 8 (5 steps inward along own arm + 3 steps outward along next arm)
      const starGlobal = getGlobalTrackIndex(color, 8, playerCount)!;
      assert.equal(
        isSafeTrackIndex(starGlobal, DEFAULT_HOUSE_RULES, playerCount),
        true
      );
    }
  }

  // 3. Test 5-Player Pentagon Gameplay (Purple capturing Red, Manual Pairing, and 3-Sixes Rollback)
  const fivePlayers: PlayerConfig[] = getColorsForPlayerCount(5).map(
    (color, i) => ({
      color,
      name: `Player ${i + 1}`,
      avatar: 'crown',
      type: i === 0 ? 'human' : 'ai',
      aiDifficulty: 'medium',
    })
  );
  let state5p = createInitialGameState({ mode: 'ai', players: fivePlayers });
  assert.equal(state5p.players.length, 5);
  assert.equal(state5p.players[4].color, 'purple');

  // On 5P Pentagon (65 cells), Red starts at 8, so Red step 10 is global (8 + 10) % 65 = 18 (non-safe square).
  // Purple starts at 60, so Purple step 23 is global (60 + 23) % 65 = 18!
  state5p.players[0].tokens[0].steps = 10;
  state5p.players[4].tokens[0].steps = 20; // Purple at step 20 (global 15)
  state5p.activePlayerIndex = 4; // Purple's turn
  state5p = commitDiceRoll(state5p, 3); // Purple moves 20 -> 23 (global 18), capturing Red!
  const purpleCaptureMove = state5p.legalMoves.find(
    (m) => m.tokenId === 'purple-0'
  );
  assert.ok(purpleCaptureMove);
  assert.deepEqual(purpleCaptureMove.capturesTokenIds, ['red-0']);
  state5p = executeTokenMove(state5p, 'purple-0');
  assert.equal(state5p.players[0].tokens[0].steps, -1); // Red returned to Home Yard
  assert.equal(state5p.players[4].capturesMade, 1);

  // 4. Test 6-Player Hexagon Gameplay (Orange Pair vs Purple Pair capture & Three Consecutive Sixes rollback)
  const sixPlayers: PlayerConfig[] = getColorsForPlayerCount(6).map(
    (color, i) => ({
      color,
      name: `Player ${i + 1}`,
      avatar: 'crown',
      type: 'human',
    })
  );
  let state6p = createInitialGameState({ mode: 'local', players: sixPlayers });
  assert.equal(state6p.players.length, 6);
  assert.equal(state6p.players[5].color, 'orange');

  // On 6P Hexagon (78 cells), Purple starts at 60, so Purple step 4 is global (60 + 4) % 78 = 64 (non-safe square)
  state6p.players[4].tokens[0].steps = 4;
  state6p.players[4].tokens[1].steps = 4;
  state6p.activePlayerIndex = 4; // Purple's turn to form its pair
  state6p = formTokenPair(state6p, 'purple-0', 'purple-1');
  assert.equal(state6p.pairs?.length, 1);

  // Orange starts at 73, so Orange step 67 is global (73 + 67) % 78 = 62, and step 69 is global (73 + 69) % 78 = 64 (where Purple pair sits!)
  state6p.players[5].tokens[0].steps = 67;
  state6p.players[5].tokens[1].steps = 67;
  state6p.activePlayerIndex = 5; // Orange's turn
  state6p = commitDiceRoll(state6p, 4);
  state6p = formTokenPair(state6p, 'orange-0', 'orange-1');
  assert.equal(state6p.pairs?.length, 2);

  const orangePairMove = state6p.legalMoves.find(
    (m) => m.isPairMove && m.tokenId === 'orange-0'
  );
  assert.ok(orangePairMove);
  assert.equal(orangePairMove.toSteps, 69);
  assert.deepEqual(orangePairMove.capturesTokenIds, ['purple-0', 'purple-1']);
  state6p = executeTokenMove(state6p, 'orange-0');
  assert.equal(state6p.players[4].tokens[0].steps, -1);
  assert.equal(state6p.players[4].tokens[1].steps, -1);
  assert.equal(state6p.players[5].capturesMade, 2);

  // Test Three Consecutive Sixes rollback on 6-Player Hexagon for Orange
  state6p.activePlayerIndex = 5;
  state6p.turnPhase = 'WAITING_FOR_ROLL';
  state6p.consecutiveSixes = 0;
  const beforeSixesOrangeStep = state6p.players[5].tokens[2].steps; // -1
  state6p = commitDiceRoll(state6p, 6);
  state6p = executeTokenMove(state6p, 'orange-2'); // Deployed to 0
  assert.equal(state6p.players[5].tokens[2].steps, 0);
  state6p = commitDiceRoll(state6p, 6);
  state6p = executeTokenMove(state6p, 'orange-2'); // Moved to 6
  assert.equal(state6p.players[5].tokens[2].steps, 6);
  // Third consecutive 6 -> full rollback!
  state6p = commitDiceRoll(state6p, 6);
  assert.equal(state6p.players[5].tokens[2].steps, beforeSixesOrangeStep);
  assert.equal(state6p.turnPhase, 'WAITING_FOR_ROLL');
  assert.equal(state6p.activePlayerIndex, 5); // Orange gets a fresh roll!
});

test('41. 5-Player and 6-Player Online Matchmaking & Private Lobby Bot Replacement', () => {
  // 1. Test 5-Player Matchmaking Queue
  let queue5: MatchmakingQueueEntry[] = [];
  for (let i = 1; i <= 5; i++) {
    const res = enqueueMatchmakingPlayer(queue5, {
      id: `s5-${i}`,
      name: `P${i}`,
      avatar: 'crown',
      targetPlayers: 5,
      joinedAt: 1000 + i,
    });
    queue5 = res.remainingQueue;
    if (i < 5) {
      assert.equal(res.matchedEntries, null);
    } else {
      assert.equal(res.matchedEntries?.length, 5);
      const room5 = createMatchedOnlineRoom({
        roomCode: 'PENT55',
        matchedEntries: res.matchedEntries!,
        targetPlayers: 5,
      });
      assert.equal(room5.players.length, 5);
      assert.equal(room5.players[4].color, 'purple');
      assert.equal(room5.gameState?.players.length, 5);
    }
  }

  // 2. Test 6-Player Matchmaking Queue & Departure Bot Replacement
  let queue6: MatchmakingQueueEntry[] = [];
  let room6: ReturnType<typeof createMatchedOnlineRoom> | null = null;
  for (let i = 1; i <= 6; i++) {
    const res = enqueueMatchmakingPlayer(queue6, {
      id: `s6-${i}`,
      name: `HexPlayer${i}`,
      avatar: 'dragon',
      targetPlayers: 6,
      joinedAt: 2000 + i,
    });
    queue6 = res.remainingQueue;
    if (i === 6) {
      assert.equal(res.matchedEntries?.length, 6);
      room6 = createMatchedOnlineRoom({
        roomCode: 'HEXA66',
        matchedEntries: res.matchedEntries!,
        targetPlayers: 6,
      });
    }
  }
  assert.ok(room6);
  assert.equal(room6.players.length, 6);
  assert.equal(room6.players[5].color, 'orange');

  // If Player 6 (Orange) leaves while 5 humans remain, Orange is replaced by an AI Bot and match continues!
  const dep = resolvePlayerDeparture(room6, 's6-6');
  assert.equal(dep.action, 'replace_with_bot');
  assert.equal(countConnectedHumanPlayers(dep.room.players), 5);
  assert.equal(dep.room.gameState?.players[5].type, 'ai');
  assert.equal(dep.room.gameState?.players[5].replacedByBot, true);
});

test('42. Lava Cube secondary cooling idle state (>10s without roll) and instant reactivation upon interaction', () => {
  assert.equal(LAVA_COOLING_TIMEOUT_MS, 10000);

  // 1. Freshly idle Lava Cube (0ms .. 10000ms) is in bright 'active_flow' state
  assert.equal(
    computeLavaThermalState({
      diceStyle: 'lava_cube',
      isRolling: false,
      elapsedIdleMs: 0,
    }),
    'active_flow'
  );
  assert.equal(
    computeLavaThermalState({
      diceStyle: 'lava_cube',
      isRolling: false,
      elapsedIdleMs: 9999,
    }),
    'active_flow'
  );
  assert.equal(
    computeLavaThermalState({
      diceStyle: 'lava_cube',
      isRolling: false,
      elapsedIdleMs: 10000,
    }),
    'active_flow'
  );

  // 2. When not rolled or interacted with for more than 10 seconds (>10000ms), enters 'cooling_ember' state
  assert.equal(
    computeLavaThermalState({
      diceStyle: 'lava_cube',
      isRolling: false,
      elapsedIdleMs: 10001,
    }),
    'cooling_ember'
  );
  assert.equal(
    computeLavaThermalState({
      diceStyle: 'lava_cube',
      isRolling: false,
      elapsedIdleMs: 25000,
    }),
    'cooling_ember'
  );

  // 3. Immediately upon user interaction (elapsedIdleMs resets to 0) or rolling, reactivates out of cooling state
  assert.equal(
    computeLavaThermalState({
      diceStyle: 'lava_cube',
      isRolling: false,
      elapsedIdleMs: 0,
    }),
    'active_flow'
  );
  assert.equal(
    computeLavaThermalState({
      diceStyle: 'lava_cube',
      isRolling: true,
      elapsedIdleMs: 15000,
    }),
    'erupting_roll'
  );

  // 4. Non-lava dice styles always return 'inactive'
  assert.equal(
    computeLavaThermalState({
      diceStyle: 'electro_cube',
      isRolling: false,
      elapsedIdleMs: 20000,
    }),
    'inactive'
  );

  // 5. Board surface 'lava drop' splash spec on landing after a roll
  const splash = buildLavaDropSplashSpec(750, 750, 6);
  assert.equal(splash.centerX, 750);
  assert.equal(splash.centerY, 750);
  assert.equal(splash.durationMs, LAVA_DROP_SPLASH_DURATION_MS);
  assert.equal(splash.drops.length, 8);
  for (const drop of splash.drops) {
    assert.ok(drop.distance >= 68 && drop.distance <= 160);
    assert.ok(drop.rx > drop.ry);
  }

  // 6. Periodic volcanic 'steam vent' particle specs when Lava Cube enters its spitting state
  const steamVents = buildLavaSteamVentSpecs(6);
  assert.equal(steamVents.length, 6);
  for (let i = 0; i < steamVents.length; i++) {
    const vent = steamVents[i];
    assert.ok(vent.originX >= 25 && vent.originX <= 95);
    assert.ok(vent.originY >= 20 && vent.originY <= 80);
    // Steam vents always rise upward (negative riseY) and expand from crack fissures
    assert.ok(vent.riseY < -15);
    assert.ok(vent.radiusX > 0 && vent.radiusY > 0);
    assert.ok(vent.durationMs >= 700 && vent.durationMs <= 1050);
    assert.equal(vent.delayMs, i * 115);
  }
});

test('43. Electro Cube idle body sparks, full-body electric pulse conduits, and rolling high-voltage pulse discharges', () => {
  // 1. Full-body electric pulse conduits running through the entire cube body
  const bodyPulses = buildElectroBodyPulseSpecs();
  assert.equal(bodyPulses.length, 6);
  for (const bp of bodyPulses) {
    assert.ok(bp.conduitPath.startsWith('M '));
    assert.ok(bp.nodeX >= 25 && bp.nodeX <= 95);
    assert.ok(bp.nodeY >= 25 && bp.nodeY <= 95);
    assert.equal(bp.coreHex, '#FFFFFF');
    assert.ok(bp.durationMs >= 750 && bp.durationMs <= 1200);
  }

  // 2. Idle state electric sparks coming out of the body of the cube
  const idleSparks = buildElectroIdleSparkSpecs(8);
  assert.equal(idleSparks.length, 8);
  for (let i = 0; i < idleSparks.length; i++) {
    const sp = idleSparks[i];
    assert.ok(sp.mainBoltPath.startsWith('M '));
    assert.ok(sp.branchBoltPath.startsWith('M '));
    // Spark tips extend outward beyond the root electrode on the cube body, with compact reach (<= 13 units)
    const distFromCenterRoot = Math.hypot(sp.rootX - 60, sp.rootY - 60);
    const distFromCenterTip = Math.hypot(sp.sparkTipX - 60, sp.sparkTipY - 60);
    const sparkReach = Math.hypot(sp.sparkTipX - sp.rootX, sp.sparkTipY - sp.rootY);
    assert.ok(distFromCenterTip > distFromCenterRoot);
    assert.ok(sparkReach <= 13);
    assert.equal(sp.coreHex, '#FFFFFF');
    assert.equal(sp.delayMs, i * 85);
  }

  // 3. Rolling state electric pulses and forked lightning discharges coming out of the cube
  const rollingPulses = buildElectroRollingPulseSpecs(8);
  assert.equal(rollingPulses.length, 8);
  for (let i = 0; i < rollingPulses.length; i++) {
    const rp = rollingPulses[i];
    assert.ok(rp.pulseWavePath.startsWith('M '));
    assert.ok(rp.innerWavePath.startsWith('M '));
    assert.ok(rp.lightningBoltPath.startsWith('M '));
    assert.ok(rp.forkBranchPath.startsWith('M '));
    assert.equal(rp.coreHex, '#FFFFFF');
    assert.equal(rp.delayMs, i * 58);
  }

  // 4. Rolling state concentric 360-degree circular electric wave rings expanding in a wave-like pattern
  const waveRings = buildElectroCircularWaveRings(3);
  assert.equal(waveRings.length, 3);
  for (let i = 0; i < waveRings.length; i++) {
    const wr = waveRings[i];
    assert.equal(wr.centerX, 70);
    assert.equal(wr.centerY, 70);
    assert.ok(wr.baseRadius >= 42, 'Circular electric pulse wave baseRadius should be enlarged');
    assert.ok(wr.waveRingPath.startsWith('M '));
    assert.ok(wr.waveRingPath.endsWith('Z'));
    assert.ok(wr.harmonicRingPath.startsWith('M '));
    assert.ok(wr.radialSparksPath.startsWith('M '));
    assert.equal(wr.delayMs, i * 195);
  }
});

test('44. Tesseract Cube transparent design, idle 4D hypercube animation, and 4D-warp rolling state', () => {
  // 1. Phase state machine transitions
  assert.equal(
    computeTesseractWarpPhase({
      diceStyle: 'tesseract_cube',
      isRolling: false,
      isLanding: false,
    }),
    'idle_3d'
  );
  assert.equal(
    computeTesseractWarpPhase({
      diceStyle: 'tesseract_cube',
      isRolling: true,
      isLanding: false,
    }),
    'warping_4d'
  );
  assert.equal(
    computeTesseractWarpPhase({
      diceStyle: 'tesseract_cube',
      isRolling: false,
      isLanding: true,
    }),
    'realigning_4d'
  );
  assert.equal(
    computeTesseractWarpPhase({
      diceStyle: 'lava_cube',
      isRolling: true,
      isLanding: false,
    }),
    'inactive'
  );

  // 2. Idle 4D hypercube conduit energy pulses
  const idlePulses = buildTesseractIdleEnergyPulses();
  assert.equal(idlePulses.length, 4);
  for (const ip of idlePulses) {
    assert.ok(ip.path.startsWith('M '));
    assert.ok(ip.durationMs >= 1500);
  }

  // 3. All 6 faces are generated with distinct 3D rest, idle precession, inside-out inversion, and dimensional-shift transforms
  for (let activeVal = 1; activeVal <= 6; activeVal++) {
    const faces = buildTesseractWarpFaceSpecs(activeVal, 24);
    assert.equal(faces.length, 6);
    const ids = faces.map((f) => f.faceId);
    assert.deepEqual(ids, ['front', 'back', 'right', 'left', 'top', 'bottom']);

    // Verify all 6 die values 1..6 are represented and opposite pairs sum to 7
    const valSet = new Set(faces.map((f) => f.faceValue));
    assert.equal(valSet.size, 6);
    assert.equal(faces[0].faceValue, activeVal);
    assert.equal(faces[0].faceValue + faces[1].faceValue, 7);
    assert.equal(faces[2].faceValue + faces[3].faceValue, 7);
    assert.equal(faces[4].faceValue + faces[5].faceValue, 7);

    for (const face of faces) {
      assert.ok(face.restTransform.includes('translateZ(24px)'));
      assert.ok(face.idlePrecessTransform.includes('translateZ(19px)'));
      assert.ok(face.insideOutTransform.includes('translateZ(-12px)'));
      assert.ok(face.insideOutTransform.includes('scale3d(-0.56, 0.56, 0.56)'));
      assert.ok(face.dimensionalShiftTransform.includes('translateZ(31px)'));
      assert.equal(face.pipCoords.length, face.faceValue);
    }
  }
});

test('45. Cosmo Cube idle celestial galaxy/orbits and rolling supernova vortex specifications', () => {
  // 1. Idle celestial specification
  const idleSpec = buildCosmoIdleCelestialSpecs();
  assert.equal(idleSpec.galaxySpiralArms.length, 4);
  for (const arm of idleSpec.galaxySpiralArms) {
    assert.ok(arm.armPath.startsWith('M '));
    assert.ok(arm.armPath.includes(' L '));
  }

  assert.equal(idleSpec.orbits.length, 2);
  assert.ok(idleSpec.orbits[0].tiltDeg < 0);
  assert.ok(idleSpec.orbits[1].tiltDeg > 0);
  for (const orbit of idleSpec.orbits) {
    assert.ok(orbit.rx > 35);
    assert.ok(orbit.ry > 10);
    assert.ok(orbit.planetRadius >= 2.0);
    assert.ok(orbit.durationMs >= 4500);
  }

  assert.equal(idleSpec.starGlints.length, 6);
  for (const glint of idleSpec.starGlints) {
    assert.ok(glint.diamondPath.startsWith('M '));
    assert.ok(glint.diamondPath.endsWith('Z'));
    assert.ok(glint.durationMs >= 1400);
  }

  // 2. Rolling supernova vortex specification
  const rollSpec = buildCosmoRollingSupernovaSpecs();
  assert.equal(rollSpec.spiralArms.length, 4);
  for (let i = 0; i < rollSpec.spiralArms.length; i++) {
    const arm = rollSpec.spiralArms[i];
    assert.ok(arm.spiralArmPath.startsWith('M '));
    assert.ok(arm.starlightTrailPath.startsWith('M '));
    assert.equal(arm.delayMs, i * 95);
  }

  assert.equal(rollSpec.comets.length, 3);
  for (let i = 0; i < rollSpec.comets.length; i++) {
    const comet = rollSpec.comets[i];
    assert.ok(comet.cometTailPath.startsWith('M '));
    assert.equal(comet.delayMs, i * 140);
  }

  assert.ok(rollSpec.accretionRingRadius >= 42);
});

test('46. Lava, Electro, Tesseract, and Cosmo Cube expose distinct design-matched idle animation sound effect profiles and loop controls', () => {
  const lavaActive = getDiceIdleAudioSpec('lava_cube', { isCooling: false });
  const lavaCooling = getDiceIdleAudioSpec('lava_cube', { isCooling: true });
  const electroIdle = getDiceIdleAudioSpec('electro_cube');
  const tesseractIdle = getDiceIdleAudioSpec('tesseract_cube');
  const cosmoIdle = getDiceIdleAudioSpec('cosmo_cube');
  const classicIdle = getDiceIdleAudioSpec('classic_ivory');

  // 1. All 4 special cubes enable idle audio with distinct profiles; classic dice remain silent at rest
  assert.equal(lavaActive.enabled, true);
  assert.equal(electroIdle.enabled, true);
  assert.equal(tesseractIdle.enabled, true);
  assert.equal(cosmoIdle.enabled, true);
  assert.equal(classicIdle.enabled, false);
  assert.equal(classicIdle.idleProfile, 'silent_tabletop');

  const uniqueIdleProfiles = new Set([
    lavaActive.idleProfile,
    electroIdle.idleProfile,
    tesseractIdle.idleProfile,
    cosmoIdle.idleProfile,
  ]);
  assert.equal(uniqueIdleProfiles.size, 4);
  assert.equal(lavaActive.idleProfile, 'lava_magma_simmer');
  assert.equal(electroIdle.idleProfile, 'electro_tesla_hum');
  assert.equal(tesseractIdle.idleProfile, 'tesseract_hyper_drone');
  assert.equal(cosmoIdle.idleProfile, 'cosmo_nebula_choir');

  // 2. Lava, Electro, and Tesseract Cubes use the uploaded WAV audio assets for idle and rolling animations
  const lavaIdentity = getDiceAudioIdentity('lava_cube');
  assert.equal(
    lavaIdentity.idleAudioAsset,
    '/assets/aistudio/Create_a_subtle_volc__4-1794493498531_1b63f895.wav'
  );
  assert.equal(lavaIdentity.idleAudioAsset, LAVA_CUBE_IDLE_AUDIO_ASSET);
  assert.equal(
    lavaIdentity.rollAudioAsset,
    '/assets/aistudio/lava_cube_rolling.wav'
  );
  assert.equal(lavaIdentity.rollAudioAsset, LAVA_CUBE_ROLL_AUDIO_ASSET);
  assert.equal(lavaActive.audioAssetUrl, LAVA_CUBE_IDLE_AUDIO_ASSET);
  assert.equal(lavaCooling.audioAssetUrl, LAVA_CUBE_IDLE_AUDIO_ASSET);

  const electroIdentity = getDiceAudioIdentity('electro_cube');
  assert.equal(
    electroIdentity.idleAudioAsset,
    '/assets/aistudio/A_futuristic_electri__4-1794495895509_a7071723.wav'
  );
  assert.equal(electroIdentity.idleAudioAsset, ELECTRO_CUBE_IDLE_AUDIO_ASSET);
  assert.equal(
    electroIdentity.rollAudioAsset,
    '/assets/aistudio/electro_cube_rolling.wav'
  );
  assert.equal(electroIdentity.rollAudioAsset, ELECTRO_CUBE_ROLL_AUDIO_ASSET);
  assert.equal(electroIdle.audioAssetUrl, ELECTRO_CUBE_IDLE_AUDIO_ASSET);

  const tesseractIdentity = getDiceAudioIdentity('tesseract_cube');
  assert.equal(
    tesseractIdentity.idleAudioAsset,
    '/assets/aistudio/tesseract_cube_idle.wav'
  );
  assert.equal(tesseractIdentity.idleAudioAsset, TESSERACT_CUBE_IDLE_AUDIO_ASSET);
  assert.equal(
    tesseractIdentity.rollAudioAsset,
    '/assets/aistudio/tesseract_cube_rolling.wav'
  );
  assert.equal(tesseractIdentity.rollAudioAsset, TESSERACT_CUBE_ROLL_AUDIO_ASSET);
  assert.equal(tesseractIdle.audioAssetUrl, TESSERACT_CUBE_IDLE_AUDIO_ASSET);

  const cosmoIdentity = getDiceAudioIdentity('cosmo_cube');
  assert.equal(
    cosmoIdentity.idleAudioAsset,
    '/assets/aistudio/cosmo_cube_idle.wav'
  );
  assert.equal(cosmoIdentity.idleAudioAsset, COSMO_CUBE_IDLE_AUDIO_ASSET);
  assert.equal(
    cosmoIdentity.rollAudioAsset,
    '/assets/aistudio/A_magical_cosmic_cub__3-1794498753087_98bbee8a.wav'
  );
  assert.equal(cosmoIdentity.rollAudioAsset, COSMO_CUBE_ROLL_AUDIO_ASSET);
  assert.equal(cosmoIdle.audioAssetUrl, COSMO_CUBE_IDLE_AUDIO_ASSET);

  // Lava Cube cooling state slows down interval, lowers drone pitch, and reduces peak gain
  assert.ok(lavaCooling.intervalMs > lavaActive.intervalMs);
  assert.ok(lavaCooling.baseDroneFreqHz < lavaActive.baseDroneFreqHz);
  assert.ok(lavaCooling.peakGain < lavaActive.peakGain);

  // 3. Frequency spectra match each cube's physical design
  // Lava: deep sub-bass volcanic rumble (<70Hz)
  assert.ok(lavaActive.baseDroneFreqHz >= 40 && lavaActive.baseDroneFreqHz <= 65);
  // Electro: 120Hz Tesla transformer hum + high-voltage kHz spark snaps
  assert.equal(electroIdle.baseDroneFreqHz, 120);
  assert.ok(electroIdle.accentBurstFreqsHz.some((f) => f >= 1600));
  // Tesseract: 528Hz crystal-glass resonance + 530.5Hz binaural beat + 792Hz fifth
  assert.equal(tesseractIdle.baseDroneFreqHz, 528);
  assert.ok(tesseractIdle.harmonicFreqsHz.includes(792));
  // Cosmo: 130.81Hz (C3) + 196Hz (G3) celestial fifth pad + Lydian stardust chimes
  assert.equal(cosmoIdle.baseDroneFreqHz, 130.81);
  assert.ok(cosmoIdle.accentBurstFreqsHz.includes(1479.98));

  // 4. SoundManager loop lifecycle & mute behavior
  soundManager.configure(true, false, 'medium');
  assert.equal(soundManager.startDiceIdleLoop('lava_cube'), true);
  assert.equal(soundManager.getActiveIdleDiceStyle(), 'lava_cube');

  assert.equal(soundManager.startDiceIdleLoop('electro_cube'), true);
  assert.equal(soundManager.getActiveIdleDiceStyle(), 'electro_cube');

  assert.equal(soundManager.startDiceIdleLoop('tesseract_cube'), true);
  assert.equal(soundManager.getActiveIdleDiceStyle(), 'tesseract_cube');

  assert.equal(soundManager.startDiceIdleLoop('cosmo_cube'), true);
  assert.equal(soundManager.getActiveIdleDiceStyle(), 'cosmo_cube');

  // Switching to a classic die stops the idle loop
  assert.equal(soundManager.startDiceIdleLoop('classic_ivory'), false);
  assert.equal(soundManager.getActiveIdleDiceStyle(), null);

  // Muting audio immediately stops any active idle loop
  soundManager.startDiceIdleLoop('cosmo_cube');
  soundManager.configure(false, false, 'medium');
  assert.equal(soundManager.getActiveIdleDiceStyle(), null);
});

test('47. VictoryModal confetti explosion engine generates winner-themed multi-cannon bursts and steps aerodynamic physics cleanly', () => {
  const redPalette = getVictoryConfettiPalette('red');
  const bluePalette = getVictoryConfettiPalette('blue');
  assert.ok(redPalette.includes('#EF4444'));
  assert.ok(bluePalette.includes('#3B82F6'));
  assert.ok(redPalette.includes('#F59E0B')); // Royal Gold accent

  const wave0 = createVictoryConfettiBurst('red', 1280, 800, 0);
  const wave1 = createVictoryConfettiBurst('red', 1280, 800, 1);
  assert.equal(wave0.length, 96);
  assert.equal(wave1.length, 54);

  // Confetti includes all 4 distinct celebratory particle shapes
  const shapes = new Set(wave0.map((p) => p.shape));
  assert.deepEqual(
    shapes,
    new Set(['ribbon', 'diamond', 'star', 'circle'])
  );

  // Step physics forward 16ms and verify position, rotation, tilt, and gravity progression
  const stepped = stepVictoryConfettiParticles(wave0, 0.016, 1280, 800);
  assert.equal(stepped.length, 96);
  assert.notEqual(stepped[0].x, wave0[0].x);
  assert.notEqual(stepped[0].y, wave0[0].y);
  assert.notEqual(stepped[0].rotation, wave0[0].rotation);
  assert.notEqual(stepped[0].tiltAngle, wave0[0].tiltAngle);
});
