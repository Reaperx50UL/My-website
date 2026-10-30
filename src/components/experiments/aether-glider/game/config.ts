export type BirdId = 'kora' | 'zephyr' | 'ignis' | 'chronos' | 'valkyrie' | 'volt';

export type EnvironmentId = 'clockwork' | 'bamboo' | 'volcano' | 'ice' | 'cyber';

export type TrapType =
  | 'oscillating_gears'
  | 'whirlwind_gust'
  | 'magma_geyser'
  | 'falling_icicle'
  | 'laser_grid';

export interface EnvironmentProfile {
  id: EnvironmentId;
  name: string;
  shortName: string;
  trapType: TrapType;
  trapName: string;
  trapDesc: string;
  gravityModifier: number;
  colors: {
    skyTop: string;
    skyMid: string;
    skyLow: string;
    skyHorizon: string;
    celestialCore: string;
    celestialGlow: string;
    farSilhouette: string;
    midCloud: string;
    nearCloud: string;
    pillarDark: string;
    pillarMid: string;
    pillarLight: string;
    collarHighlight: string;
    floorTop: string;
    floorSub: string;
    accentHex: string;
    trapDangerHex: string;
  };
}

export const ENVIRONMENT_PROFILES: EnvironmentProfile[] = [
  {
    id: 'clockwork',
    name: 'Clockwork Citadel',
    shortName: 'Clockwork',
    trapType: 'oscillating_gears',
    trapName: 'Piston Gears',
    trapDesc: 'Motorized brass pistons shift conduit openings vertically as you approach.',
    gravityModifier: 1.0,
    colors: {
      skyTop: '#0F1326',
      skyMid: '#1F2442',
      skyLow: '#4D3252',
      skyHorizon: '#E08B5B',
      celestialCore: '#FEF3C7',
      celestialGlow: 'rgba(245, 158, 11, 0.35)',
      farSilhouette: '#2B223C',
      midCloud: 'rgba(71, 44, 76, 0.68)',
      nearCloud: 'rgba(136, 69, 89, 0.55)',
      pillarDark: '#2D1B14',
      pillarMid: '#784B34',
      pillarLight: '#C89666',
      collarHighlight: '#F6D186',
      floorTop: '#B47B44',
      floorSub: '#1B1324',
      accentHex: '#FBBF24',
      trapDangerHex: '#F59E0B',
    },
  },
  {
    id: 'bamboo',
    name: 'Bamboo Forest',
    shortName: 'Bamboo',
    trapType: 'whirlwind_gust',
    trapName: 'Crosswind Vortex',
    trapDesc: 'Swirling jade wind vortices inside conduit gaps push gliders upward or downward.',
    gravityModifier: 0.96,
    colors: {
      skyTop: '#071A17',
      skyMid: '#11352F',
      skyLow: '#23574C',
      skyHorizon: '#74A88E',
      celestialCore: '#ECFDF5',
      celestialGlow: 'rgba(52, 211, 153, 0.28)',
      farSilhouette: '#0D2823',
      midCloud: 'rgba(20, 69, 59, 0.65)',
      nearCloud: 'rgba(45, 106, 88, 0.5)',
      pillarDark: '#132A1E',
      pillarMid: '#2D6A4F',
      pillarLight: '#74C69D',
      collarHighlight: '#D8F3DC',
      floorTop: '#40916C',
      floorSub: '#0B1D16',
      accentHex: '#34D399',
      trapDangerHex: '#6EE7B7',
    },
  },
  {
    id: 'volcano',
    name: 'Volcano Field',
    shortName: 'Volcano',
    trapType: 'magma_geyser',
    trapName: 'Magma Geysers',
    trapDesc: 'Pressurized molten lava jets erupt from lower basalt conduits into the flight path.',
    gravityModifier: 1.03,
    colors: {
      skyTop: '#160709',
      skyMid: '#331014',
      skyLow: '#6E1D1B',
      skyHorizon: '#EA580C',
      celestialCore: '#FDE047',
      celestialGlow: 'rgba(239, 68, 68, 0.42)',
      farSilhouette: '#240B0E',
      midCloud: 'rgba(69, 18, 22, 0.72)',
      nearCloud: 'rgba(124, 45, 18, 0.58)',
      pillarDark: '#1C1012',
      pillarMid: '#442628',
      pillarLight: '#784447',
      collarHighlight: '#FB923C',
      floorTop: '#C2410C',
      floorSub: '#18090A',
      accentHex: '#FB923C',
      trapDangerHex: '#EF4444',
    },
  },
  {
    id: 'ice',
    name: 'Cold Ice Field',
    shortName: 'Ice Field',
    trapType: 'falling_icicle',
    trapName: 'Falling Icicles',
    trapDesc: 'Hanging glacial stalactites shudder and shear off upper conduits as you fly near.',
    gravityModifier: 1.05,
    colors: {
      skyTop: '#061021',
      skyMid: '#0D254C',
      skyLow: '#1E4E79',
      skyHorizon: '#7DD3FC',
      celestialCore: '#F0F9FF',
      celestialGlow: 'rgba(56, 189, 248, 0.35)',
      farSilhouette: '#0F294A',
      midCloud: 'rgba(23, 62, 104, 0.65)',
      nearCloud: 'rgba(56, 130, 184, 0.5)',
      pillarDark: '#0C2D48',
      pillarMid: '#1D6396',
      pillarLight: '#7CD4FD',
      collarHighlight: '#E0F2FE',
      floorTop: '#38BDF8',
      floorSub: '#08182B',
      accentHex: '#38BDF8',
      trapDangerHex: '#7DD3FC',
    },
  },
  {
    id: 'cyber',
    name: 'Cybernetic City',
    shortName: 'Cyber City',
    trapType: 'laser_grid',
    trapName: 'Pulse Lasers',
    trapDesc: 'High-voltage holo-lasers cycle across conduit gaps; time the pulse or use abilities.',
    gravityModifier: 1.0,
    colors: {
      skyTop: '#060514',
      skyMid: '#140B2E',
      skyLow: '#2E1052',
      skyHorizon: '#86198F',
      celestialCore: '#67E8F9',
      celestialGlow: 'rgba(217, 70, 239, 0.35)',
      farSilhouette: '#110A26',
      midCloud: 'rgba(42, 16, 78, 0.68)',
      nearCloud: 'rgba(88, 28, 135, 0.52)',
      pillarDark: '#090D16',
      pillarMid: '#1E293B',
      pillarLight: '#475569',
      collarHighlight: '#22D3EE',
      floorTop: '#A21CAF',
      floorSub: '#090718',
      accentHex: '#22D3EE',
      trapDangerHex: '#F43F5E',
    },
  },
];

