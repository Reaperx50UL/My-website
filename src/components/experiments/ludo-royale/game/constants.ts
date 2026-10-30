import {
  AppSettings,
  AvatarOption,
  BoardTheme,
  BoardThemeOption,
  DiceStyle,
  DiceStyleOption,
  HouseRules,
  PlayerColor,
  PlayerStats,
  UserProfile,
} from './gameTypes';

export const PLAYER_COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

export const TOTAL_TRACK_CELLS = 52;
export const MAX_TRACK_STEPS = 50; // 0..50 are on the shared perimeter track (51 squares)
export const HOME_PATH_START_STEP = 51; // 51..55 are the 5 colored home column squares
export const FINISH_STEP = 56; // 56 is the final home triangle

/**
 * Starting track index (0..51) for each color on the 52-cell perimeter track.
 */
export const START_TRACK_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

/**
 * The 4 colored starting squares on the main track (always safe).
 */
export const START_SAFE_INDICES: number[] = [0, 13, 26, 39];

/**
 * The 4 star squares (8 steps ahead of each color's start square).
 */
export const STAR_SAFE_INDICES: number[] = [8, 21, 34, 47];

export const COLOR_META: Record<
  PlayerColor,
  {
    label: string;
    symbol: string; // Color-blind accessible symbol
    primaryHex: string;
    secondaryHex: string;
    lightHex: string;
    darkHex: string;
    glowHex: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
  }
> = {
  red: {
    label: 'Crimson Red',
    symbol: '▲',
    primaryHex: '#EF4444',
    secondaryHex: '#DC2626',
    lightHex: '#FCA5A5',
    darkHex: '#991B1B',
    glowHex: 'rgba(239, 68, 68, 0.45)',
    bgClass: 'bg-red-500',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/40',
  },
  green: {
    label: 'Emerald Green',
    symbol: '◆',
    primaryHex: '#10B981',
    secondaryHex: '#059669',
    lightHex: '#6EE7B7',
    darkHex: '#065F46',
    glowHex: 'rgba(16, 185, 129, 0.45)',
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/40',
  },
  yellow: {
    label: 'Solar Gold',
    symbol: '★',
    primaryHex: '#F59E0B',
    secondaryHex: '#D97706',
    lightHex: '#FDE68A',
    darkHex: '#92400E',
    glowHex: 'rgba(245, 158, 11, 0.45)',
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/40',
  },
  blue: {
    label: 'Sapphire Blue',
    symbol: '●',
    primaryHex: '#3B82F6',
    secondaryHex: '#2563EB',
    lightHex: '#93C5FD',
    darkHex: '#1E40AF',
    glowHex: 'rgba(59, 130, 246, 0.45)',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/40',
  },
};

export const DEFAULT_HOUSE_RULES: HouseRules = {
  maxConsecutiveSixes: 3,
  bonusRollOnCapture: true,
  bonusRollOnHome: true,
  safeStarSquares: true,
  fastStart: false,
};

export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  musicEnabled: false,
  hapticIntensity: 'medium',
  animationSpeed: 'normal',
  reducedMotion: false,
  boardTheme: 'cosmic_galaxy',
  diceStyle: 'classic_ivory',
  colorBlindMode: false,
  showMoveHints: true,
};

