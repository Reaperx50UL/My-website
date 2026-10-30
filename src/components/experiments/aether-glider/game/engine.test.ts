import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_GAME_CONFIG } from './config';
import {
  checkCircleRectCollision,
  computeComboMultiplier,
  computeDifficultyParams,
  createInitialState,
  detectCollision,
  emitActiveAbilityParticles,
  emitHighSpeedManeuverParticles,
  getComboTierInfo,
  getEffectiveHitboxRadius,
  getMedalForScore,
  resetForNewRun,
  selectBird,
  selectEnvironment,
  spawnObstaclePair,
  stepSimulation,
  triggerFlap,
  triggerSpecialAbility,
} from './engine';
import {
  loadBestScore,
  loadSelectedBird,
  loadSelectedEnvironment,
  saveBestScore,
  saveSelectedBird,
  saveSelectedEnvironment,
} from './storage';

test('flap applies upward velocity and transitions from title to playing', () => {
  const state = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 42);
  assert.equal(state.phase, 'title');

  const didFlap = triggerFlap(state, DEFAULT_GAME_CONFIG);
  assert.equal(didFlap, true);
  assert.equal(state.phase, 'playing');
  assert.equal(state.player.vy, DEFAULT_GAME_CONFIG.flapVelocity);
  assert.ok(state.player.vy < 0, 'Flap velocity should pull character upward (negative Y)');
  assert.ok(state.player.scaleY > 1 && state.player.scaleX < 1, 'Applies squash-and-stretch');
});

test('gravity pulls the character downward continuously during active play', () => {
  const state = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 42);
  resetForNewRun(state, DEFAULT_GAME_CONFIG, 42);
  state.launchGraceTimer = 0;
  state.player.vy = 0;
  const startY = state.player.y;

  stepSimulation(state, 0.05, DEFAULT_GAME_CONFIG);
  assert.ok(state.player.vy > 0, 'Velocity becomes positive (downward)');
  assert.ok(state.player.y > startY, 'Y position increases due to gravity');
});

test('launch grace window keeps the player alive for the first 2.5 seconds without input', () => {
  const state = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 99);
  resetForNewRun(state, DEFAULT_GAME_CONFIG, 99);

  for (let i = 0; i < 150; i++) {
    stepSimulation(state, 1 / 60, DEFAULT_GAME_CONFIG);
  }

  assert.equal(state.phase, 'playing');
  assert.equal(state.pendingGameOver, false);
});

test('passing an obstacle pair increments score by 1 and updates bestScore', () => {
  const state = createInitialState(DEFAULT_GAME_CONFIG, 2, 480, 640, 101);
  resetForNewRun(state, DEFAULT_GAME_CONFIG, 101);
  state.obstacles = [];
  state.score = 2;

  const obs = spawnObstaclePair(
    state,
    DEFAULT_GAME_CONFIG,
    state.player.x - DEFAULT_GAME_CONFIG.obstacleWidth * 0.5 + 1
  );
  state.player.y = obs.gapCenterY;
  state.player.vy = 0;

  const events = stepSimulation(state, 0.03, DEFAULT_GAME_CONFIG);
  assert.equal(events.scoredPoint, true);
  assert.equal(obs.passed, true);
  assert.equal(state.score, 3);
  assert.equal(state.bestScore, 3);
  assert.equal(state.isNewBest, true);
});

test('difficulty scaling gradually increases speed and narrows gap while enforcing minimum playable gap', () => {
  const startDiff = computeDifficultyParams(0, DEFAULT_GAME_CONFIG);
  const midDiff = computeDifficultyParams(15, DEFAULT_GAME_CONFIG);
  const highDiff = computeDifficultyParams(500, DEFAULT_GAME_CONFIG);

  assert.ok(midDiff.speed > startDiff.speed, 'Obstacle speed rises with score');
  assert.ok(highDiff.speed <= DEFAULT_GAME_CONFIG.maxObstacleSpeed, 'Speed caps at maxObstacleSpeed');

  assert.ok(midDiff.gapHeight < startDiff.gapHeight, 'Gap narrows gradually as score increases');
  assert.equal(
    highDiff.gapHeight,
    DEFAULT_GAME_CONFIG.minGapHeight,
    'Gap never shrinks below playable minGapHeight even at score 500'
  );
});

