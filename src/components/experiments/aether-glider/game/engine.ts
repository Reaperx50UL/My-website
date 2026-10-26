import {
  BirdId,
  CEILING_HEIGHT,
  DEFAULT_GAME_CONFIG,
  EnvironmentId,
  GROUND_HEIGHT,
  GameConfig,
  WORLD_HEIGHT,
  getBirdProfile,
  getEnvironmentProfile,
} from './config';
import {
  DefeatCause,
  DifficultyParams,
  FloatingPopup,
  MedalTier,
  ObstaclePair,
  Particle,
  ParticleShape,
  SimulationState,
} from './types';

export const PARTICLE_POOL_SIZE = 96;
export const POPUP_POOL_SIZE = 12;

/** Deterministic Mulberry32-style PRNG step */
export function nextRandom(state: SimulationState): number {
  let t = (state.rngState += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  state.rngState = t >>> 0;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function getMedalForScore(score: number): MedalTier {
  if (score >= 40) return 'aether';
  if (score >= 25) return 'gold';
  if (score >= 12) return 'silver';
  if (score >= 5) return 'bronze';
  return 'none';
}

export function computeDifficultyParams(
  score: number,
  config: GameConfig = DEFAULT_GAME_CONFIG
): DifficultyParams {
  const safeScore = Math.max(0, score);

  const speed = Math.min(
    config.maxObstacleSpeed,
    config.baseObstacleSpeed + safeScore * config.speedIncreasePerPoint
  );

  const enforcedMinGap = Math.max(92, config.minGapHeight);
  const rawGap = config.initialGapHeight - safeScore * config.gapNarrowingPerPoint;
  const gapHeight = Math.max(enforcedMinGap, Math.min(config.initialGapHeight, rawGap));

  const spacingReduction = Math.min(45, safeScore * 1.1);
  const spawnSpacingPx = Math.max(
    config.minObstacleSpacingPx,
    config.obstacleSpacingPx - spacingReduction
  );

  const verticalVariance = Math.min(210, 95 + safeScore * 3.5);
  const multiplier = Number((speed / config.baseObstacleSpeed).toFixed(2));

  let tierLabel = 'Calm Skies';
  if (safeScore >= 35) tierLabel = 'Aether Tempest';
  else if (safeScore >= 20) tierLabel = 'Gale Force';
  else if (safeScore >= 10) tierLabel = 'Rising Tradewind';
  else if (safeScore >= 4) tierLabel = 'Steady Breeze';

  return {
    speed,
    gapHeight,
    spawnSpacingPx,
    verticalVariance,
    multiplier,
    tierLabel,
  };
}

export function createParticlePool(): Particle[] {
  const pool: Particle[] = [];
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    pool.push({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 4,
      alpha: 0,
      life: 0,
      maxLife: 0.5,
      color: '#F59E0B',
      shape: 'spark',
      rotation: 0,
      vRot: 0,
    });
  }
  return pool;
}

export function createPopupPool(): FloatingPopup[] {
  const pool: FloatingPopup[] = [];
  for (let i = 0; i < POPUP_POOL_SIZE; i++) {
    pool.push({
      active: false,
      x: 0,
      y: 0,
      vy: -40,
      text: '',
      subtext: '',
      alpha: 0,
      life: 0,
      maxLife: 0.9,
      color: '#FDE68A',
      scale: 1,
    });
  }
  return pool;
}

export function spawnPooledParticle(
  state: SimulationState,
  opts: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    maxLife: number;
    color: string;
    shape: ParticleShape;
    rotation?: number;
    vRot?: number;
  }
): void {
  const p = state.particles[state.particleCursor % state.particles.length];
  state.particleCursor = (state.particleCursor + 1) % state.particles.length;
  p.active = true;
  p.x = opts.x;
  p.y = opts.y;
  p.vx = opts.vx;
  p.vy = opts.vy;
  p.size = opts.size;
  p.alpha = 1;
  p.life = 0;
  p.maxLife = Math.max(0.08, opts.maxLife);
  p.color = opts.color;
  p.shape = opts.shape;
  p.rotation = opts.rotation ?? 0;
  p.vRot = opts.vRot ?? 0;
}

export function spawnFloatingPopup(
  state: SimulationState,
  x: number,
  y: number,
  text: string,
  subtext = '',
  color = '#FDE68A'
): void {
  for (let i = 0; i < state.popups.length; i++) {
    const popup = state.popups[i];
    if (!popup.active) {
      popup.active = true;
      popup.x = x;
      popup.y = y;
      popup.vy = -52;
      popup.text = text;
      popup.subtext = subtext;
      popup.alpha = 1;
      popup.life = 0;
      popup.maxLife = subtext ? 1.15 : 0.85;
      popup.color = color;
      popup.scale = subtext ? 1.15 : 1;
      return;
    }
  }
}

