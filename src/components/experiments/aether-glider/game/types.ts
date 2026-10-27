import { BirdId, EnvironmentId, TrapType } from './config';

export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type MedalTier = 'none' | 'bronze' | 'silver' | 'gold' | 'aether';

export type DefeatCause =
  | 'none'
  | 'conduit_top'
  | 'conduit_bottom'
  | 'cloud_deck'
  | 'stratosphere'
  | 'trap_magma'
  | 'trap_icicle'
  | 'trap_laser';

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vy: number;
  rotation: number;
  wingPhase: number;
  scaleX: number;
  scaleY: number;
  flapImpulseTimer: number;
  hitFlashTimer: number;
  trail: TrailPoint[];
}

export interface ObstaclePair {
  id: number;
  x: number;
  baseGapCenterY: number;
  gapCenterY: number;
  gapHeight: number;
  width: number;
  passed: boolean;
  topHeight: number;
  bottomY: number;
  gaugeAngle: number;
  shatteredByShield?: boolean;
  /** Environment-specific active trap state */
  trapType: TrapType;
  trapPhase: number;
  trapDisarmed: boolean;
  /** For Bamboo whirlwind: +1 (updraft) or -1 (downdraft) */
  windDirection: 1 | -1;
  /** For Volcano magma geyser: current jet height extending above bottomY */
  geyserHeight: number;
  /** For Ice Field falling icicle: current Y of the icicle tip and its fall speed */
  icicleTriggered: boolean;
  icicleY: number;
  icicleVy: number;
  /** For Cyber City laser grid: true when the high-energy laser beam is active across the gap */
  laserActive: boolean;
  /** Tracks whether this obstacle's signature trap audio cue has fired as the player approaches */
  trapSoundPlayed?: boolean;
}

export interface FloatingPopup {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  subtext: string;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  scale: number;
}

export type ParticleShape =
  | 'spark'
  | 'feather'
  | 'ring'
  | 'smoke'
  | 'gear'
  | 'streak'
  | 'prism';

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  shape: ParticleShape;
  rotation: number;
  vRot: number;
  gravityScale?: number;
}

export interface DifficultyParams {
  speed: number;
  gapHeight: number;
  spawnSpacingPx: number;
  verticalVariance: number;
  multiplier: number;
  tierLabel: string;
}

export interface RunStats {
  score: number;
  bestScore: number;
  isNewBest: boolean;
  gatesCleared: number;
  maxCombo: number;
  peakComboMultiplier: number;
  flightTimeSec: number;
  peakSpeedMultiplier: number;
  medal: MedalTier;
  causeOfDefeat: DefeatCause;
  birdId: BirdId;
  environmentId: EnvironmentId;
  abilitiesUsed: number;
}

export interface SimulationState {
  phase: GamePhase;
  birdId: BirdId;
  environmentId: EnvironmentId;
  worldWidth: number;
  worldHeight: number;
  groundHeight: number;
  ceilingHeight: number;
  player: PlayerState;
  obstacles: ObstaclePair[];
  popups: FloatingPopup[];
  particles: Particle[];
  particleCursor: number;
  score: number;
  gatesClearedCount: number;
  comboCount: number;
  maxCombo: number;
  comboMultiplier: number;
  peakComboMultiplier: number;
  bestScore: number;
  isNewBest: boolean;
  flightTimeSec: number;
  launchGraceTimer: number;
  hasFlappedInRun: boolean;
  abilityActiveTimer: number;
  abilityCooldownTimer: number;
  shieldActive: boolean;
  abilitiesUsed: number;
  hitstopTimer: number;
  defeatDelayTimer: number;
  pendingGameOver: boolean;
  cameraTrauma: number;
  distanceTraveled: number;
  distanceSinceLastSpawn: number;
  nextObstacleId: number;
  rngState: number;
  lastGapCenterY: number;
  causeOfDefeat: DefeatCause;
  frozenRunStats: RunStats | null;
}