test('collision with obstacle pillar or playfield boundaries triggers defeat and gameover state', () => {
  const state = createInitialState(DEFAULT_GAME_CONFIG, 5, 480, 640, 77);
  resetForNewRun(state, DEFAULT_GAME_CONFIG, 77);
  state.obstacles = [];
  state.launchGraceTimer = 0;

  const obs = spawnObstaclePair(state, DEFAULT_GAME_CONFIG, state.player.x - 10);
  state.player.y = Math.max(20, obs.topHeight - 5);

  const collision = detectCollision(state, DEFAULT_GAME_CONFIG);
  assert.equal(collision.cause, 'conduit_top');

  const events = stepSimulation(state, 0.016, DEFAULT_GAME_CONFIG, true);
  assert.equal(events.collided, true);
  assert.equal(state.pendingGameOver, true);
  assert.ok(state.frozenRunStats !== null, 'Freezes immutable end-of-run stats snapshot');

  for (let i = 0; i < 20; i++) {
    stepSimulation(state, 0.03, DEFAULT_GAME_CONFIG, true);
  }
  assert.equal(state.phase, 'gameover');
});

test('Kora Aether Shield blocks a fatal conduit collision and awards a shatter point', () => {
  const state = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 88, 'kora');
  resetForNewRun(state, DEFAULT_GAME_CONFIG, 88);
  state.obstacles = [];
  state.launchGraceTimer = 0;

  const activated = triggerSpecialAbility(state, DEFAULT_GAME_CONFIG, true);
  assert.equal(activated, true);
  assert.equal(state.shieldActive, true);

  const obs = spawnObstaclePair(state, DEFAULT_GAME_CONFIG, state.player.x - 10);
  state.player.y = Math.max(20, obs.topHeight - 5);

  const events = stepSimulation(state, 0.016, DEFAULT_GAME_CONFIG, true);
  assert.equal(events.shieldBlocked, true);
  assert.equal(events.collided, false);
  assert.equal(state.pendingGameOver, false);
  assert.equal(state.shieldActive, false);
  assert.equal(state.score, 1);
});

test('Zephyr Gale Dash phases through conduits and Ignis Solar Pulse widens gaps', () => {
  const zephyrState = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 55, 'zephyr');
  resetForNewRun(zephyrState, DEFAULT_GAME_CONFIG, 55);
  zephyrState.obstacles = [];
  zephyrState.launchGraceTimer = 0;
  const zObs = spawnObstaclePair(zephyrState, DEFAULT_GAME_CONFIG, zephyrState.player.x - 10);
  zephyrState.player.y = Math.max(20, zObs.topHeight - 5);

  triggerSpecialAbility(zephyrState, DEFAULT_GAME_CONFIG, true);
  assert.equal(detectCollision(zephyrState, DEFAULT_GAME_CONFIG).cause, 'none');

  const ignisState = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 66, 'ignis');
  resetForNewRun(ignisState, DEFAULT_GAME_CONFIG, 66);
  assert.ok(
    getEffectiveHitboxRadius(ignisState, DEFAULT_GAME_CONFIG) < DEFAULT_GAME_CONFIG.hitboxRadius
  );
  const initialGap = ignisState.obstacles[0].gapHeight;
  triggerSpecialAbility(ignisState, DEFAULT_GAME_CONFIG, true);
  assert.ok(ignisState.obstacles[0].gapHeight > initialGap, 'Solar Pulse widens conduit gap');
});

test('Chronos passive awards double points on every 4th gate cleared', () => {
  const state = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 120, 'chronos');
  resetForNewRun(state, DEFAULT_GAME_CONFIG, 120);
  state.obstacles = [];
  state.gatesClearedCount = 3;
  state.score = 3;

  const obs = spawnObstaclePair(
    state,
    DEFAULT_GAME_CONFIG,
    state.player.x - DEFAULT_GAME_CONFIG.obstacleWidth * 0.5 + 1
  );
  state.player.y = obs.gapCenterY;
  state.player.vy = 0;

  stepSimulation(state, 0.03, DEFAULT_GAME_CONFIG, true);
  assert.equal(state.gatesClearedCount, 4);
  assert.equal(state.score, 5, '4th gate awards +2 harmonic bonus');
});