export const BOARD_THEME_OPTIONS: BoardThemeOption[] = [
  {
    id: 'cosmic_galaxy',
    indexNumber: 1,
    label: 'Cosmic Galaxy',
    subtitle:
      'A futuristic space-themed Ludo with a black hole center, glowing paths and planets.',
    tokenStyle: 'cosmic_pawn',
    tokenStyleLabel: 'Astral Ring Pawn',
    boardBg: '#09061E',
    boardBorder: '#7C3AED',
    trackCellBg: '#16113A',
    trackCellStroke: '#4C1D95',
    yardInnerBg: '#060314',
    centerStroke: '#A855F7',
    starColor: '#38BDF8',
    accentColor: '#C084FC',
  },
  {
    id: 'royal_classic',
    indexNumber: 2,
    label: 'Royal Classic',
    subtitle:
      'A premium royal theme with castles, marble textures and elegant design.',
    tokenStyle: 'royal_spires',
    tokenStyleLabel: 'Sovereign Castle Spire',
    boardBg: '#271306',
    boardBorder: '#D97706',
    trackCellBg: '#FDF6E7',
    trackCellStroke: '#B45309',
    yardInnerBg: '#1C0D04',
    centerStroke: '#F59E0B',
    starColor: '#D97706',
    accentColor: '#FBBF24',
  },
  {
    id: 'elemental_realms',
    indexNumber: 3,
    label: 'Elemental Realms',
    subtitle:
      'Fire, Water, Earth, Air themed Ludo with unique environments.',
    tokenStyle: 'elemental_totem',
    tokenStyleLabel: 'Elemental Spirit Totem',
    boardBg: '#131620',
    boardBorder: '#64748B',
    trackCellBg: '#E2D9C5',
    trackCellStroke: '#475569',
    yardInnerBg: '#0B0E17',
    centerStroke: '#94A3B8',
    starColor: '#F97316',
    accentColor: '#FB923C',
  },
  {
    id: 'neon_tech',
    indexNumber: 4,
    label: 'Neon Tech',
    subtitle:
      'A modern cyberpunk style Ludo with neon lights and futuristic UI.',
    tokenStyle: 'cyber_beacon',
    tokenStyleLabel: 'Cyber Holo-Beacon',
    boardBg: '#050814',
    boardBorder: '#00F0FF',
    trackCellBg: '#0B132B',
    trackCellStroke: '#1E293B',
    yardInnerBg: '#03060E',
    centerStroke: '#38BDF8',
    starColor: '#00F5A0',
    accentColor: '#22D3EE',
  },
  {
    id: 'nature_forest',
    indexNumber: 5,
    label: 'Nature / Forest',
    subtitle:
      'A calm and beautiful nature theme with wood, trees and natural environment.',
    tokenStyle: 'woodland_acorn',
    tokenStyleLabel: 'Woodland Carved Pawn',
    boardBg: '#1B2D1B',
    boardBorder: '#5D4037',
    trackCellBg: '#E6CFAF',
    trackCellStroke: '#6D4C41',
    yardInnerBg: '#111E12',
    centerStroke: '#8D6E63',
    starColor: '#65A30D',
    accentColor: '#4ADE80',
  },
  {
    id: 'minimal_3d',
    indexNumber: 6,
    label: 'Minimal 3D Modern',
    subtitle:
      'Clean, minimal and premium 3D design with smooth materials and lighting.',
    tokenStyle: 'minimal_pawn',
    tokenStyleLabel: 'Studio Matte 3D Skittle',
    boardBg: '#E2E8F0',
    boardBorder: '#CBD5E1',
    trackCellBg: '#FFFFFF',
    trackCellStroke: '#CBD5E1',
    yardInnerBg: '#F8FAFC',
    centerStroke: '#94A3B8',
    starColor: '#F59E0B',
    accentColor: '#38BDF8',
  },
];

const LEGACY_BOARD_THEME_MAP: Record<string, BoardThemeOption['id']> = {
  royal_slate: 'cosmic_galaxy',
  classic_parchment: 'royal_classic',
  midnight_emerald: 'nature_forest',
};

export function getBoardThemeOption(theme?: BoardTheme | string): BoardThemeOption {
  const mappedId = (theme && LEGACY_BOARD_THEME_MAP[theme]) || theme;
  return (
    BOARD_THEME_OPTIONS.find((opt) => opt.id === mappedId) ||
    BOARD_THEME_OPTIONS[0]
  );
}

export const DICE_FACE_ROTATIONS: Record<
  number,
  { x: number; y: number; z: number }
> = {
  1: { x: 0, y: 0, z: 0 },
  2: { x: 0, y: -90, z: 0 },
  3: { x: -90, y: 0, z: 0 },
  4: { x: 90, y: 0, z: 0 },
  5: { x: 0, y: 90, z: 0 },
  6: { x: 0, y: 180, z: 0 },
};