export function getEnvironmentProfile(envId: EnvironmentId): EnvironmentProfile {
  return ENVIRONMENT_PROFILES.find((e) => e.id === envId) ?? ENVIRONMENT_PROFILES[0];
}

export interface BirdProfile {
  id: BirdId;
  name: string;
  species: string;
  tagline: string;
  passiveName: string;
  passiveDesc: string;
  abilityName: string;
  abilityDesc: string;
  abilityDurationSec: number;
  abilityCooldownSec: number;
  gravityScale: number;
  flapScale: number;
  hitboxScale: number;
  colors: {
    bodyTop: string;
    bodyMid: string;
    bodyBottom: string;
    wing: string;
    beak: string;
    eye: string;
    tail: string;
    trailRgba: string;
    auraHex: string;
  };
}

export const BIRD_PROFILES: BirdProfile[] = [
  {
    id: 'kora',
    name: 'Kora',
    species: 'Brass Owl',
    tagline: 'Armored Sentinel',
    passiveName: 'Gyro Stabilizer',
    passiveDesc: 'Balanced brass chassis with steady pitch control.',
    abilityName: 'Aether Shield',
    abilityDesc: 'Deploys a barrier for 3.5s that shatters the next conduit or trap on impact.',
    abilityDurationSec: 3.5,
    abilityCooldownSec: 9.5,
    gravityScale: 1.0,
    flapScale: 1.0,
    hitboxScale: 1.0,
    colors: {
      bodyTop: '#FEF3C7',
      bodyMid: '#F59E0B',
      bodyBottom: '#92400E',
      wing: '#FDE68A',
      beak: '#FBBF24',
      eye: '#38BDF8',
      tail: '#D97706',
      trailRgba: '251, 191, 36',
      auraHex: '#FBBF24',
    },
  },
  {
    id: 'zephyr',
    name: 'Zephyr',
    species: 'Swift Albatross',
    tagline: 'Jetstream Runner',
    passiveName: 'Featherweight Lift',
    passiveDesc: '18% lighter gravity pull for long, sweeping glides.',
    abilityName: 'Gale Dash',
    abilityDesc: 'Surges forward at 2.3x speed for 0.6s, phasing safely through conduits & traps.',
    abilityDurationSec: 0.6,
    abilityCooldownSec: 7.5,
    gravityScale: 0.82,
    flapScale: 0.94,
    hitboxScale: 0.95,
    colors: {
      bodyTop: '#E0F2FE',
      bodyMid: '#38BDF8',
      bodyBottom: '#0369A1',
      wing: '#BAE6FD',
      beak: '#FDE047',
      eye: '#FDE047',
      tail: '#0284C7',
      trailRgba: '56, 189, 248',
      auraHex: '#38BDF8',
    },
  },
  {
    id: 'ignis',
    name: 'Ignis',
    species: 'Ember Falcon',
    tagline: 'Conduit Breaker',
    passiveName: 'Sleek Airframe',
    passiveDesc: '22% smaller collision hitbox for threading narrow openings.',
    abilityName: 'Solar Pulse',
    abilityDesc: 'Unleashes a shockwave that widens conduit gaps by +58px and disarms traps.',
    abilityDurationSec: 0.45,
    abilityCooldownSec: 8.5,
    gravityScale: 1.04,
    flapScale: 1.03,
    hitboxScale: 0.78,
    colors: {
      bodyTop: '#FEE2E2',
      bodyMid: '#EF4444',
      bodyBottom: '#991B1B',
      wing: '#FCA5A5',
      beak: '#FBBF24',
      eye: '#FEF08A',
      tail: '#DC2626',
      trailRgba: '248, 113, 113',
      auraHex: '#F87171',
    },
  },
  {
    id: 'chronos',
    name: 'Chronos',
    species: 'Emerald Hummingbird',
    tagline: 'Temporal Weaver',
    passiveName: 'Harmonic Resonance',
    passiveDesc: 'Every 4th conduit cleared awards Double Points (+2).',
    abilityName: 'Time Dilation',
    abilityDesc: 'Slows conduit speed, gravity, and active traps by 45% for 3.2s.',
    abilityDurationSec: 3.2,
    abilityCooldownSec: 9.0,
    gravityScale: 0.92,
    flapScale: 0.95,
    hitboxScale: 0.88,
    colors: {
      bodyTop: '#D1FAE5',
      bodyMid: '#10B981',
      bodyBottom: '#065F46',
      wing: '#A7F3D0',
      beak: '#FDE68A',
      eye: '#67E8F9',
      tail: '#059669',
      trailRgba: '52, 211, 153',
      auraHex: '#34D399',
    },
  },
  {
    id: 'valkyrie',
    name: 'Valkyrie',
    species: 'Astral Hawk',
    tagline: 'Starlight Striker',
    passiveName: 'Astral Lock',
    passiveDesc: 'Reaches combo multiplier tiers 1 dodge earlier with a 10% sleeker frame.',
    abilityName: 'Astral Blink',
    abilityDesc: 'Warps to align with the next conduit gap, phases through hazards for 1.4s, and scores +1.',
    abilityDurationSec: 1.4,
    abilityCooldownSec: 8.0,
    gravityScale: 0.94,
    flapScale: 1.02,
    hitboxScale: 0.9,
    colors: {
      bodyTop: '#F3E8FF',
      bodyMid: '#A855F7',
      bodyBottom: '#581C87',
      wing: '#D8B4FE',
      beak: '#FDE047',
      eye: '#F0ABFC',
      tail: '#7E22CE',
      trailRgba: '192, 132, 252',
      auraHex: '#C084FC',
    },
  },
  {
    id: 'volt',
    name: 'Volt',
    species: 'Tesla Shrike',
    tagline: 'Storm Dynamo',
    passiveName: 'Static Dynamo',
    passiveDesc: 'Each conduit cleared recharges 1.5s of ability cooldown; high-voltage lift.',
    abilityName: 'Tesla Overload',
    abilityDesc: 'Unleashes an EMP storm & shock-shield for 2.6s that disarms all traps and scores +2.',
    abilityDurationSec: 2.6,
    abilityCooldownSec: 8.5,
    gravityScale: 0.9,
    flapScale: 1.05,
    hitboxScale: 0.88,
    colors: {
      bodyTop: '#ECFEFF',
      bodyMid: '#06B6D4',
      bodyBottom: '#164E63',
      wing: '#67E8F9',
      beak: '#FACC15',
      eye: '#FEF08A',
      tail: '#0891B2',
      trailRgba: '34, 211, 238',
      auraHex: '#22D3EE',
    },
  },
];