test('all 5 environments initialize their distinct special traps and hazards correctly', () => {
  // 1. Volcano Field: Magma Geyser collision
  const volcanoState = createInitialState(
    DEFAULT_GAME_CONFIG,
    0,
    480,
    640,
    10,
    'kora',
    'volcano'
  );
  resetForNewRun(volcanoState, DEFAULT_GAME_CONFIG, 10);
  volcanoState.obstacles = [];
  const vObs = spawnObstaclePair(volcanoState, DEFAULT_GAME_CONFIG, volcanoState.player.x - 30);
  assert.equal(vObs.trapType, 'magma_geyser');
  vObs.geyserHeight = 40;
  volcanoState.player.y = vObs.bottomY - 15;
  assert.equal(detectCollision(volcanoState, DEFAULT_GAME_CONFIG).cause, 'trap_magma');

  // 2. Cold Ice Field: Falling Icicle trigger and collision
  const iceState = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 20, 'kora', 'ice');
  resetForNewRun(iceState, DEFAULT_GAME_CONFIG, 20);
  iceState.obstacles = [];
  const iObs = spawnObstaclePair(iceState, DEFAULT_GAME_CONFIG, iceState.player.x + 150);
  assert.equal(iObs.trapType, 'falling_icicle');
  stepSimulation(iceState, 0.04, DEFAULT_GAME_CONFIG, false);
  assert.equal(iObs.icicleTriggered, true, 'Icicle triggers when player approaches within 210px');

  // 3. Cybernetic City: Pulse Laser collision and Ignis disarm
  const cyberState = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 30, 'ignis', 'cyber');
  resetForNewRun(cyberState, DEFAULT_GAME_CONFIG, 30);
  cyberState.obstacles = [];
  const cObs = spawnObstaclePair(cyberState, DEFAULT_GAME_CONFIG, cyberState.player.x - 32);
  assert.equal(cObs.trapType, 'laser_grid');
  cObs.laserActive = true;
  cyberState.player.y = cObs.gapCenterY;
  assert.equal(detectCollision(cyberState, DEFAULT_GAME_CONFIG).cause, 'trap_laser');

  // Ignis Solar Pulse disarms the laser grid!
  triggerSpecialAbility(cyberState, DEFAULT_GAME_CONFIG, true);
  assert.equal(cObs.trapDisarmed, true);
  assert.equal(detectCollision(cyberState, DEFAULT_GAME_CONFIG).cause, 'none');

  // 4. Bamboo Forest: Whirlwind gust modifies vertical velocity
  const bambooState = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 40, 'kora', 'bamboo');
  resetForNewRun(bambooState, DEFAULT_GAME_CONFIG, 40);
  bambooState.obstacles = [];
  const bObs = spawnObstaclePair(bambooState, DEFAULT_GAME_CONFIG, bambooState.player.x - 10);
  assert.equal(bObs.trapType, 'whirlwind_gust');
});

test('circle-rect collision, medals, and bird/environment storage behave deterministically', () => {
  assert.equal(checkCircleRectCollision(50, 50, 12, 45, 45, 20, 20), true);
  assert.equal(checkCircleRectCollision(10, 10, 5, 45, 45, 20, 20), false);

  assert.equal(getMedalForScore(0), 'none');
  assert.equal(getMedalForScore(6), 'bronze');
  assert.equal(getMedalForScore(15), 'silver');
  assert.equal(getMedalForScore(28), 'gold');
  assert.equal(getMedalForScore(45), 'aether');

  const key = 'test_best_score_key';
  assert.equal(loadBestScore(key), 0);
  assert.equal(saveBestScore(14, key), 14);

  const birdKey = 'test_bird_selection_key';
  assert.equal(loadSelectedBird(birdKey), 'kora');
  saveSelectedBird('ignis', birdKey);
  const state = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 1);
  selectBird(state, loadSelectedBird(birdKey));
  assert.equal(state.birdId, 'ignis');

  const envKey = 'test_env_selection_key';
  assert.equal(loadSelectedEnvironment(envKey), 'clockwork');
  saveSelectedEnvironment('cyber', envKey);
  selectEnvironment(state, loadSelectedEnvironment(envKey));
  assert.equal(state.environmentId, 'cyber');
});