export function createInitialState(
  config: GameConfig = DEFAULT_GAME_CONFIG,
  bestScore = 0,
  worldWidth = 480,
  worldHeight = WORLD_HEIGHT,
  seed = 1337,
  birdId: BirdId = 'kora',
  environmentId: EnvironmentId = 'clockwork'
): SimulationState {
  const playableHeight = worldHeight - GROUND_HEIGHT - CEILING_HEIGHT;
  const startY = CEILING_HEIGHT + playableHeight * 0.44;
  const startX = Math.max(96, Math.min(148, Math.round(worldWidth * 0.26)));

  return {
    phase: 'title',
    birdId,
    environmentId,
    worldWidth,
    worldHeight,
    groundHeight: GROUND_HEIGHT,
    ceilingHeight: CEILING_HEIGHT,
    player: {
      x: startX,
      y: startY,
      vy: 0,
      rotation: 0,
      wingPhase: 0,
      scaleX: 1,
      scaleY: 1,
      flapImpulseTimer: 0,
      hitFlashTimer: 0,
      trail: [],
    },
    obstacles: [],
    popups: createPopupPool(),
    particles: createParticlePool(),
    particleCursor: 0,
    score: 0,
    gatesClearedCount: 0,
    bestScore,
    isNewBest: false,
    flightTimeSec: 0,
    launchGraceTimer: config.launchGraceDuration,
    hasFlappedInRun: false,
    abilityActiveTimer: 0,
    abilityCooldownTimer: 0,
    shieldActive: false,
    abilitiesUsed: 0,
    hitstopTimer: 0,
    defeatDelayTimer: 0,
    pendingGameOver: false,
    cameraTrauma: 0,
    distanceTraveled: 0,
    distanceSinceLastSpawn: 0,
    nextObstacleId: 1,
    rngState: seed >>> 0,
    lastGapCenterY: startY,
    causeOfDefeat: 'none',
    frozenRunStats: null,
  };
}

export function selectBird(state: SimulationState, birdId: BirdId): void {
  state.birdId = birdId;
  state.abilityActiveTimer = 0;
  state.abilityCooldownTimer = 0;
  state.shieldActive = false;
}

export function selectEnvironment(state: SimulationState, environmentId: EnvironmentId): void {
  state.environmentId = environmentId;
  const env = getEnvironmentProfile(environmentId);
  for (let i = 0; i < state.obstacles.length; i++) {
    state.obstacles[i].trapType = env.trapType;
  }
}

export function resetForNewRun(
  state: SimulationState,
  config: GameConfig = DEFAULT_GAME_CONFIG,
  seed = Date.now()
): void {
  const playableHeight = state.worldHeight - state.groundHeight - state.ceilingHeight;
  const startY = state.ceilingHeight + playableHeight * 0.44;
  const startX = Math.max(96, Math.min(148, Math.round(state.worldWidth * 0.26)));
  const bird = getBirdProfile(state.birdId);

  state.phase = 'playing';
  state.player.x = startX;
  state.player.y = startY;
  state.player.vy = config.flapVelocity * bird.flapScale * 0.55;
  state.player.rotation = -0.18;
  state.player.wingPhase = 0;
  state.player.scaleX = 0.9;
  state.player.scaleY = 1.12;
  state.player.flapImpulseTimer = 0.14;
  state.player.hitFlashTimer = 0;
  state.player.trail = [];

  state.obstacles = [];
  for (const p of state.particles) p.active = false;
  for (const pop of state.popups) pop.active = false;

  state.score = 0;
  state.gatesClearedCount = 0;
  state.isNewBest = false;
  state.flightTimeSec = 0;
  state.launchGraceTimer = config.launchGraceDuration;
  state.hasFlappedInRun = false;
  state.abilityActiveTimer = 0;
  state.abilityCooldownTimer = 0;
  state.shieldActive = false;
  state.abilitiesUsed = 0;
  state.hitstopTimer = 0;
  state.defeatDelayTimer = 0;
  state.pendingGameOver = false;
  state.cameraTrauma = 0;
  state.distanceTraveled = 0;
  state.distanceSinceLastSpawn = 0;
  state.nextObstacleId = 1;
  state.rngState = seed >>> 0;
  state.lastGapCenterY = startY;
  state.causeOfDefeat = 'none';
  state.frozenRunStats = null;

  spawnObstaclePair(state, config, state.player.x + 510);
}