export const DICE_STYLE_OPTIONS: DiceStyleOption[] = [
  {
    id: 'classic_ivory',
    label: 'Classic Ivory',
    subtitle: 'Tournament pearl-white cube with recessed circular pips',
    pipShape: 'circle',
    texturePattern: 'ivory_grain',
    textureLabel: 'Pearl Micro-Grain',
    animationProfile: 'tournament_tumble',
    animationLabel: 'Tournament Tumble',
    modelGeometry: 'chamfered_ivory',
    cornerRadiusFactor: 0.2,
    coreGlowHex: 'rgba(248, 250, 252, 0.45)',
    specularSheen:
      'linear-gradient(135deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.14) 38%, transparent 62%)',
    rollPhysics: {
      spinMultipliers: { x: 2, y: 3, z: 1 },
      liftRatio: 0.46,
      rollScale: 1.15,
      rollDurationMs: 620,
      settleDurationMs: 560,
      rollEasing: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
      settleEasing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      idleTilt: { x: -14, y: 18, z: -2 },
      hoverTilt: { x: -20, y: 26, z: -4 },
      idleAnimationClass: 'animate-dice-idle-ivory',
      rollingEffectClass: 'animate-dice-roll-ivory',
    },
    surfaceGradient: 'linear-gradient(145deg, #FFFFFF 0%, #F1F5F9 52%, #CBD5E1 100%)',
    rolledSixGradient: 'linear-gradient(145deg, #FEF3C7 0%, #F59E0B 100%)',
    borderHex: '#CBD5E1',
    pipColor: '#0F172A',
    accentPipColor: '#DC2626',
    innerFrameColor: 'rgba(15, 23, 42, 0.14)',
    shadowStyle:
      'inset 0 2px 4px rgba(255,255,255,0.98), inset 0 -4px 7px rgba(15,23,42,0.22)',
  },
  {
    id: 'royal_gold',
    label: 'Sovereign Gold',
    subtitle: '24k gilded bullion with ornate filigree and diamond-cut pips',
    pipShape: 'diamond',
    texturePattern: 'brushed_bullion',
    textureLabel: '24k Brushed Bullion',
    animationProfile: 'bullion_slam',
    animationLabel: 'Heavy Bullion Slam',
    modelGeometry: 'beveled_bullion',
    cornerRadiusFactor: 0.12,
    coreGlowHex: 'rgba(245, 158, 11, 0.62)',
    specularSheen:
      'linear-gradient(125deg, rgba(255,251,235,0.75) 0%, rgba(253,224,71,0.22) 32%, rgba(120,53,15,0.18) 68%, rgba(254,240,138,0.35) 100%)',
    rollPhysics: {
      spinMultipliers: { x: 1, y: 2, z: 1 },
      liftRatio: 0.34,
      rollScale: 1.22,
      rollDurationMs: 720,
      settleDurationMs: 480,
      rollEasing: 'cubic-bezier(0.12, 0.82, 0.24, 1)',
      settleEasing: 'cubic-bezier(0.22, 1.38, 0.5, 1)',
      idleTilt: { x: -16, y: -22, z: 3 },
      hoverTilt: { x: -22, y: -30, z: 6 },
      idleAnimationClass: 'animate-dice-idle-bullion',
      rollingEffectClass: 'animate-dice-roll-bullion',
    },
    surfaceGradient:
      'linear-gradient(145deg, #FEF08A 0%, #F59E0B 52%, #92400E 100%)',
    rolledSixGradient:
      'linear-gradient(145deg, #FFFBEB 0%, #FBBF24 50%, #D97706 100%)',
    borderHex: '#FDE68A',
    pipColor: '#451A03',
    accentPipColor: '#991B1B',
    innerFrameColor: 'rgba(120, 53, 15, 0.48)',
    shadowStyle:
      'inset 0 2px 5px rgba(254,249,195,0.92), inset 0 -4px 8px rgba(120,53,15,0.62)',
  },
  {
    id: 'obsidian_neon',
    label: 'Cyber Obsidian',
    subtitle: 'Matte volcanic carbon with glowing circuit frames & hex cores',
    pipShape: 'hexagon',
    texturePattern: 'carbon_circuit',
    textureLabel: 'Carbon PCB Circuit',
    animationProfile: 'cyber_gyro',
    animationLabel: 'Gyro Overdrive',
    modelGeometry: 'holo_obsidian',
    cornerRadiusFactor: 0.09,
    coreGlowHex: 'rgba(56, 189, 248, 0.72)',
    specularSheen:
      'linear-gradient(135deg, rgba(56,189,248,0.34) 0%, rgba(244,63,94,0.12) 48%, rgba(15,23,42,0.4) 100%)',
    rollPhysics: {
      spinMultipliers: { x: 4, y: 5, z: 2 },
      liftRatio: 0.54,
      rollScale: 1.18,
      rollDurationMs: 520,
      settleDurationMs: 420,
      rollEasing: 'cubic-bezier(0.08, 0.96, 0.18, 1)',
      settleEasing: 'cubic-bezier(0.16, 1.18, 0.3, 1)',
      idleTilt: { x: -20, y: 28, z: -6 },
      hoverTilt: { x: -26, y: 38, z: -10 },
      idleAnimationClass: 'animate-dice-idle-cyber',
      rollingEffectClass: 'animate-dice-roll-cyber',
    },
    surfaceGradient:
      'linear-gradient(145deg, #1E293B 0%, #0F172A 58%, #020617 100%)',
    rolledSixGradient:
      'linear-gradient(145deg, #0284C7 0%, #0F172A 65%, #020617 100%)',
    borderHex: '#38BDF8',
    pipColor: '#38BDF8',
    accentPipColor: '#F43F5E',
    innerFrameColor: 'rgba(56, 189, 248, 0.42)',
    shadowStyle:
      'inset 0 2px 4px rgba(56,189,248,0.32), inset 0 -4px 9px rgba(0,0,0,0.9)',
  },
  {
    id: 'emerald_jade',
    label: 'Imperial Jade',
    subtitle: 'Carved dynasty jade stone with golden celestial star inlays',
    pipShape: 'star',
    texturePattern: 'veined_jade',
    textureLabel: 'Veined Imperial Jade',
    animationProfile: 'jade_levitate',
    animationLabel: 'Zen Levitation',
    modelGeometry: 'carved_jade',
    cornerRadiusFactor: 0.24,
    coreGlowHex: 'rgba(16, 185, 129, 0.65)',
    specularSheen:
      'radial-gradient(circle at 26% 24%, rgba(167,243,208,0.52) 0%, rgba(16,185,129,0.14) 45%, transparent 72%)',
    rollPhysics: {
      spinMultipliers: { x: 2, y: 4, z: 1 },
      liftRatio: 0.62,
      rollScale: 1.12,
      rollDurationMs: 760,
      settleDurationMs: 680,
      rollEasing: 'cubic-bezier(0.25, 0.85, 0.35, 1)',
      settleEasing: 'cubic-bezier(0.3, 1.32, 0.55, 1)',
      idleTilt: { x: -12, y: -16, z: 4 },
      hoverTilt: { x: -18, y: -24, z: 8 },
      idleAnimationClass: 'animate-dice-idle-jade',
      rollingEffectClass: 'animate-dice-roll-jade',
    },
    surfaceGradient:
      'linear-gradient(145deg, #10B981 0%, #047857 55%, #064E3B 100%)',
    rolledSixGradient:
      'linear-gradient(145deg, #34D399 0%, #059669 55%, #065F46 100%)',
    borderHex: '#6EE7B7',
    pipColor: '#FEF3C7',
    accentPipColor: '#FBBF24',
    innerFrameColor: 'rgba(253, 230, 138, 0.42)',
    shadowStyle:
      'inset 0 2px 5px rgba(167,243,208,0.55), inset 0 -4px 8px rgba(2,44,34,0.8)',
  },
  {
    id: 'crimson_ruby',
    label: 'Dragon Ruby',
    subtitle: 'Faceted blood-ruby gemstone with prism lines & golden diamonds',
    pipShape: 'diamond',
    texturePattern: 'faceted_gemstone',
    textureLabel: 'Prism Ruby Facets',
    animationProfile: 'ruby_vortex',
    animationLabel: 'Dragon Flare Vortex',
    modelGeometry: 'faceted_ruby',
    cornerRadiusFactor: 0.15,
    coreGlowHex: 'rgba(239, 68, 68, 0.75)',
    specularSheen:
      'linear-gradient(115deg, rgba(255,255,255,0.58) 0%, rgba(254,202,202,0.22) 28%, transparent 50%, rgba(251,146,60,0.25) 100%)',
    rollPhysics: {
      spinMultipliers: { x: 3, y: 4, z: 2 },
      liftRatio: 0.52,
      rollScale: 1.2,
      rollDurationMs: 590,
      settleDurationMs: 520,
      rollEasing: 'cubic-bezier(0.18, 0.92, 0.26, 1)',
      settleEasing: 'cubic-bezier(0.38, 1.62, 0.62, 1)',
      idleTilt: { x: -18, y: 22, z: 5 },
      hoverTilt: { x: -24, y: 32, z: 9 },
      idleAnimationClass: 'animate-dice-idle-ruby',
      rollingEffectClass: 'animate-dice-roll-ruby',
    },
    surfaceGradient:
      'linear-gradient(145deg, #EF4444 0%, #B91C1C 55%, #450A0A 100%)',
    rolledSixGradient:
      'linear-gradient(145deg, #F87171 0%, #DC2626 50%, #7F1D1D 100%)',
    borderHex: '#FCA5A5',
    pipColor: '#FEF08A',
    accentPipColor: '#FFFFFF',
    innerFrameColor: 'rgba(254, 240, 138, 0.45)',
    shadowStyle:
      'inset 0 2px 5px rgba(254,202,202,0.58), inset 0 -4px 8px rgba(69,10,10,0.82)',
  },
  {
    id: 'celestial_runic',
    label: 'Astral Runic',
    subtitle: 'Midnight cosmos astrolabe engraved with gilded Roman numerals',
    pipShape: 'roman',
    texturePattern: 'nebula_astrolabe',
    textureLabel: 'Nebula Star Chart',
    animationProfile: 'astral_orbit',
    animationLabel: 'Zero-G Orbit',
    modelGeometry: 'astrolabe_runic',
    cornerRadiusFactor: 0.18,
    coreGlowHex: 'rgba(168, 85, 247, 0.72)',
    specularSheen:
      'radial-gradient(circle at 72% 24%, rgba(196,181,253,0.46) 0%, rgba(56,189,248,0.18) 42%, transparent 75%)',
    rollPhysics: {
      spinMultipliers: { x: 3, y: 3, z: 3 },
      liftRatio: 0.58,
      rollScale: 1.16,
      rollDurationMs: 680,
      settleDurationMs: 640,
      rollEasing: 'cubic-bezier(0.22, 0.88, 0.32, 1)',
      settleEasing: 'cubic-bezier(0.28, 1.42, 0.58, 1)',
      idleTilt: { x: -22, y: -26, z: -8 },
      hoverTilt: { x: -28, y: -36, z: -14 },
      idleAnimationClass: 'animate-dice-idle-astral',
      rollingEffectClass: 'animate-dice-roll-astral',
    },
    surfaceGradient:
      'linear-gradient(145deg, #312E81 0%, #1E1B4B 58%, #090D16 100%)',
    rolledSixGradient:
      'linear-gradient(145deg, #4338CA 0%, #1E1B4B 60%, #0F172A 100%)',
    borderHex: '#A78BFA',
    pipColor: '#FDE68A',
    accentPipColor: '#38BDF8',
    innerFrameColor: 'rgba(167, 139, 250, 0.44)',
    shadowStyle:
      'inset 0 2px 5px rgba(196,181,253,0.38), inset 0 -4px 8px rgba(0,0,0,0.88)',
  },
];