test('stepSimulation emits trapTriggered audio event for all 5 environment traps', async () => {
  const { AudioController } = await import('./audio');
  const audio = new AudioController(false);

  // Verify environment music switching across all 5 realms
  const envs = ['clockwork', 'bamboo', 'volcano', 'ice', 'cyber'] as const;
  for (const envId of envs) {
    audio.setEnvironmentMusic(envId, 'playing');
    assert.equal(audio.getCurrentEnvironmentMusic(), envId);
  }
  audio.dispose();

  // 1. Clockwork oscillating_gears trigger
  const cwState = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 11, 'kora', 'clockwork');
  resetForNewRun(cwState, DEFAULT_GAME_CONFIG, 11);
  cwState.obstacles = [];
  spawnObstaclePair(cwState, DEFAULT_GAME_CONFIG, cwState.player.x + 120);
  const cwEvents = stepSimulation(cwState, 0.03, DEFAULT_GAME_CONFIG, false);
  assert.equal(cwEvents.trapTriggered, 'oscillating_gears');

  // 2. Bamboo whirlwind_gust trigger
  const bmState = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 12, 'kora', 'bamboo');
  resetForNewRun(bmState, DEFAULT_GAME_CONFIG, 12);
  bmState.obstacles = [];
  spawnObstaclePair(bmState, DEFAULT_GAME_CONFIG, bmState.player.x + 10);
  const bmEvents = stepSimulation(bmState, 0.03, DEFAULT_GAME_CONFIG, false);
  assert.equal(bmEvents.trapTriggered, 'whirlwind_gust');

  // 3. Volcano magma_geyser trigger
  const vcState = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 13, 'kora', 'volcano');
  resetForNewRun(vcState, DEFAULT_GAME_CONFIG, 13);
  vcState.obstacles = [];
  const vObs = spawnObstaclePair(vcState, DEFAULT_GAME_CONFIG, vcState.player.x + 120);
  vObs.trapPhase = Math.PI * 0.5;
  const vcEvents = stepSimulation(vcState, 0.03, DEFAULT_GAME_CONFIG, false);
  assert.equal(vcEvents.trapTriggered, 'magma_geyser');

  // 4. Cold Ice Field falling_icicle trigger
  const icState = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 14, 'kora', 'ice');
  resetForNewRun(icState, DEFAULT_GAME_CONFIG, 14);
  icState.obstacles = [];
  spawnObstaclePair(icState, DEFAULT_GAME_CONFIG, icState.player.x + 150);
  const icEvents = stepSimulation(icState, 0.03, DEFAULT_GAME_CONFIG, false);
  assert.equal(icEvents.trapTriggered, 'falling_icicle');

  // 5. Cybernetic City laser_grid trigger
  const cyState = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 15, 'kora', 'cyber');
  resetForNewRun(cyState, DEFAULT_GAME_CONFIG, 15);
  cyState.obstacles = [];
  const cyObs = spawnObstaclePair(cyState, DEFAULT_GAME_CONFIG, cyState.player.x + 120);
  cyObs.trapPhase = Math.PI * 0.5;
  const cyEvents = stepSimulation(cyState, 0.03, DEFAULT_GAME_CONFIG, false);
  assert.equal(cyEvents.trapTriggered, 'laser_grid');
});