export function triggerFlap(
  state: SimulationState,
  config: GameConfig = DEFAULT_GAME_CONFIG,
  reducedMotion = false
): boolean {
  if (state.phase === 'paused' || state.phase === 'gameover' || state.pendingGameOver) {
    return false;
  }

  if (state.phase === 'title') {
    resetForNewRun(state, config);
  }

  const bird = getBirdProfile(state.birdId);
  state.hasFlappedInRun = true;
  state.player.vy = Math.max(config.maxRiseSpeed, config.flapVelocity * bird.flapScale);
  state.player.scaleX = 0.85;
  state.player.scaleY = 1.18;
  state.player.flapImpulseTimer = 0.18;
  state.player.wingPhase = 0.15;

  const count = reducedMotion ? 2 : 5;
  for (let i = 0; i < count; i++) {
    const angle = Math.PI * 0.65 + (nextRandom(state) - 0.5) * 0.8;
    const speed = 45 + nextRandom(state) * 75;
    spawnPooledParticle(state, {
      x: state.player.x - 10,
      y: state.player.y + 6,
      vx: Math.cos(angle) * speed - 35,
      vy: Math.sin(angle) * speed,
      size: 3 + nextRandom(state) * 3,
      maxLife: 0.28 + nextRandom(state) * 0.18,
      color: i % 2 === 0 ? bird.colors.wing : bird.colors.auraHex,
      shape: i === 0 ? 'feather' : 'spark',
      rotation: nextRandom(state) * Math.PI * 2,
      vRot: (nextRandom(state) - 0.5) * 6,
    });
  }

  return true;
}

/**
 * Triggers the active special ability of the currently selected bird.
 */
export function triggerSpecialAbility(
  state: SimulationState,
  config: GameConfig = DEFAULT_GAME_CONFIG,
  reducedMotion = false
): boolean {
  if (
    state.phase !== 'playing' ||
    state.pendingGameOver ||
    state.abilityCooldownTimer > 0 ||
    state.abilityActiveTimer > 0
  ) {
    return false;
  }

  const bird = getBirdProfile(state.birdId);
  state.abilityActiveTimer = bird.abilityDurationSec;
  state.abilityCooldownTimer = bird.abilityCooldownSec;
  state.abilitiesUsed += 1;

  if (bird.id === 'kora') {
    state.shieldActive = true;
    spawnFloatingPopup(
      state,
      state.player.x + 10,
      Math.max(58, state.player.y - 30),
      'SHIELD UP',
      'AETHER WARD',
      '#FBBF24'
    );
  } else if (bird.id === 'zephyr') {
    state.player.vy = 0;
    state.player.scaleX = 1.24;
    state.player.scaleY = 0.82;
    spawnFloatingPopup(
      state,
      state.player.x + 14,
      Math.max(58, state.player.y - 30),
      'GALE DASH',
      'PHASE SURGE',
      '#38BDF8'
    );
  } else if (bird.id === 'ignis') {
    let widenedCount = 0;
    const minTop = 18;
    const maxBottom = state.worldHeight - state.groundHeight - 18;
    for (let i = 0; i < state.obstacles.length; i++) {
      const obs = state.obstacles[i];
      if (obs.x + obs.width > state.player.x - 20) {
        obs.gapHeight += 58;
        const half = obs.gapHeight / 2;
        obs.topHeight = Math.max(minTop, obs.gapCenterY - half);
        obs.bottomY = Math.min(maxBottom, obs.gapCenterY + half);
        obs.trapDisarmed = true;
        obs.geyserHeight = 0;
        obs.laserActive = false;
        widenedCount++;
      }
    }
    if (widenedCount > 0) {
      state.score += 1;
      if (state.score > state.bestScore) {
        state.bestScore = state.score;
        state.isNewBest = true;
      }
    }
    spawnFloatingPopup(
      state,
      state.player.x + 14,
      Math.max(58, state.player.y - 30),
      widenedCount > 0 ? '+1 PULSE' : 'SOLAR PULSE',
      'GAPS & TRAPS CLEARED',
      '#F87171'
    );
  } else if (bird.id === 'chronos') {
    state.player.vy *= 0.35;
    spawnFloatingPopup(
      state,
      state.player.x + 14,
      Math.max(58, state.player.y - 30),
      'TIME SLOW',
      'CHRONO FIELD',
      '#34D399'
    );
  }

  const ringCount = reducedMotion ? 4 : 12;
  for (let i = 0; i < ringCount; i++) {
    const ang = (Math.PI * 2 * i) / ringCount;
    const spd = 65 + nextRandom(state) * 85;
    spawnPooledParticle(state, {
      x: state.player.x,
      y: state.player.y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      size: i % 3 === 0 ? 5.5 : 3.5,
      maxLife: 0.45,
      color: bird.colors.auraHex,
      shape: i % 3 === 0 ? 'ring' : 'spark',
    });
  }

  return true;
}