export function getDiceStyleOption(style?: DiceStyle): DiceStyleOption {
  return (
    DICE_STYLE_OPTIONS.find((opt) => opt.id === style) || DICE_STYLE_OPTIONS[0]
  );
}

/**
 * Pure helper computing the 3D transform, transition curve, spin delta, and corner bevel
 * for a given dice style, face, and roll state.
 */
export function computeDiceRollTransform(params: {
  diceStyle: DiceStyle;
  face: number;
  rollCount: number;
  accumulatedSpin: { x: number; y: number; z: number };
  isRolling: boolean;
  isHovered: boolean;
  size: number;
  reducedMotion: boolean;
}): {
  cubeTransform: string;
  transitionStyle: string;
  nextSpinIncrement: { x: number; y: number; z: number };
  borderRadiusPx: number;
  liftPx: number;
} {
  const {
    diceStyle,
    face,
    rollCount,
    accumulatedSpin,
    isRolling,
    isHovered,
    size,
    reducedMotion,
  } = params;
  const styleOpt = getDiceStyleOption(diceStyle);
  const physics = styleOpt.rollPhysics;
  const safeFace = face >= 1 && face <= 6 ? face : 6;
  const baseRot = DICE_FACE_ROTATIONS[safeFace] || DICE_FACE_ROTATIONS[6];

  const turn = Math.max(1, rollCount);
  const nextSpinIncrement = {
    x: (physics.spinMultipliers.x + (turn % 2)) * 360,
    y: (physics.spinMultipliers.y + (turn % 3)) * 360,
    z:
      (turn % 2 === 0 ? 1 : -1) *
      physics.spinMultipliers.z *
      360,
  };

  const borderRadiusPx = Math.max(
    4,
    Math.round(size * styleOpt.cornerRadiusFactor)
  );
  const liftPx = Math.round(size * physics.liftRatio);

  if (reducedMotion) {
    return {
      cubeTransform: `rotateX(${baseRot.x}deg) rotateY(${baseRot.y}deg) rotateZ(${baseRot.z}deg)`,
      transitionStyle: 'transform 100ms ease-out',
      nextSpinIncrement,
      borderRadiusPx,
      liftPx: 0,
    };
  }

  const activeTilt = isHovered ? physics.hoverTilt : physics.idleTilt;
  const rotX = baseRot.x + accumulatedSpin.x + activeTilt.x;
  const rotY = baseRot.y + accumulatedSpin.y + activeTilt.y;
  const rotZ = baseRot.z + accumulatedSpin.z + activeTilt.z;

  if (isRolling) {
    return {
      cubeTransform: `translateY(-${liftPx}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${physics.rollScale})`,
      transitionStyle: `transform ${physics.rollDurationMs}ms ${physics.rollEasing}`,
      nextSpinIncrement,
      borderRadiusPx,
      liftPx,
    };
  }

  return {
    cubeTransform: `translateY(${isHovered ? -4 : 0}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(1)`,
    transitionStyle: `transform ${physics.settleDurationMs}ms ${physics.settleEasing}`,
    nextSpinIncrement,
    borderRadiusPx,
    liftPx,
  };
}