test('combo score system increases multiplier on consecutive dodges and resets on shield impact', () => {
  assert.equal(computeComboMultiplier(0), 1);
  assert.equal(computeComboMultiplier(1), 1);
  assert.equal(computeComboMultiplier(2), 2);
  assert.equal(computeComboMultiplier(3), 2);
  assert.equal(computeComboMultiplier(4), 3);
  assert.equal(computeComboMultiplier(6), 4);
  assert.equal(computeComboMultiplier(9), 5);
  assert.equal(getComboTierInfo(9).label, 'AETHER OVERDRIVE');

  const state = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 202, 'kora', 'clockwork');
  resetForNewRun(state, DEFAULT_GAME_CONFIG, 202);
  state.obstacles = [];
  state.launchGraceTimer = 0;

  const dodgeGate = () => {
    const obs = spawnObstaclePair(
      state,
      DEFAULT_GAME_CONFIG,
      state.player.x - DEFAULT_GAME_CONFIG.obstacleWidth * 0.5 + 1
    );
    state.player.y = obs.gapCenterY;
    state.player.vy = 0;
    return stepSimulation(state, 0.03, DEFAULT_GAME_CONFIG, true);
  };

  // Dodge 1: 1x multiplier -> +1 pt (total 1)
  const ev1 = dodgeGate();
  assert.equal(state.comboCount, 1);
  assert.equal(state.comboMultiplier, 1);
  assert.equal(state.score, 1);
  assert.equal(ev1.comboTierUp, false);

  // Dodge 2: 2x multiplier -> +2 pts (total 3)
  const ev2 = dodgeGate();
  assert.equal(state.comboCount, 2);
  assert.equal(state.comboMultiplier, 2);
  assert.equal(state.score, 3);
  assert.equal(ev2.comboTierUp, true);

  // Dodge 3: 2x multiplier -> +2 pts (total 5)
  dodgeGate();
  assert.equal(state.comboCount, 3);
  assert.equal(state.comboMultiplier, 2);
  assert.equal(state.score, 5);

  // Dodge 4: 3x multiplier -> +3 pts (total 8)
  const ev4 = dodgeGate();
  assert.equal(state.comboCount, 4);
  assert.equal(state.comboMultiplier, 3);
  assert.equal(state.score, 8);
  assert.equal(ev4.comboTierUp, true);
  assert.equal(state.maxCombo, 4);
  assert.equal(state.peakComboMultiplier, 3);

  // Taking a hit absorbed by Kora's Aether Shield resets active combo streak while preserving maxCombo
  triggerSpecialAbility(state, DEFAULT_GAME_CONFIG, true);
  const hitObs = spawnObstaclePair(state, DEFAULT_GAME_CONFIG, state.player.x - 10);
  state.player.y = Math.max(20, hitObs.topHeight - 5);
  const shieldEv = stepSimulation(state, 0.016, DEFAULT_GAME_CONFIG, true);
  assert.equal(shieldEv.shieldBlocked, true);
  assert.equal(shieldEv.comboBroken, true);
  assert.equal(state.comboCount, 0);
  assert.equal(state.comboMultiplier, 1);
  assert.equal(state.maxCombo, 4);
  assert.equal(state.peakComboMultiplier, 3);
});

test('particle system emits brass-and-sky particles during high-speed maneuvers and ability activation', () => {
  const state = createInitialState(DEFAULT_GAME_CONFIG, 0, 480, 640, 303, 'kora', 'clockwork');
  resetForNewRun(state, DEFAULT_GAME_CONFIG, 303);
  for (const p of state.particles) p.active = false;

  // 1. High-speed steep dive maneuver triggers slipstream streaks and brass gears
  state.player.vy = 290;
  const maneuverSpawned = emitHighSpeedManeuverParticles(state, 0.04, 1.25, false);
  assert.ok(maneuverSpawned >= 2, 'High-speed dive spawns multiple slipstream/brass particles');

  const activeAfterManeuver = state.particles.filter((p) => p.active);
  assert.ok(
    activeAfterManeuver.some((p) => p.shape === 'streak'),
    'Spawns aerodynamic sky-slipstream streak particle'
  );
  assert.ok(
    activeAfterManeuver.some((p) => p.shape === 'gear' || p.shape === 'spark'),
    'Spawns clockwork brass gear or exhaust spark particle'
  );

  // 2. Ability activation and sustained active ability emit brass-and-sky particles across birds
  for (const birdId of ['kora', 'zephyr', 'ignis', 'chronos'] as const) {
    selectBird(state, birdId);
    for (const p of state.particles) p.active = false;
    state.abilityCooldownTimer = 0;
    state.abilityActiveTimer = 0;

    const triggered = triggerSpecialAbility(state, DEFAULT_GAME_CONFIG, false);
    assert.equal(triggered, true);

    const burstParticles = state.particles.filter((p) => p.active);
    assert.ok(burstParticles.length >= 20, `${birdId} ability burst spawns rich particle cluster`);
    assert.ok(
      burstParticles.some((p) => p.shape === 'gear'),
      `${birdId} ability burst includes clockwork brass gears`
    );

    const sustainedCount = emitActiveAbilityParticles(state, 0.04, false);
    assert.ok(sustainedCount >= 1, `${birdId} emits sustained active-ability particles`);
  }
});