export function getBirdProfile(birdId: BirdId): BirdProfile {
  return BIRD_PROFILES.find((b) => b.id === birdId) ?? BIRD_PROFILES[0];
}

export interface GameConfig {
  gravity: number;
  flapVelocity: number;
  maxFallSpeed: number;
  maxRiseSpeed: number;
  baseObstacleSpeed: number;
  maxObstacleSpeed: number;
  speedIncreasePerPoint: number;
  initialGapHeight: number;
  minGapHeight: number;
  gapNarrowingPerPoint: number;
  obstacleSpacingPx: number;
  minObstacleSpacingPx: number;
  obstacleWidth: number;
  hitboxRadius: number;
  visualRadius: number;
  launchGraceDuration: number;
  verticalSafeMargin: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  gravity: 1040,
  flapVelocity: -380,
  maxFallSpeed: 490,
  maxRiseSpeed: -450,
  baseObstacleSpeed: 190,
  maxObstacleSpeed: 315,
  speedIncreasePerPoint: 3.2,
  initialGapHeight: 172,
  minGapHeight: 118,
  gapNarrowingPerPoint: 1.25,
  obstacleSpacingPx: 270,
  minObstacleSpacingPx: 220,
  obstacleWidth: 64,
  hitboxRadius: 14,
  visualRadius: 20,
  launchGraceDuration: 3.0,
  verticalSafeMargin: 64,
};