export function spawnObstaclePair(
  state: SimulationState,
  config: GameConfig = DEFAULT_GAME_CONFIG,
  spawnX?: number
): ObstaclePair {
  const diff = computeDifficultyParams(state.score, config);
  const env = getEnvironmentProfile(state.environmentId);
  const halfGap = diff.gapHeight / 2;
  const minCenterY = state.ceilingHeight + config.verticalSafeMargin + halfGap;
  const maxCenterY =
    state.worldHeight - state.groundHeight - config.verticalSafeMargin - halfGap;

  const delta = (nextRandom(state) * 2 - 1) * diff.verticalVariance;
  const rawCenterY = state.lastGapCenterY + delta;
  const clampedCenterY = Math.max(minCenterY, Math.min(maxCenterY, rawCenterY));
  state.lastGapCenterY = clampedCenterY;

  const topHeight = Math.max(24, clampedCenterY - halfGap);
  const bottomY = clampedCenterY + halfGap;
  const x = spawnX ?? state.worldWidth + 60;

  const pair: ObstaclePair = {
    id: state.nextObstacleId++,
    x,
    baseGapCenterY: clampedCenterY,
    gapCenterY: clampedCenterY,
    gapHeight: diff.gapHeight,
    width: config.obstacleWidth,
    passed: false,
    topHeight,
    bottomY,
    gaugeAngle: nextRandom(state) * Math.PI * 2,
    trapType: env.trapType,
    trapPhase: nextRandom(state) * Math.PI * 2,
    trapDisarmed: false,
    windDirection: nextRandom(state) > 0.5 ? 1 : -1,
    geyserHeight: 0,
    icicleTriggered: false,
    icicleY: topHeight,
    icicleVy: 0,
    laserActive: false,
  };

  state.obstacles.push(pair);
  return pair;
}

export function checkCircleRectCollision(
  cx: number,
  cy: number,
  radius: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}

export function getEffectiveHitboxRadius(
  state: SimulationState,
  config: GameConfig = DEFAULT_GAME_CONFIG
): number {
  const bird = getBirdProfile(state.birdId);
  return config.hitboxRadius * bird.hitboxScale;
}

export function detectCollision(
  state: SimulationState,
  config: GameConfig = DEFAULT_GAME_CONFIG
): { cause: DefeatCause; obstacleIndex: number } {
  const px = state.player.x;
  const py = state.player.y;
  const r = getEffectiveHitboxRadius(state, config);

  const floorY = state.worldHeight - state.groundHeight;
  if (py + r >= floorY) {
    return { cause: 'cloud_deck', obstacleIndex: -1 };
  }

  if (py - r <= state.ceilingHeight) {
    return { cause: 'stratosphere', obstacleIndex: -1 };
  }

  // Zephyr's Gale Dash phases invulnerably through conduit pillars and traps while active
  if (state.birdId === 'zephyr' && state.abilityActiveTimer > 0) {
    return { cause: 'none', obstacleIndex: -1 };
  }

  for (let i = 0; i < state.obstacles.length; i++) {
    const obs = state.obstacles[i];
    if (obs.shatteredByShield) continue;
    if (px + r < obs.x || px - r > obs.x + obs.width) {
      continue;
    }

    // 1. Standard Top & Bottom Conduit Pillars
    if (
      obs.topHeight > 0 &&
      checkCircleRectCollision(px, py, r, obs.x, 0, obs.width, obs.topHeight)
    ) {
      return { cause: 'conduit_top', obstacleIndex: i };
    }
    const bottomHeight = state.worldHeight - state.groundHeight - obs.bottomY;
    if (
      bottomHeight > 0 &&
      checkCircleRectCollision(px, py, r, obs.x, obs.bottomY, obs.width, bottomHeight)
    ) {
      return { cause: 'conduit_bottom', obstacleIndex: i };
    }

    // 2. Environment-Specific Active Traps inside the gap
    if (!obs.trapDisarmed) {
      // Volcano Field: Erupting Magma Geyser Jet
      if (obs.trapType === 'magma_geyser' && obs.geyserHeight > 10) {
        const jetX = obs.x + obs.width * 0.28;
        const jetW = obs.width * 0.44;
        const jetY = obs.bottomY - obs.geyserHeight;
        if (checkCircleRectCollision(px, py, r, jetX, jetY, jetW, obs.geyserHeight)) {
          return { cause: 'trap_magma', obstacleIndex: i };
        }
      }

      // Cold Ice Field: Falling Glacial Icicle
      if (
        obs.trapType === 'falling_icicle' &&
        obs.icicleTriggered &&
        obs.icicleY < state.worldHeight - state.groundHeight
      ) {
        const icicleX = obs.x + obs.width * 0.5 - 7;
        const icicleW = 14;
        const icicleH = 26;
        if (checkCircleRectCollision(px, py, r, icicleX, obs.icicleY, icicleW, icicleH)) {
          return { cause: 'trap_icicle', obstacleIndex: i };
        }
      }

      // Cybernetic City: Pulsing Holo-Laser Grid
      if (obs.trapType === 'laser_grid' && obs.laserActive) {
        const beamX = obs.x + obs.width * 0.5 - 5;
        const beamW = 10;
        const beamY = obs.topHeight;
        const beamH = Math.max(0, obs.bottomY - obs.topHeight);
        if (checkCircleRectCollision(px, py, r, beamX, beamY, beamW, beamH)) {
          return { cause: 'trap_laser', obstacleIndex: i };
        }
      }
    }
  }

  return { cause: 'none', obstacleIndex: -1 };
}