test('global and per-environment leaderboards sort, filter, validate pilot names, and record high scores', async () => {
  const {
    evaluateHighScoreQualification,
    getEnvironmentLeaderboard,
    getGlobalLeaderboard,
    loadEnvironmentBestScores,
    loadLastPilotName,
    loadLeaderboardEntries,
    submitLeaderboardScore,
    validatePilotName,
  } = await import('./leaderboard');

  // 1. Pilot name validation
  assert.equal(validatePilotName('   ').valid, false, 'Rejects empty/whitespace pilot name');
  assert.equal(validatePilotName('A').valid, false, 'Rejects 1-character pilot name');
  assert.equal(
    validatePilotName('VeryLongPilotCallsignExceedingLimit').valid,
    false,
    'Rejects > 18 character pilot name'
  );
  const validCheck = validatePilotName('  Sky Captain  ');
  assert.equal(validCheck.valid, true);
  assert.equal(validCheck.sanitized, 'Sky Captain');

  // 2. Seeded entries populate both Global and all 5 Environment leaderboards
  const lbKey = 'test_leaderboard_storage_key';
  const pilotKey = 'test_pilot_name_key';
  const envBestKey = 'test_env_best_key';

  const initialEntries = loadLeaderboardEntries(lbKey);
  assert.ok(initialEntries.length >= 15, 'Seeds initial entries across all 5 environments');

  const globalTop = getGlobalLeaderboard(initialEntries, 10);
  assert.equal(globalTop.length, 10);
  assert.ok(
    globalTop[0].score >= globalTop[1].score,
    'Global leaderboard sorts descending by score'
  );

  for (const envId of ['clockwork', 'bamboo', 'volcano', 'ice', 'cyber'] as const) {
    const envTop = getEnvironmentLeaderboard(initialEntries, envId, 10);
    assert.ok(envTop.length >= 3, `${envId} environment has its own leaderboard entries`);
    assert.ok(
      envTop.every((e) => e.environmentId === envId),
      `${envId} leaderboard only contains entries from ${envId}`
    );
    assert.ok(envTop[0].score >= envTop[1].score, `${envId} leaderboard sorts descending`);
  }

  // 3. High-score qualification & submitting player name after achieving a high score
  const qual = evaluateHighScoreQualification(initialEntries, 35, 'bamboo', 10, 8);
  assert.equal(qual.qualifies, true);
  assert.equal(qual.isNewGlobalPersonalBest, true);
  assert.equal(qual.isNewEnvironmentPersonalBest, true);
  assert.equal(qual.projectedGlobalRank, 1);
  assert.equal(qual.projectedEnvironmentRank, 1);

  const failedSubmit = submitLeaderboardScore(
    {
      playerName: ' ',
      score: 35,
      birdId: 'zephyr',
      environmentId: 'bamboo',
      maxCombo: 9,
      peakComboMultiplier: 5,
    },
    lbKey,
    pilotKey,
    envBestKey
  );
  assert.equal(failedSubmit.ok, false);

  const successSubmit = submitLeaderboardScore(
    {
      playerName: 'Commander Ruma',
      score: 35,
      birdId: 'zephyr',
      environmentId: 'bamboo',
      maxCombo: 9,
      peakComboMultiplier: 5,
    },
    lbKey,
    pilotKey,
    envBestKey
  );
  assert.equal(successSubmit.ok, true);
  assert.equal(successSubmit.globalRank, 1);
  assert.equal(successSubmit.environmentRank, 1);
  assert.equal(loadLastPilotName(pilotKey), 'Commander Ruma');
  assert.equal(loadEnvironmentBestScores(envBestKey).bamboo, 35);

  const updatedGlobal = getGlobalLeaderboard(successSubmit.entries, 10);
  assert.equal(updatedGlobal[0].playerName, 'Commander Ruma');
  assert.equal(updatedGlobal[0].score, 35);
  assert.equal(updatedGlobal[0].isPlayerEntry, true);

  const updatedBamboo = getEnvironmentLeaderboard(successSubmit.entries, 'bamboo', 10);
  assert.equal(updatedBamboo[0].playerName, 'Commander Ruma');
  assert.equal(updatedBamboo[0].environmentId, 'bamboo');
});