export const DEFAULT_PROFILE: UserProfile = {
  nickname: 'Grandmaster',
  avatar: 'crown',
  experiencePoints: 0,
  wins: 0,
};

export const AVATAR_OPTIONS: AvatarOption[] = [
  // Starter Crests (Unlocked by default)
  { id: 'crown', label: 'Royal Crown', icon: '👑', category: 'starter' },
  { id: 'knight', label: 'Valiant Knight', icon: '♟️', category: 'starter' },
  { id: 'shield', label: 'Aegis Shield', icon: '🛡️', category: 'starter' },
  { id: 'falcon', label: 'Golden Falcon', icon: '🦅', category: 'starter' },
  { id: 'lion', label: 'Sovereign Lion', icon: '🦁', category: 'starter' },
  { id: 'gem', label: 'Arcane Gem', icon: '💎', category: 'starter' },
  { id: 'flame', label: 'Solar Blaze', icon: '🔥', category: 'starter' },
  { id: 'compass', label: 'Navigator', icon: '🧭', category: 'starter' },

  // Unlockable Crests (Earned via Player Statistics & Progression)
  {
    id: 'swords',
    label: 'Gladiator',
    icon: '⚔️',
    category: 'progression',
    unlockRequirement: {
      metric: 'wins',
      threshold: 1,
      description: 'Achieve your 1st match victory',
    },
  },
  {
    id: 'target',
    label: 'Sharpshooter',
    icon: '🎯',
    category: 'progression',
    unlockRequirement: {
      metric: 'tokensCaptured',
      threshold: 5,
      description: 'Capture 5 opponent tokens',
    },
  },
  {
    id: 'sparkles',
    label: 'Spellcaster',
    icon: '✨',
    category: 'progression',
    unlockRequirement: {
      metric: 'experiencePoints',
      threshold: 250,
      description: 'Earn 250 Total Experience Points',
    },
  },
  {
    id: 'tiger',
    label: 'Apex Predator',
    icon: '🐯',
    category: 'progression',
    unlockRequirement: {
      metric: 'wins',
      threshold: 3,
      description: 'Win 3 career matches',
    },
  },
  {
    id: 'zap',
    label: 'Thunder Striker',
    icon: '⚡',
    category: 'progression',
    unlockRequirement: {
      metric: 'streak',
      threshold: 2,
      description: 'Achieve a 2-game winning streak',
    },
  },
  {
    id: 'dragon',
    label: 'Mythic Dragon',
    icon: '🐉',
    category: 'progression',
    unlockRequirement: {
      metric: 'tokensCaptured',
      threshold: 12,
      description: 'Capture 12 opponent tokens',
    },
  },
  {
    id: 'trophy',
    label: 'Grand Champion',
    icon: '🏆',
    category: 'progression',
    unlockRequirement: {
      metric: 'wins',
      threshold: 5,
      description: 'Win 5 career matches',
    },
  },
  {
    id: 'phoenix',
    label: 'Immortal Phoenix',
    icon: '🪶',
    category: 'progression',
    unlockRequirement: {
      metric: 'experiencePoints',
      threshold: 1000,
      description: 'Reach 1,000 Total Experience Points',
    },
  },
];