function triggerDefeatSequence(
  state: SimulationState,
  cause: DefeatCause,
  config: GameConfig,
  reducedMotion: boolean
): void {
  state.causeOfDefeat = cause;
  state.pendingGameOver = true;
  state.hitstopTimer = reducedMotion ? 0.02 : 0.06;
  state.defeatDelayTimer = reducedMotion ? 0.12 : 0.36;
  state.player.hitFlashTimer = 0.25;
  state.cameraTrauma = reducedMotion ? 0 : 0.72;

  const diff = computeDifficultyParams(state.score, config);
  state.frozenRunStats = {
    score: state.score,
    bestScore: state.bestScore,
    isNewBest: state.isNewBest,
    gatesCleared: state.gatesClearedCount,
    flightTimeSec: Number(state.flightTimeSec.toFixed(1)),
    peakSpeedMultiplier: diff.multiplier,
    medal: getMedalForScore(state.score),
    causeOfDefeat: cause,
    birdId: state.birdId,
    environmentId: state.environmentId,
    abilitiesUsed: state.abilitiesUsed,
  };

  const burstCount = reducedMotion ? 6 : 20;
  for (let i = 0; i < burstCount; i++) {
    const angle = (Math.PI * 2 * i) / burstCount + (nextRandom(state) - 0.5) * 0.3;
    const speed = 60 + nextRandom(state) * 160;
    spawnPooledParticle(state, {
      x: state.player.x,
      y: state.player.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      size: 3 + nextRandom(state) * 4.5,
      maxLife: 0.35 + nextRandom(state) * 0.3,
      color: i % 3 === 0 ? '#FCA5A5' : i % 2 === 0 ? '#FBBF24' : '#FDE68A',
      shape: i % 4 === 0 ? 'ring' : 'spark',
      rotation: nextRandom(state) * Math.PI * 2,
      vRot: (nextRandom(state) - 0.5) * 8,
    });
  }
}

export interface StepEvents {
  scoredPoint: boolean;
  milestoneReached: boolean;
  collided: boolean;
  shieldBlocked: boolean;
  gameOverTransitioned: boolean;
}