export interface TuningPreset {
  id: 'standard' | 'breeze' | 'overclock';
  label: string;
  description: string;
  config: Partial<GameConfig>;
}

export const TUNING_PRESETS: TuningPreset[] = [
  {
    id: 'standard',
    label: 'Standard',
    description: 'Balanced clockwork gravity, responsive lift, and gradual gate narrowing.',
    config: { ...DEFAULT_GAME_CONFIG },
  },
  {
    id: 'breeze',
    label: 'Gentle Breeze',
    description: 'Wider conduit gaps and softer gravity for relaxed sky cruising.',
    config: {
      ...DEFAULT_GAME_CONFIG,
      gravity: 960,
      flapVelocity: -365,
      baseObstacleSpeed: 165,
      initialGapHeight: 192,
      minGapHeight: 138,
    },
  },
  {
    id: 'overclock',
    label: 'Overclocked',
    description: 'Brisk tailwinds, tighter brass conduits, and snappier vertical physics.',
    config: {
      ...DEFAULT_GAME_CONFIG,
      gravity: 1240,
      flapVelocity: -415,
      baseObstacleSpeed: 220,
      maxObstacleSpeed: 350,
      initialGapHeight: 152,
      minGapHeight: 112,
    },
  },
];

export const WORLD_HEIGHT = 640;
export const GROUND_HEIGHT = 68;
export const CEILING_HEIGHT = 12;