export const ACHIEVEMENTS_LIST = [
  {
    id: 'first_win',
    title: 'First Sovereign',
    description: 'Win your first complete match of Ludo Royale.',
    target: 1,
    metric: 'wins' as const,
  },
  {
    id: 'tactical_hunter',
    title: 'Tactical Hunter',
    description: 'Capture 10 opponent tokens across all matches.',
    target: 10,
    metric: 'tokensCaptured' as const,
  },
  {
    id: 'homecoming',
    title: 'Grand Homecoming',
    description: 'Guide 20 tokens safely into the central finishing triangle.',
    target: 20,
    metric: 'tokensHome' as const,
  },
  {
    id: 'high_roller',
    title: 'Fortune Favors the Bold',
    description: 'Roll a 6 twenty-five times across your career.',
    target: 25,
    metric: 'sixesRolled' as const,
  },
  {
    id: 'dynasty',
    title: 'Unbroken Dynasty',
    description: 'Achieve a winning streak of 3 consecutive victories.',
    target: 3,
    metric: 'longestWinStreak' as const,
  },
  {
    id: 'veteran',
    title: 'Tabletop Veteran',
    description: 'Complete 10 full games across any mode.',
    target: 10,
    metric: 'totalGames' as const,
  },
];

export const DEFAULT_STATS: PlayerStats = {
  totalGames: 0,
  wins: 0,
  losses: 0,
  tokensCaptured: 0,
  tokensHome: 0,
  sixesRolled: 0,
  currentWinStreak: 0,
  longestWinStreak: 0,
  modeCounts: {
    local: 0,
    ai: 0,
    friends: 0,
    matchmaking: 0,
  },
  unlockedAchievements: [],
  matchHistory: [],
};