export function stepSimulation(
  state: SimulationState,
  rawDt: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
  reducedMotion = false
): StepEvents {
  const events: StepEvents = {
    scoredPoint: false,
    milestoneReached: false,
    collided: false,
    shieldBlocked: false,
    gameOverTransitioned: false,
  };

  const dt = Math.max(0, Math.min(rawDt, 0.05));
  if (dt === 0) return events;

  const bird = getBirdProfile(state.birdId);
  const env = getEnvironmentProfile(state.environmentId);

  state.cameraTrauma = Math.max(0, state.cameraTrauma - dt * 1.9);
  if (state.player.hitFlashTimer > 0) {
    state.player.hitFlashTimer = Math.max(0, state.player.hitFlashTimer - dt);
  }

  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i];
    if (!p.active) continue;
    p.life += dt;
    if (p.life >= p.maxLife) {
      p.active = false;
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 140 * dt;
    p.rotation += p.vRot * dt;
    p.alpha = Math.max(0, 1 - p.life / p.maxLife);
  }

  for (let i = 0; i < state.popups.length; i++) {
    const pop = state.popups[i];
    if (!pop.active) continue;
    pop.life += dt;
    if (pop.life >= pop.maxLife) {
      pop.active = false;
      continue;
    }
    pop.y += pop.vy * dt;
    pop.vy *= Math.pow(0.25, dt);
    pop.alpha = Math.max(0, 1 - Math.pow(pop.life / pop.maxLife, 1.6));
  }

  if (state.phase === 'title') {
    state.flightTimeSec += dt;
    const playableHeight = state.worldHeight - state.groundHeight - state.ceilingHeight;
    const baseHoverY = state.ceilingHeight + playableHeight * 0.44;
    const bobAmplitude = reducedMotion ? 4 : 11;
    state.player.y = baseHoverY + Math.sin(state.flightTimeSec * 3.1) * bobAmplitude;
    state.player.vy = Math.cos(state.flightTimeSec * 3.1) * bobAmplitude * 3.1;
    state.player.rotation = Math.sin(state.flightTimeSec * 3.1 - 0.4) * 0.08;
    const wingRate = bird.id === 'chronos' ? 14 : 6.5;
    state.player.wingPhase = (state.player.wingPhase + dt * wingRate) % (Math.PI * 2);
    state.distanceTraveled += (reducedMotion ? 35 : 85) * dt;
    return events;
  }

  if (state.phase !== 'playing') {
    return events;
  }

  if (state.hitstopTimer > 0) {
    state.hitstopTimer = Math.max(0, state.hitstopTimer - dt);
    return events;
  }

  const effectiveRadius = getEffectiveHitboxRadius(state, config);

  if (state.pendingGameOver) {
    state.defeatDelayTimer -= dt;
    const floorY = state.worldHeight - state.groundHeight - effectiveRadius;
    state.player.vy = Math.min(config.maxFallSpeed, state.player.vy + config.gravity * dt);
    state.player.y = Math.min(floorY, state.player.y + state.player.vy * dt);
    state.player.rotation = Math.min(Math.PI * 0.45, state.player.rotation + 4.5 * dt);

    if (state.defeatDelayTimer <= 0) {
      state.pendingGameOver = false;
      state.phase = 'gameover';
      events.gameOverTransitioned = true;
    }
    return events;
  }

  state.flightTimeSec += dt;

  if (state.abilityActiveTimer > 0) {
    state.abilityActiveTimer = Math.max(0, state.abilityActiveTimer - dt);
    if (state.abilityActiveTimer === 0 && state.birdId === 'kora') {
      state.shieldActive = false;
    }
  }
  if (state.abilityCooldownTimer > 0) {
    state.abilityCooldownTimer = Math.max(0, state.abilityCooldownTimer - dt);
  }

  const diff = computeDifficultyParams(state.score, config);

  const damp = Math.exp(-14 * dt);
  state.player.scaleX = 1 + (state.player.scaleX - 1) * damp;
  state.player.scaleY = 1 + (state.player.scaleY - 1) * damp;

  const baseWingRate = bird.id === 'chronos' ? 12 : 5.2;
  if (state.player.flapImpulseTimer > 0) {
    state.player.flapImpulseTimer = Math.max(0, state.player.flapImpulseTimer - dt);
    state.player.wingPhase = (state.player.wingPhase + dt * 18) % (Math.PI * 2);
  } else {
    state.player.wingPhase = (state.player.wingPhase + dt * baseWingRate) % (Math.PI * 2);
  }

  if (state.launchGraceTimer > 0) {
    state.launchGraceTimer = Math.max(0, state.launchGraceTimer - dt);
  }

  const isZephyrDashing = state.birdId === 'zephyr' && state.abilityActiveTimer > 0;
  const isChronosSlowing = state.birdId === 'chronos' && state.abilityActiveTimer > 0;
  const trapDt = isChronosSlowing ? dt * 0.45 : dt;

  let gravityMultiplier = bird.gravityScale * env.gravityModifier;
  if (state.launchGraceTimer > 0 && !state.hasFlappedInRun) {
    gravityMultiplier *= 0.42;
  }
  if (isChronosSlowing) {
    gravityMultiplier *= 0.55;
  }

  if (isZephyrDashing) {
    state.player.vy = 0;
  } else {
    state.player.vy += config.gravity * gravityMultiplier * dt;
  }

  // Apply Bamboo Forest Whirlwind Gust force when inside a bamboo conduit's wind zone
  if (!isZephyrDashing && state.environmentId === 'bamboo') {
    for (let i = 0; i < state.obstacles.length; i++) {
      const obs = state.obstacles[i];
      if (obs.trapDisarmed || obs.shatteredByShield) continue;
      if (
        state.player.x >= obs.x - 42 &&
        state.player.x <= obs.x + obs.width + 42
      ) {
        // Gentle vertical crosswind push (-220 updraft or +180 downdraft)
        const windAccel = obs.windDirection > 0 ? -240 : 185;
        state.player.vy += windAccel * trapDt;
      }
    }
  }

  const floorSafeY = state.worldHeight - state.groundHeight - 95;
  if (state.launchGraceTimer > 0 && state.player.y > floorSafeY && state.player.vy > 0) {
    state.player.vy = -210;
    state.player.wingPhase = 0.2;
  }

  state.player.vy = Math.max(
    config.maxRiseSpeed,
    Math.min(config.maxFallSpeed, state.player.vy)
  );
  state.player.y += state.player.vy * dt;

  const targetRotation = isZephyrDashing
    ? 0
    : state.player.vy < 0
    ? Math.max(-0.46, (state.player.vy / Math.abs(config.flapVelocity)) * 0.42)
    : Math.min(1.15, (state.player.vy / config.maxFallSpeed) * 1.05);
  state.player.rotation += (targetRotation - state.player.rotation) * Math.min(1, dt * 12);

  let speedMultiplier = 1.0;
  if (isZephyrDashing) speedMultiplier = 2.3;
  else if (isChronosSlowing) speedMultiplier = 0.55;

  const moveStep = diff.speed * speedMultiplier * dt;
  state.distanceTraveled += moveStep;
  state.distanceSinceLastSpawn += moveStep;

  for (let i = 0; i < state.player.trail.length; i++) {
    state.player.trail[i].x -= moveStep;
    state.player.trail[i].alpha -= dt * 2.4;
  }
  state.player.trail = state.player.trail.filter((t) => t.alpha > 0.04);
  if (!reducedMotion) {
    state.player.trail.unshift({
      x: state.player.x - 12,
      y: state.player.y + 2,
      alpha: isZephyrDashing ? 0.95 : 0.75,
    });
    if (state.player.trail.length > 16) {
      state.player.trail.pop();
    }
  }

  const initialRunwayPx = Math.max(420, config.baseObstacleSpeed * 2.45);
  if (state.obstacles.length === 0) {
    if (state.distanceTraveled >= initialRunwayPx - 220) {
      spawnObstaclePair(state, config, state.worldWidth + 90);
      state.distanceSinceLastSpawn = 0;
    }
  } else if (state.distanceSinceLastSpawn >= diff.spawnSpacingPx) {
    spawnObstaclePair(state, config, state.worldWidth + 60);
    state.distanceSinceLastSpawn = 0;
  }

  for (let i = state.obstacles.length - 1; i >= 0; i--) {
    const obs = state.obstacles[i];
    obs.x -= moveStep;
    obs.gaugeAngle = (obs.gaugeAngle + trapDt * 2.2) % (Math.PI * 2);
    obs.trapPhase = (obs.trapPhase + trapDt * 2.5) % (Math.PI * 2);

    // Update environment-specific trap dynamics
    if (!obs.trapDisarmed && !obs.shatteredByShield) {
      if (obs.trapType === 'oscillating_gears' && !reducedMotion) {
        const shift = Math.sin(obs.trapPhase) * 22;
        const halfGap = obs.gapHeight / 2;
        obs.gapCenterY = obs.baseGapCenterY + shift;
        obs.topHeight = Math.max(20, obs.gapCenterY - halfGap);
        obs.bottomY = Math.min(
          state.worldHeight - state.groundHeight - 20,
          obs.gapCenterY + halfGap
        );
      } else if (obs.trapType === 'magma_geyser') {
        // Erupts periodically into the lower part of the gap (up to 44px high, leaving plenty of upper clearance)
        const wave = Math.sin(obs.trapPhase);
        obs.geyserHeight = wave > 0.15 ? ((wave - 0.15) / 0.85) * 44 : 0;
      } else if (obs.trapType === 'falling_icicle') {
        // Trigger icicle drop when glider approaches within 210px
        if (!obs.icicleTriggered && obs.x - state.player.x <= 210 && obs.x > state.player.x) {
          obs.icicleTriggered = true;
          obs.icicleY = obs.topHeight;
          obs.icicleVy = 35;
        }
        if (obs.icicleTriggered) {
          obs.icicleVy += 360 * trapDt;
          obs.icicleY += obs.icicleVy * trapDt;
        } else {
          obs.icicleY = obs.topHeight;
        }
      } else if (obs.trapType === 'laser_grid') {
        // Laser fires for a brief pulse window; automatically disarms right as player enters safe pass window if unarmed
        obs.laserActive = Math.sin(obs.trapPhase) > 0.68;
      }
    } else {
      obs.geyserHeight = 0;
      obs.laserActive = false;
    }

    const obstacleMidpoint = obs.x + obs.width * 0.5;
    if (!obs.passed && state.player.x >= obstacleMidpoint) {
      obs.passed = true;
      state.gatesClearedCount += 1;

      const isChronosHarmonic =
        state.birdId === 'chronos' && state.gatesClearedCount % 4 === 0;
      const pointsEarned = isChronosHarmonic ? 2 : 1;

      state.score += pointsEarned;
      events.scoredPoint = true;

      if (state.score > state.bestScore) {
        state.bestScore = state.score;
        state.isNewBest = true;
      }

      const isMilestone = state.score > 0 && state.score % 5 === 0;
      if (isMilestone || isChronosHarmonic) {
        events.milestoneReached = true;
      }

      spawnFloatingPopup(
        state,
        state.player.x + 12,
        Math.max(64, state.player.y - 26),
        isChronosHarmonic ? '+2' : '+1',
        isChronosHarmonic
          ? 'HARMONIC!'
          : isMilestone
          ? `${state.score} GATES!`
          : '',
        isChronosHarmonic || isMilestone ? '#34D399' : '#FDE68A'
      );

      const sparkCount = reducedMotion ? 3 : isMilestone || isChronosHarmonic ? 12 : 6;
      for (let s = 0; s < sparkCount; s++) {
        const ang = (Math.PI * 2 * s) / sparkCount;
        const spd = 45 + nextRandom(state) * 75;
        spawnPooledParticle(state, {
          x: obs.x + obs.width / 2,
          y: obs.gapCenterY,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: isMilestone ? 4.5 : 3.2,
          maxLife: 0.42,
          color: isChronosHarmonic ? '#34D399' : bird.colors.auraHex,
          shape: s === 0 ? 'ring' : 'spark',
        });
      }
    }

    if (obs.x + obs.width < -80) {
      state.obstacles.splice(i, 1);
    }
  }

  const collision = detectCollision(state, config);
  if (collision.cause !== 'none') {
    // Kora's Aether Shield absorbs conduit AND trap collisions!
    if (
      state.shieldActive &&
      collision.cause !== 'cloud_deck' &&
      collision.cause !== 'stratosphere' &&
      collision.obstacleIndex >= 0
    ) {
      const obs = state.obstacles[collision.obstacleIndex];
      obs.shatteredByShield = true;
      obs.trapDisarmed = true;
      obs.topHeight = 0;
      obs.bottomY = state.worldHeight - state.groundHeight;
      if (!obs.passed) {
        obs.passed = true;
        state.gatesClearedCount += 1;
        state.score += 1;
        events.scoredPoint = true;
        if (state.score > state.bestScore) {
          state.bestScore = state.score;
          state.isNewBest = true;
        }
      }
      state.shieldActive = false;
      state.abilityActiveTimer = 0;
      state.player.hitFlashTimer = 0.14;
      events.shieldBlocked = true;

      spawnFloatingPopup(
        state,
        state.player.x + 14,
        Math.max(60, state.player.y - 28),
        'SHIELD BLOCK!',
        '+1 HAZARD SHATTERED',
        '#FBBF24'
      );

      const shatterCount = reducedMotion ? 5 : 16;
      for (let s = 0; s < shatterCount; s++) {
        const ang = (Math.PI * 2 * s) / shatterCount;
        const spd = 70 + nextRandom(state) * 120;
        spawnPooledParticle(state, {
          x: obs.x + obs.width / 2,
          y: state.player.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: 4,
          maxLife: 0.4,
          color: '#FBBF24',
          shape: s % 3 === 0 ? 'ring' : 'spark',
        });
      }
      return events;
    }

    events.collided = true;
    const floorY = state.worldHeight - state.groundHeight - effectiveRadius;
    if (collision.cause === 'cloud_deck') {
      state.player.y = floorY;
    } else if (collision.cause === 'stratosphere') {
      state.player.y = state.ceilingHeight + effectiveRadius;
    }
    triggerDefeatSequence(state, collision.cause, config, reducedMotion);
  }

  return events;
}
