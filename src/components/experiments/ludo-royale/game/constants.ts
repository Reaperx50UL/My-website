import type {
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

export const ALL_PLAYER_COLORS: PlayerColor[] = [
  'red',
  'green',
  'yellow',
  'blue',
  'purple',
  'orange',
];

export const TOTAL_TRACK_CELLS = 52;
export const TOTAL_TRACK_CELLS_5P = 65; // 5 arms × 13 physical perimeter cells per arm
export const TOTAL_TRACK_CELLS_6P = 78; // 6 arms × 13 physical perimeter cells per arm

export const MAX_TRACK_STEPS = 50; // 0..50 are on the shared 4P perimeter track (51 squares)
export const HOME_PATH_START_STEP = 51; // 51..55 are the 5 colored home column squares (4P)
export const FINISH_STEP = 56; // 56 is the final home triangle / polygon (4P)

/**
 * Returns the maximum step index on the shared perimeter track before entering the home stretch:
 * - <=4 players (52 cells): 50 (steps 0..50 = 51 perimeter squares)
 * - 5 players (65 cells): 63 (steps 0..63 = 64 perimeter squares)
 * - 6 players (78 cells): 76 (steps 0..76 = 77 perimeter squares)
 */
export function getMaxTrackSteps(playerCount: number = 4): number {
  if (playerCount === 5) return 63;
  if (playerCount === 6) return 76;
  return MAX_TRACK_STEPS;
}

/**
 * Returns the first step index of the 5-cell colored Home Stretch for the active board layout:
 * - <=4 players: 51 (steps 51..55)
 * - 5 players: 64 (steps 64..68)
 * - 6 players: 77 (steps 77..81)
 */
export function getHomePathStartStep(playerCount: number = 4): number {
  if (playerCount === 5) return 64;
  if (playerCount === 6) return 77;
  return HOME_PATH_START_STEP;
}

/**
 * Returns the final Finish step index for the active board layout:
 * - <=4 players: 56
 * - 5 players: 69
 * - 6 players: 82
 */
export function getFinishStep(playerCount: number = 4): number {
  if (playerCount === 5) return 69;
  if (playerCount === 6) return 82;
  return FINISH_STEP;
}

/**
 * Starting track index (0..51) for each color on the 52-cell 4-player perimeter track.
 */
export const START_TRACK_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
  purple: 0,
  orange: 13,
};

/**
 * Starting track index (0..64) for each color on the 65-cell 5-player Pentagon perimeter track (5 arms × 13 physical cells).
 * On each arm k, local index 8 (col = +1, row = 4) is the Colored Start Square.
 */
export const START_TRACK_INDEX_5P: Record<PlayerColor, number> = {
  red: 8,
  green: 21,
  yellow: 34,
  blue: 47,
  purple: 60,
  orange: 8,
};

/**
 * Starting track index (0..77) for each color on the 78-cell 6-player Hexagon perimeter track (6 arms × 13 physical cells).
 * On each arm k, local index 8 (col = +1, row = 4) is the Colored Start Square.
 */
export const START_TRACK_INDEX_6P: Record<PlayerColor, number> = {
  red: 8,
  green: 21,
  yellow: 34,
  blue: 47,
  purple: 60,
  orange: 73,
};

/**
 * The colored starting squares on the main track (always safe) for 4P, 5P, and 6P boards.
 */
export const START_SAFE_INDICES: number[] = [0, 13, 26, 39];
export const START_SAFE_INDICES_5P: number[] = [8, 21, 34, 47, 60];
export const START_SAFE_INDICES_6P: number[] = [8, 21, 34, 47, 60, 73];

/**
 * The star safe squares on each arm (local index 3: col = -1, row = 3) for 4P, 5P, and 6P boards.
 */
export const STAR_SAFE_INDICES: number[] = [8, 21, 34, 47];
export const STAR_SAFE_INDICES_5P: number[] = [3, 16, 29, 42, 55];
export const STAR_SAFE_INDICES_6P: number[] = [3, 16, 29, 42, 55, 68];

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
  purple: {
    label: 'Amethyst Purple',
    symbol: '⬢',
    primaryHex: '#A855F7',
    secondaryHex: '#9333EA',
    lightHex: '#D8B4FE',
    darkHex: '#581C87',
    glowHex: 'rgba(168, 85, 247, 0.45)',
    bgClass: 'bg-purple-500',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/40',
  },
  orange: {
    label: 'Blaze Orange',
    symbol: '✦',
    primaryHex: '#F97316',
    secondaryHex: '#EA580C',
    lightHex: '#FDBA74',
    darkHex: '#9A3412',
    glowHex: 'rgba(249, 115, 22, 0.45)',
    bgClass: 'bg-orange-500',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/40',
  },
};

export const DEFAULT_HOUSE_RULES: HouseRules = {
  maxConsecutiveSixes: 3,
  bonusRollOnCapture: true,
  bonusRollOnHome: true,
  safeStarSquares: true,
  fastStart: false,
  allowBreakPairOnYardAndStar: true,
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
  {
    id: 'lava_cube',
    label: 'Lava Cube',
    tagline: 'FORGED IN VOLCANIC CORE',
    badgeIcon: '🌋',
    isPremium2D: true,
    subtitle: 'Cracked volcanic basalt plates, molten magma seams & glowing crater pips',
    pipShape: 'magma',
    texturePattern: 'volcanic_magma',
    textureLabel: 'Molten Basalt Fissures',
    animationProfile: 'lava_eruption',
    animationLabel: 'Seismic Magma Eruption',
    modelGeometry: 'obsidian_lava_2d',
    cornerRadiusFactor: 0.2,
    coreGlowHex: 'rgba(255, 85, 0, 0.88)',
    specularSheen:
      'radial-gradient(circle at 50% 50%, rgba(255,140,26,0.38) 0%, rgba(239,68,68,0.22) 45%, transparent 75%)',
    rollPhysics: {
      spinMultipliers: { x: 2, y: 3, z: 1 },
      liftRatio: 0.44,
      rollScale: 1.2,
      rollDurationMs: 660,
      settleDurationMs: 520,
      rollEasing: 'cubic-bezier(0.18, 0.88, 0.28, 1)',
      settleEasing: 'cubic-bezier(0.28, 1.52, 0.56, 1)',
      idleTilt: { x: 0, y: 0, z: 0 },
      hoverTilt: { x: -8, y: 10, z: -2 },
      idleAnimationClass: 'animate-dice-idle-lava',
      rollingEffectClass: 'animate-dice-roll-lava-2d',
      landingEffectClass: 'animate-dice-land-lava-2d',
    },
    surfaceGradient:
      'radial-gradient(circle at 50% 50%, #3B1206 0%, #1C0A05 55%, #0D0503 100%)',
    rolledSixGradient:
      'radial-gradient(circle at 50% 50%, #7C2D12 0%, #3B1206 58%, #140704 100%)',
    borderHex: '#FF6A00',
    pipColor: '#FFE866',
    accentPipColor: '#FFFFFF',
    innerFrameColor: 'rgba(255, 106, 0, 0.65)',
    shadowStyle:
      'inset 0 2px 6px rgba(255,140,26,0.55), inset 0 -4px 10px rgba(0,0,0,0.95)',
  },
  {
    id: 'electro_cube',
    label: 'Electro Cube',
    tagline: 'POWERED BY PURE ENERGY',
    badgeIcon: '⚡',
    isPremium2D: true,
    subtitle: 'Brushed titanium corner armor, neon cyan conduits & high-voltage arcs',
    pipShape: 'plasma',
    texturePattern: 'electric_plasma',
    textureLabel: 'High-Voltage Conduit',
    animationProfile: 'electro_surge',
    animationLabel: 'High-Voltage Warp Jitter',
    modelGeometry: 'plasma_electro_2d',
    cornerRadiusFactor: 0.16,
    coreGlowHex: 'rgba(0, 240, 255, 0.9)',
    specularSheen:
      'linear-gradient(135deg, rgba(0,240,255,0.38) 0%, rgba(56,189,248,0.16) 48%, transparent 78%)',
    rollPhysics: {
      spinMultipliers: { x: 4, y: 4, z: 2 },
      liftRatio: 0.52,
      rollScale: 1.18,
      rollDurationMs: 560,
      settleDurationMs: 440,
      rollEasing: 'cubic-bezier(0.1, 0.94, 0.2, 1)',
      settleEasing: 'cubic-bezier(0.2, 1.35, 0.45, 1)',
      idleTilt: { x: 0, y: 0, z: 0 },
      hoverTilt: { x: -10, y: 12, z: 2 },
      idleAnimationClass: 'animate-dice-idle-electro',
      rollingEffectClass: 'animate-dice-roll-electro-2d',
      landingEffectClass: 'animate-dice-land-electro-2d',
    },
    surfaceGradient:
      'radial-gradient(circle at 50% 50%, #0C2548 0%, #061329 58%, #020814 100%)',
    rolledSixGradient:
      'radial-gradient(circle at 50% 50%, #0369A1 0%, #091B3A 62%, #020814 100%)',
    borderHex: '#00F0FF',
    pipColor: '#67E8F9',
    accentPipColor: '#FFFFFF',
    innerFrameColor: 'rgba(0, 240, 255, 0.65)',
    shadowStyle:
      'inset 0 2px 6px rgba(0,240,255,0.55), inset 0 -4px 10px rgba(0,0,0,0.95)',
  },
  {
    id: 'tesseract_cube',
    label: 'Tesseract Cube',
    tagline: 'BEYOND DIMENSIONS',
    badgeIcon: '🔷',
    isPremium2D: true,
    subtitle: 'Crystalline 4D hypercube wireframe, perspective struts & energy nodes',
    pipShape: 'tesseract',
    texturePattern: 'dimensional_tesseract',
    textureLabel: '4D Nested Hyper-Planes',
    animationProfile: 'tesseract_warp',
    animationLabel: '4D Hypercube Phase-Shift',
    modelGeometry: 'hyper_tesseract_2d',
    cornerRadiusFactor: 0.12,
    coreGlowHex: 'rgba(168, 85, 247, 0.88)',
    specularSheen:
      'linear-gradient(135deg, rgba(192,132,252,0.38) 0%, rgba(56,189,248,0.26) 55%, transparent 85%)',
    rollPhysics: {
      spinMultipliers: { x: 3, y: 4, z: 2 },
      liftRatio: 0.54,
      rollScale: 1.18,
      rollDurationMs: 640,
      settleDurationMs: 520,
      rollEasing: 'cubic-bezier(0.16, 0.9, 0.25, 1)',
      settleEasing: 'cubic-bezier(0.26, 1.44, 0.52, 1)',
      idleTilt: { x: 0, y: 0, z: 0 },
      hoverTilt: { x: -9, y: -11, z: -2 },
      idleAnimationClass: 'animate-dice-idle-tesseract',
      rollingEffectClass: 'animate-dice-roll-tesseract-2d',
      landingEffectClass: 'animate-dice-land-tesseract-2d',
    },
    surfaceGradient:
      'radial-gradient(circle at 50% 50%, #2B1868 0%, #140D3A 56%, #07051A 100%)',
    rolledSixGradient:
      'radial-gradient(circle at 50% 50%, #4338CA 0%, #1E1B4B 58%, #07051A 100%)',
    borderHex: '#C084FC',
    pipColor: '#E879F9',
    accentPipColor: '#FFFFFF',
    innerFrameColor: 'rgba(167, 139, 250, 0.65)',
    shadowStyle:
      'inset 0 2px 6px rgba(224,231,255,0.5), inset 0 -4px 10px rgba(0,0,0,0.92)',
  },
  {
    id: 'cosmo_cube',
    label: 'Cosmo Cube',
    tagline: 'A UNIVERSE IN YOUR HANDS',
    badgeIcon: '🌌',
    isPremium2D: true,
    subtitle: 'Swirling spiral galaxy vortex, golden planetary rings & orbiting moons',
    pipShape: 'cosmos',
    texturePattern: 'voidnod_cosmos',
    textureLabel: 'VOIDNOD Spiral Galaxy',
    animationProfile: 'cosmo_nebula',
    animationLabel: 'Galactic Vortex & Supernova',
    modelGeometry: 'voidnod_cosmo_2d',
    cornerRadiusFactor: 0.22,
    coreGlowHex: 'rgba(192, 132, 252, 0.88)',
    specularSheen:
      'radial-gradient(circle at 30% 25%, rgba(244,114,182,0.38) 0%, rgba(56,189,248,0.26) 48%, transparent 78%)',
    rollPhysics: {
      spinMultipliers: { x: 3, y: 3, z: 2 },
      liftRatio: 0.56,
      rollScale: 1.18,
      rollDurationMs: 680,
      settleDurationMs: 560,
      rollEasing: 'cubic-bezier(0.2, 0.88, 0.3, 1)',
      settleEasing: 'cubic-bezier(0.28, 1.42, 0.56, 1)',
      idleTilt: { x: 0, y: 0, z: 0 },
      hoverTilt: { x: -10, y: 10, z: 3 },
      idleAnimationClass: 'animate-dice-idle-cosmo',
      rollingEffectClass: 'animate-dice-roll-cosmo-2d',
      landingEffectClass: 'animate-dice-land-cosmo-2d',
    },
    surfaceGradient:
      'radial-gradient(circle at 50% 50%, #3B0764 0%, #150936 52%, #040312 100%)',
    rolledSixGradient:
      'radial-gradient(circle at 50% 50%, #581C87 0%, #1E1B4B 56%, #040312 100%)',
    borderHex: '#E879F9',
    pipColor: '#BAE6FD',
    accentPipColor: '#FFFFFF',
    innerFrameColor: 'rgba(244, 114, 182, 0.6)',
    shadowStyle:
      'inset 0 2px 7px rgba(253,230,138,0.48), inset 0 -4px 10px rgba(0,0,0,0.95)',
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

/**
 * Duration of inactivity (10 seconds) after which the Lava Cube transitions
 * from its bright active lava flow state into its secondary "cooling ember"
 * idle state where the glow dims and pulses slowly until reactivated.
 */
export const LAVA_COOLING_TIMEOUT_MS = 10000;

export type LavaThermalState =
  | 'active_flow'
  | 'cooling_ember'
  | 'erupting_roll'
  | 'inactive';

export function computeLavaThermalState(params: {
  diceStyle: DiceStyle;
  isRolling: boolean;
  isLanding?: boolean;
  elapsedIdleMs: number;
  coolingTimeoutMs?: number;
}): LavaThermalState {
  const {
    diceStyle,
    isRolling,
    isLanding = false,
    elapsedIdleMs,
    coolingTimeoutMs = LAVA_COOLING_TIMEOUT_MS,
  } = params;

  if (diceStyle !== 'lava_cube') {
    return 'inactive';
  }
  if (isRolling || isLanding) {
    return 'erupting_roll';
  }
  if (elapsedIdleMs > coolingTimeoutMs) {
    return 'cooling_ember';
  }
  return 'active_flow';
}

/**
 * Duration (in ms) that the molten 'lava drop' splash remains visible on the
 * board surface when the Lava Cube lands after a roll.
 */
export const LAVA_DROP_SPLASH_DURATION_MS = 950;

export interface LavaSplashDropSpec {
  id: string;
  x: number;
  y: number;
  angleDeg: number;
  distance: number;
  rx: number;
  ry: number;
  delayMs: number;
  coreHex: string;
  midHex: string;
  crustHex: string;
}

export interface LavaBoardSplashEffect {
  centerX: number;
  centerY: number;
  puddleRadius: number;
  durationMs: number;
  drops: LavaSplashDropSpec[];
}

export function buildLavaDropSplashSpec(
  centerX = 750,
  centerY = 750,
  diceValue: number | null = 6
): LavaBoardSplashEffect {
  const safeVal = diceValue && diceValue >= 1 && diceValue <= 6 ? diceValue : 6;
  const dropCount = 8;
  const angleOffset = (safeVal * 23 * Math.PI) / 180;
  const drops: LavaSplashDropSpec[] = [];

  for (let i = 0; i < dropCount; i++) {
    const baseAngle = (i / dropCount) * Math.PI * 2 + angleOffset;
    const distance = 68 + ((i * 37 + safeVal * 13) % 86);
    const x = Math.round((centerX + Math.cos(baseAngle) * distance) * 10) / 10;
    const y = Math.round((centerY + Math.sin(baseAngle) * distance) * 10) / 10;
    const angleDeg = Math.round((baseAngle * 180) / Math.PI);
    const rx = 14 + (i % 3) * 5;
    const ry = 9 + ((i + 1) % 3) * 3;
    const delayMs = (i % 4) * 28;

    drops.push({
      id: `lava-drop-${i}`,
      x,
      y,
      angleDeg,
      distance,
      rx,
      ry,
      delayMs,
      coreHex: i % 2 === 0 ? '#FFF59D' : '#FFEE58',
      midHex: i % 2 === 0 ? '#FF6D00' : '#FF9100',
      crustHex: '#991B1B',
    });
  }

  return {
    centerX,
    centerY,
    puddleRadius: 56 + safeVal * 3,
    durationMs: LAVA_DROP_SPLASH_DURATION_MS,
    drops,
  };
}

/**
 * Specification for a periodic atmospheric volcanic 'steam vent' puff
 * rising from the Lava Cube's cracks when it enters its 'spitting' lava state.
 */
export interface LavaSteamVentSpec {
  id: string;
  originX: number;
  originY: number;
  driftX: number;
  riseY: number;
  radiusX: number;
  radiusY: number;
  durationMs: number;
  delayMs: number;
  baseTintHex: string;
  vaporHex: string;
}

/**
 * Pure deterministic generator for periodic volcanic steam vent puffs rising
 * from the Lava Cube's primary crack intersections during its spitting state.
 */
export function buildLavaSteamVentSpecs(count = 6): LavaSteamVentSpec[] {
  const crackFissures: Array<{
    x: number;
    y: number;
    driftX: number;
    riseY: number;
    rx: number;
    ry: number;
  }> = [
    { x: 42, y: 34, driftX: -7, riseY: -26, rx: 6.8, ry: 5.0 },
    { x: 78, y: 34, driftX: 8, riseY: -28, rx: 6.5, ry: 4.8 },
    { x: 34, y: 58, driftX: -9, riseY: -24, rx: 7.2, ry: 5.2 },
    { x: 86, y: 58, driftX: 9, riseY: -25, rx: 7.0, ry: 5.1 },
    { x: 56, y: 28, driftX: -3, riseY: -30, rx: 6.2, ry: 4.6 },
    { x: 66, y: 68, driftX: 5, riseY: -23, rx: 6.8, ry: 5.0 },
  ];

  const safeCount = Math.max(1, Math.min(12, Math.round(count)));
  const vents: LavaSteamVentSpec[] = [];

  for (let i = 0; i < safeCount; i++) {
    const fissure = crackFissures[i % crackFissures.length];
    const cycleOffset = Math.floor(i / crackFissures.length);
    vents.push({
      id: `lava-steam-vent-${i}`,
      originX: fissure.x + cycleOffset * 2,
      originY: fissure.y - cycleOffset * 2,
      driftX: fissure.driftX,
      riseY: fissure.riseY,
      radiusX: fissure.rx,
      radiusY: fissure.ry,
      durationMs: 740 + (i % 3) * 110,
      delayMs: i * 115,
      baseTintHex: i % 2 === 0 ? '#FDBA74' : '#FED7AA',
      vaporHex: i % 2 === 0 ? '#E2E8F0' : '#CBD5E1',
    });
  }

  return vents;
}

export interface ElectroIdleSparkSpec {
  id: string;
  rootX: number;
  rootY: number;
  sparkTipX: number;
  sparkTipY: number;
  mainBoltPath: string;
  branchBoltPath: string;
  snapDx: number;
  snapDy: number;
  durationMs: number;
  delayMs: number;
  coreHex: string;
  plasmaHex: string;
  coronaHex: string;
}

export interface ElectroBodyPulseSpec {
  id: string;
  conduitPath: string;
  nodeX: number;
  nodeY: number;
  dashArray: string;
  durationMs: number;
  delayMs: number;
  coreHex: string;
  plasmaHex: string;
}

export interface ElectroRollingPulseSpec {
  id: string;
  originX: number;
  originY: number;
  pulseWavePath: string;
  innerWavePath: string;
  lightningBoltPath: string;
  forkBranchPath: string;
  sparkX: number;
  sparkY: number;
  burstDx: number;
  burstDy: number;
  durationMs: number;
  delayMs: number;
  coreHex: string;
  plasmaHex: string;
  coronaHex: string;
}

/**
 * Pure deterministic generator for idle-state electric sparks snapping outward
 * from the body and corner electrodes of the Electro Cube.
 * Uses fine multi-segment fractal lightning geometry with acute-angle micro-branches.
 */
export function buildElectroIdleSparkSpecs(count = 8): ElectroIdleSparkSpec[] {
  const presets: Array<{
    rootX: number;
    rootY: number;
    sparkTipX: number;
    sparkTipY: number;
    mainBoltPath: string;
    branchBoltPath: string;
    snapDx: number;
    snapDy: number;
  }> = [
    // 1. Upper-Left Corner Compact Micro-Spark
    {
      rootX: 33,
      rootY: 35,
      sparkTipX: 23,
      sparkTipY: 28,
      mainBoltPath:
        'M 33 35 L 31 33 L 29 34 L 27 31 L 25 31 L 23 28',
      branchBoltPath:
        'M 29 34 L 27 36 M 27 31 L 25 28',
      snapDx: -1.5,
      snapDy: -1.2,
    },
    // 2. Upper-Right Corner Compact Micro-Spark
    {
      rootX: 87,
      rootY: 35,
      sparkTipX: 97,
      sparkTipY: 28,
      mainBoltPath:
        'M 87 35 L 89 33 L 91 34 L 93 31 L 95 31 L 97 28',
      branchBoltPath:
        'M 91 34 L 93 36 M 93 31 L 95 28',
      snapDx: 1.5,
      snapDy: -1.2,
    },
    // 3. Mid-Left Conduit Compact Micro-Spark
    {
      rootX: 29,
      rootY: 58,
      sparkTipX: 19,
      sparkTipY: 56,
      mainBoltPath:
        'M 29 58 L 27 57 L 25 59 L 23 56 L 21 57 L 19 56',
      branchBoltPath:
        'M 25 59 L 22 61 M 23 56 L 20 54',
      snapDx: -2,
      snapDy: 0,
    },
    // 4. Mid-Right Conduit Compact Micro-Spark
    {
      rootX: 91,
      rootY: 62,
      sparkTipX: 101,
      sparkTipY: 64,
      mainBoltPath:
        'M 91 62 L 93 63 L 95 61 L 97 64 L 99 63 L 101 64',
      branchBoltPath:
        'M 95 61 L 98 59 M 97 64 L 100 66',
      snapDx: 2,
      snapDy: 0,
    },
    // 5. Lower-Left Corner Compact Micro-Spark
    {
      rootX: 33,
      rootY: 85,
      sparkTipX: 23,
      sparkTipY: 92,
      mainBoltPath:
        'M 33 85 L 31 87 L 29 86 L 27 89 L 25 89 L 23 92',
      branchBoltPath:
        'M 29 86 L 26 85 M 27 89 L 26 92',
      snapDx: -1.5,
      snapDy: 1.5,
    },
    // 6. Lower-Right Corner Compact Micro-Spark
    {
      rootX: 87,
      rootY: 85,
      sparkTipX: 97,
      sparkTipY: 92,
      mainBoltPath:
        'M 87 85 L 89 87 L 91 86 L 93 89 L 95 89 L 97 92',
      branchBoltPath:
        'M 91 86 L 94 85 M 93 89 L 94 92',
      snapDx: 1.5,
      snapDy: 1.5,
    },
    // 7. Top Energy Conduit Compact Skimming Micro-Spark
    {
      rootX: 55,
      rootY: 29,
      sparkTipX: 63,
      sparkTipY: 23,
      mainBoltPath:
        'M 55 29 L 57 27 L 59 28 L 61 25 L 63 23',
      branchBoltPath:
        'M 59 28 L 57 24 M 61 25 L 64 24',
      snapDx: 1,
      snapDy: -1.2,
    },
    // 8. Bottom Energy Conduit Compact Micro-Spark
    {
      rootX: 65,
      rootY: 91,
      sparkTipX: 57,
      sparkTipY: 97,
      mainBoltPath:
        'M 65 91 L 63 93 L 61 92 L 59 95 L 57 97',
      branchBoltPath:
        'M 61 92 L 63 96 M 59 95 L 56 96',
      snapDx: -1,
      snapDy: 1.5,
    },
  ];

  const safeCount = Math.max(1, Math.min(12, Math.round(count)));
  const sparks: ElectroIdleSparkSpec[] = [];

  for (let i = 0; i < safeCount; i++) {
    const p = presets[i % presets.length];
    sparks.push({
      id: `electro-idle-spark-${i}`,
      rootX: p.rootX,
      rootY: p.rootY,
      sparkTipX: p.sparkTipX,
      sparkTipY: p.sparkTipY,
      mainBoltPath: p.mainBoltPath,
      branchBoltPath: p.branchBoltPath,
      snapDx: p.snapDx,
      snapDy: p.snapDy,
      durationMs: 520 + (i % 4) * 75,
      delayMs: i * 85,
      coreHex: '#FFFFFF',
      plasmaHex: i % 2 === 0 ? '#00F0FF' : '#38BDF8',
      coronaHex: '#0284C7',
    });
  }

  return sparks;
}

/**
 * Pure deterministic generator for high-voltage electric pulses coursing
 * through the internal body and circuit conduits of the Electro Cube.
 */
export function buildElectroBodyPulseSpecs(): ElectroBodyPulseSpec[] {
  return [
    {
      id: 'electro-body-pulse-perimeter-top-right',
      conduitPath:
        'M 36 31 L 48 30 L 54 32 L 66 30 L 74 31 L 84 31 L 89 36 L 90 48 L 88 56 L 90 70 L 89 84',
      nodeX: 60,
      nodeY: 31,
      dashArray: '14 38',
      durationMs: 960,
      delayMs: 0,
      coreHex: '#FFFFFF',
      plasmaHex: '#00F0FF',
    },
    {
      id: 'electro-body-pulse-perimeter-bottom-left',
      conduitPath:
        'M 84 89 L 72 90 L 64 88 L 52 90 L 36 89 L 31 84 L 30 72 L 32 62 L 30 48 L 31 36',
      nodeX: 60,
      nodeY: 89,
      dashArray: '14 38',
      durationMs: 920,
      delayMs: 140,
      coreHex: '#FFFFFF',
      plasmaHex: '#38BDF8',
    },
    {
      id: 'electro-body-pulse-diag-a',
      conduitPath:
        'M 34 34 L 41 39 L 44 45 L 51 49 L 56 56 L 63 61 L 68 68 L 75 72 L 80 79 L 86 86',
      nodeX: 44,
      nodeY: 45,
      dashArray: '12 34',
      durationMs: 820,
      delayMs: 80,
      coreHex: '#FFFFFF',
      plasmaHex: '#00F0FF',
    },
    {
      id: 'electro-body-pulse-diag-b',
      conduitPath:
        'M 86 34 L 79 40 L 75 46 L 68 51 L 62 58 L 55 63 L 49 70 L 42 75 L 34 86',
      nodeX: 75,
      nodeY: 46,
      dashArray: '12 34',
      durationMs: 860,
      delayMs: 260,
      coreHex: '#FFFFFF',
      plasmaHex: '#38BDF8',
    },
    {
      id: 'electro-body-pulse-cross-h',
      conduitPath:
        'M 31 60 L 38 58 L 45 61 L 53 58 L 60 61 L 68 58 L 76 61 L 83 59 L 89 60',
      nodeX: 45,
      nodeY: 61,
      dashArray: '11 32',
      durationMs: 780,
      delayMs: 190,
      coreHex: '#FFFFFF',
      plasmaHex: '#00F0FF',
    },
    {
      id: 'electro-body-pulse-cross-v',
      conduitPath:
        'M 60 31 L 58 38 L 61 45 L 58 53 L 61 60 L 58 68 L 61 76 L 59 83 L 60 89',
      nodeX: 61,
      nodeY: 45,
      dashArray: '11 32',
      durationMs: 810,
      delayMs: 340,
      coreHex: '#FFFFFF',
      plasmaHex: '#38BDF8',
    },
  ];
}

/**
 * Pure deterministic generator for rolling-state high-voltage electric pulses
 * and multi-branched fractal lightning discharges erupting outward from the Electro Cube.
 */
export function buildElectroRollingPulseSpecs(
  count = 8
): ElectroRollingPulseSpec[] {
  const presets: Array<{
    originX: number;
    originY: number;
    pulseWavePath: string;
    innerWavePath: string;
    lightningBoltPath: string;
    forkBranchPath: string;
    sparkX: number;
    sparkY: number;
    burstDx: number;
    burstDy: number;
  }> = [
    // 1. Upper-Left Whipping High-Voltage Lightning & Plasma Pulse Filament
    {
      originX: 44,
      originY: 44,
      pulseWavePath:
        'M 44 44 L 38 41 L 34 36 L 28 35 L 23 30 L 17 29 L 12 25',
      innerWavePath:
        'M 40 47 L 33 45 L 27 41 L 20 42 L 15 38',
      lightningBoltPath:
        'M 44 44 L 39 39 L 36 41 L 31 35 L 27 36 L 22 31 L 17 31 L 12 26',
      forkBranchPath:
        'M 31 35 L 29 29 L 24 26 M 22 31 L 16 35 L 11 34',
      sparkX: 10,
      sparkY: 25,
      burstDx: -7,
      burstDy: -3,
    },
    // 2. Upper-Right Whipping High-Voltage Lightning & Plasma Pulse Filament
    {
      originX: 96,
      originY: 44,
      pulseWavePath:
        'M 96 44 L 102 41 L 106 36 L 112 35 L 117 30 L 123 29 L 128 25',
      innerWavePath:
        'M 100 47 L 107 45 L 113 41 L 120 42 L 125 38',
      lightningBoltPath:
        'M 96 44 L 101 39 L 104 41 L 109 35 L 113 36 L 118 31 L 123 31 L 128 26',
      forkBranchPath:
        'M 109 35 L 111 29 L 116 26 M 118 31 L 124 35 L 129 34',
      sparkX: 130,
      sparkY: 25,
      burstDx: 7,
      burstDy: -3,
    },
    // 3. Mid-Left High-Voltage Plasma Surge & Multi-Forked Streamer
    {
      originX: 38,
      originY: 68,
      pulseWavePath:
        'M 38 68 L 31 65 L 26 68 L 19 64 L 13 67 L 7 64',
      innerWavePath:
        'M 37 73 L 30 75 L 23 72 L 16 75 L 10 73',
      lightningBoltPath:
        'M 38 68 L 32 66 L 29 70 L 23 66 L 18 69 L 13 65 L 7 67',
      forkBranchPath:
        'M 29 70 L 24 76 L 18 78 M 18 69 L 14 61 L 9 59',
      sparkX: 5,
      sparkY: 66,
      burstDx: -9,
      burstDy: 0,
    },
    // 4. Mid-Right High-Voltage Plasma Surge & Multi-Forked Streamer
    {
      originX: 102,
      originY: 72,
      pulseWavePath:
        'M 102 72 L 109 75 L 114 72 L 121 76 L 127 73 L 133 76',
      innerWavePath:
        'M 103 67 L 110 65 L 117 68 L 124 65 L 130 67',
      lightningBoltPath:
        'M 102 72 L 108 74 L 111 70 L 117 74 L 122 71 L 127 75 L 133 73',
      forkBranchPath:
        'M 111 70 L 116 64 L 122 62 M 122 71 L 126 79 L 131 81',
      sparkX: 135,
      sparkY: 74,
      burstDx: 9,
      burstDy: 0,
    },
    // 5. Lower-Left High-Voltage Discharge & Grounding Streamer
    {
      originX: 44,
      originY: 96,
      pulseWavePath:
        'M 44 96 L 38 99 L 34 104 L 28 105 L 23 110 L 17 112 L 13 116',
      innerWavePath:
        'M 48 99 L 43 105 L 37 108 L 32 114 L 26 117',
      lightningBoltPath:
        'M 44 96 L 39 101 L 36 99 L 31 105 L 27 104 L 22 109 L 17 110 L 13 115',
      forkBranchPath:
        'M 31 105 L 33 112 L 29 116 M 22 109 L 15 106 L 10 108',
      sparkX: 11,
      sparkY: 117,
      burstDx: -7,
      burstDy: 6,
    },
    // 6. Lower-Right High-Voltage Discharge & Grounding Streamer
    {
      originX: 96,
      originY: 96,
      pulseWavePath:
        'M 96 96 L 102 99 L 106 104 L 112 105 L 117 110 L 123 112 L 127 116',
      innerWavePath:
        'M 92 99 L 97 105 L 103 108 L 108 114 L 114 117',
      lightningBoltPath:
        'M 96 96 L 101 101 L 104 99 L 109 105 L 113 104 L 118 109 L 123 110 L 127 115',
      forkBranchPath:
        'M 109 105 L 107 112 L 111 116 M 118 109 L 125 106 L 130 108',
      sparkX: 129,
      sparkY: 117,
      burstDx: 7,
      burstDy: 6,
    },
    // 7. Upper Crown Jacob's-Ladder Skimming Plasma Pulse (stays compact below HUD text)
    {
      originX: 62,
      originY: 38,
      pulseWavePath:
        'M 52 36 L 58 31 L 64 33 L 71 29 L 78 32 L 85 29',
      innerWavePath:
        'M 56 39 L 63 35 L 70 37 L 77 34',
      lightningBoltPath:
        'M 62 38 L 65 33 L 69 35 L 74 29 L 79 31 L 84 27',
      forkBranchPath:
        'M 69 35 L 66 28 L 62 26 M 74 29 L 79 26',
      sparkX: 86,
      sparkY: 26,
      burstDx: 3,
      burstDy: -3,
    },
    // 8. Lower Base High-Voltage Plasma Arc & Forked Tendrils
    {
      originX: 70,
      originY: 102,
      pulseWavePath:
        'M 54 104 L 61 109 L 68 107 L 75 112 L 82 109 L 88 113',
      innerWavePath:
        'M 58 101 L 66 105 L 74 103 L 82 106',
      lightningBoltPath:
        'M 70 102 L 67 107 L 72 110 L 68 115 L 73 119 L 69 123',
      forkBranchPath:
        'M 72 110 L 79 113 L 84 112 M 68 115 L 61 118 L 57 117',
      sparkX: 68,
      sparkY: 125,
      burstDx: -2,
      burstDy: 6,
    },
  ];

  const safeCount = Math.max(1, Math.min(12, Math.round(count)));
  const pulses: ElectroRollingPulseSpec[] = [];

  for (let i = 0; i < safeCount; i++) {
    const p = presets[i % presets.length];
    pulses.push({
      id: `electro-rolling-pulse-${i}`,
      originX: p.originX,
      originY: p.originY,
      pulseWavePath: p.pulseWavePath,
      innerWavePath: p.innerWavePath,
      lightningBoltPath: p.lightningBoltPath,
      forkBranchPath: p.forkBranchPath,
      sparkX: p.sparkX,
      sparkY: p.sparkY,
      burstDx: p.burstDx,
      burstDy: p.burstDy,
      durationMs: 440 + (i % 3) * 65,
      delayMs: i * 58,
      coreHex: '#FFFFFF',
      plasmaHex: i % 2 === 0 ? '#00F0FF' : '#38BDF8',
      coronaHex: '#0284C7',
    });
  }

  return pulses;
}

export interface ElectroCircularWaveRingSpec {
  id: string;
  centerX: number;
  centerY: number;
  baseRadius: number;
  /** 36-segment closed 360-degree jagged circular electric wave path */
  waveRingPath: string;
  /** Counter-phased harmonic circular plasma filament path */
  harmonicRingPath: string;
  /** Radial micro-sparks snapping off the expanding circular wavefront */
  radialSparksPath: string;
  durationMs: number;
  delayMs: number;
  coreHex: string;
  plasmaHex: string;
  coronaHex: string;
}

/**
 * Generates staggered concentric 360-degree realistic circular electric pulse waves
 * that expand outward from the rolling Electro Cube in a wave-like pattern.
 */
export function buildElectroCircularWaveRings(
  count = 3
): ElectroCircularWaveRingSpec[] {
  const safeCount = Math.max(1, Math.min(6, Math.round(count)));
  const cx = 70;
  const cy = 70;
  const rings: ElectroCircularWaveRingSpec[] = [];

  for (let rIdx = 0; rIdx < safeCount; rIdx++) {
    // Larger launch radius outside the cube perimeter so expanding circular electric waves are more prominent
    const baseRadius = 43;
    const segments = 48;
    const mainPts: string[] = [];
    const harmPts: string[] = [];
    const sparkSegments: string[] = [];

    for (let s = 0; s < segments; s++) {
      const theta = (s / segments) * Math.PI * 2;
      // Clean 8-crest wave-like sinusoidal undulation + crisp lightning micro-kink
      const waveUndulation = Math.sin(theta * 8 + rIdx * 2.09) * 1.65;
      const crinkleA =
        waveUndulation +
        Math.sin(theta * 16 + rIdx * 1.7) * 0.82 +
        Math.cos(theta * 24 - rIdx * 1.3) * 0.48;
      const crinkleB =
        -waveUndulation * 0.65 +
        Math.cos(theta * 16 - rIdx * 2.1) * 0.65;

      const radA = baseRadius + crinkleA;
      const radB = baseRadius * 0.96 + crinkleB;

      const xA = Number((cx + Math.cos(theta) * radA).toFixed(2));
      const yA = Number((cy + Math.sin(theta) * radA).toFixed(2));
      const xB = Number((cx + Math.cos(theta) * radB).toFixed(2));
      const yB = Number((cy + Math.sin(theta) * radB).toFixed(2));

      mainPts.push(`${s === 0 ? 'M' : 'L'} ${xA} ${yA}`);
      harmPts.push(`${s === 0 ? 'M' : 'L'} ${xB} ${yB}`);

      // Emit 6 clean radial electric leaders at the wave crests
      if (s % 8 === (rIdx * 2) % 8) {
        const midR = radA + 2.6;
        const tipR = radA + 5.2;
        const mTheta = theta + 0.04;
        const tTheta = theta - 0.03;
        const mx = Number((cx + Math.cos(mTheta) * midR).toFixed(2));
        const my = Number((cy + Math.sin(mTheta) * midR).toFixed(2));
        const tx = Number((cx + Math.cos(tTheta) * tipR).toFixed(2));
        const ty = Number((cy + Math.sin(tTheta) * tipR).toFixed(2));
        sparkSegments.push(`M ${xA} ${yA} L ${mx} ${my} L ${tx} ${ty}`);
      }
    }

    mainPts.push('Z');
    harmPts.push('Z');

    rings.push({
      id: `electro-circular-wave-${rIdx}`,
      centerX: cx,
      centerY: cy,
      baseRadius,
      waveRingPath: mainPts.join(' '),
      harmonicRingPath: harmPts.join(' '),
      radialSparksPath: sparkSegments.join(' '),
      durationMs: 585,
      delayMs: rIdx * 195,
      coreHex: '#FFFFFF',
      plasmaHex: rIdx % 2 === 0 ? '#00F0FF' : '#38BDF8',
      coronaHex: '#0284C7',
    });
  }

  return rings;
}

// ============================================================================
// TESSERACT CUBE: 4D-WARP ROLLING STATE & 6-FACE INSIDE-OUT CSS 3D TRANSFORMS
// ============================================================================

export type TesseractWarpFaceId =
  | 'front'
  | 'back'
  | 'right'
  | 'left'
  | 'top'
  | 'bottom';

export type TesseractWarpPhase =
  | 'idle_3d'
  | 'warping_4d'
  | 'realigning_4d'
  | 'inactive';

export interface TesseractWarpFaceSpec {
  id: string;
  faceId: TesseractWarpFaceId;
  faceValue: number;
  axis: 'X' | 'Y' | 'Z';
  polarity: 1 | -1;
  dimensionLabel: string;
  /** Standard 3D cube face resting CSS transform */
  restTransform: string;
  /** Continuous idle 4D hypercube precession & dimensional breathing CSS transform */
  idlePrecessTransform: string;
  /** 4D inside-out eversion transform where the outer face inverts across the w-axis through the hypercube core */
  insideOutTransform: string;
  /** 4D orthogonal hyperplane shift transform where the face projects across dimensions */
  dimensionalShiftTransform: string;
  /** Staggered phase offset (ms) so opposite hypercube face pairs invert sequentially */
  warpDelayMs: number;
  /** Full 4D-warp cycle duration (ms) */
  warpDurationMs: number;
  primaryBorderHex: string;
  secondaryGlowHex: string;
  /** Normalized [x, y] coordinates in 0..100 face space for this face's pip value (1..6) */
  pipCoords: Array<[number, number]>;
}

export interface TesseractIdleEnergyPulseSpec {
  id: string;
  path: string;
  dashArray: string;
  durationMs: number;
  delayMs: number;
  strokeHex: string;
}

/**
 * Generates deterministic 4D hypercube conduit pulse paths for the Tesseract Cube's
 * transparent idle animation (traveling dimensional light packets along the 8 diagonal
 * 4D vertex struts and nested inner hypercube chambers).
 */
export function buildTesseractIdleEnergyPulses(): TesseractIdleEnergyPulseSpec[] {
  return [
    {
      id: 'tesseract-idle-pulse-strut-tl-br',
      path: 'M 12 12 L 28 28 L 38 38 L 62 62 L 72 72 L 88 88',
      dashArray: '14 42',
      durationMs: 1850,
      delayMs: 0,
      strokeHex: '#67E8F9',
    },
    {
      id: 'tesseract-idle-pulse-strut-tr-bl',
      path: 'M 88 12 L 72 28 L 62 38 L 38 62 L 28 72 L 12 88',
      dashArray: '14 42',
      durationMs: 1850,
      delayMs: 420,
      strokeHex: '#E879F9',
    },
    {
      id: 'tesseract-idle-pulse-inner-chamber',
      path: 'M 28 28 L 72 28 L 72 72 L 28 72 Z',
      dashArray: '22 56',
      durationMs: 2200,
      delayMs: 180,
      strokeHex: '#67E8F9',
    },
    {
      id: 'tesseract-idle-pulse-deep-core',
      path: 'M 38 38 L 62 38 L 62 62 L 38 62 Z',
      dashArray: '16 40',
      durationMs: 1650,
      delayMs: 310,
      strokeHex: '#F0ABFC',
    },
  ];
}

/**
 * Computes the current 4D dimensional phase of the Tesseract Cube.
 */
export function computeTesseractWarpPhase(params: {
  diceStyle: DiceStyle;
  isRolling: boolean;
  isLanding?: boolean;
}): TesseractWarpPhase {
  const { diceStyle, isRolling, isLanding = false } = params;
  if (diceStyle !== 'tesseract_cube') {
    return 'inactive';
  }
  if (isRolling) {
    return 'warping_4d';
  }
  if (isLanding) {
    return 'realigning_4d';
  }
  return 'idle_3d';
}

const TESSERACT_PIP_LAYOUTS: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [
    [29, 29],
    [71, 71],
  ],
  3: [
    [27, 27],
    [50, 50],
    [73, 73],
  ],
  4: [
    [29, 29],
    [71, 29],
    [29, 71],
    [71, 71],
  ],
  5: [
    [27, 27],
    [73, 27],
    [50, 50],
    [27, 73],
    [73, 73],
  ],
  6: [
    [29, 25],
    [71, 25],
    [29, 50],
    [71, 50],
    [29, 75],
    [71, 75],
  ],
};

/**
 * Builds deterministic CSS 3D transform specifications for all 6 faces of the Tesseract Cube
 * ('front', 'back', 'right', 'left', 'top', 'bottom') so that during the rolling state,
 * the 6 faces momentarily flip inside-out through the 4D hypercube core and shift dimensions
 * via CSS 3D transform transitions while preserving opposite-faces-sum-to-7 topology.
 */
export function buildTesseractWarpFaceSpecs(
  activeFrontValue = 6,
  cubeHalfExtentPx = 22
): TesseractWarpFaceSpec[] {
  const frontVal =
    activeFrontValue >= 1 && activeFrontValue <= 6
      ? Math.round(activeFrontValue)
      : 6;
  const backVal = 7 - frontVal;

  // Pick orthogonal right/top values that never collide with front/back and sum to 7 with their opposites
  const remaining = [1, 2, 3, 4, 5, 6].filter(
    (v) => v !== frontVal && v !== backVal
  );
  const rightVal = remaining[0] ?? 3;
  const leftVal = 7 - rightVal;
  const topRemaining = remaining.filter((v) => v !== rightVal && v !== leftVal);
  const topVal = topRemaining[0] ?? 2;
  const bottomVal = 7 - topVal;

  const z = Math.max(12, Math.min(48, Math.round(cubeHalfExtentPx)));
  const idleZ = Math.max(10, Math.round(z * 0.78));
  const innerZ = Math.round(z * 0.48);
  const shiftZ = Math.round(z * 1.28);

  const faceConfigs: Array<{
    faceId: TesseractWarpFaceId;
    faceValue: number;
    axis: 'X' | 'Y' | 'Z';
    polarity: 1 | -1;
    dimensionLabel: string;
    baseRotation: string;
    idleRotation: string;
    insideOutRotation: string;
    shiftRotation: string;
    warpDelayMs: number;
    primaryBorderHex: string;
    secondaryGlowHex: string;
  }> = [
    {
      faceId: 'front',
      faceValue: frontVal,
      axis: 'Z',
      polarity: 1,
      dimensionLabel: '+W/+Z',
      baseRotation: 'rotateX(0deg) rotateY(0deg)',
      idleRotation: 'rotateX(6deg) rotateY(-8deg) rotateZ(12deg)',
      insideOutRotation: 'rotateX(180deg) rotateY(0deg) rotateZ(45deg)',
      shiftRotation: 'rotateX(24deg) rotateY(-28deg) rotateZ(90deg)',
      warpDelayMs: 0,
      primaryBorderHex: '#67E8F9',
      secondaryGlowHex: '#C084FC',
    },
    {
      faceId: 'back',
      faceValue: backVal,
      axis: 'Z',
      polarity: -1,
      dimensionLabel: '-W/-Z',
      baseRotation: 'rotateX(0deg) rotateY(180deg)',
      idleRotation: 'rotateX(-6deg) rotateY(188deg) rotateZ(-12deg)',
      insideOutRotation: 'rotateX(180deg) rotateY(180deg) rotateZ(-45deg)',
      shiftRotation: 'rotateX(-24deg) rotateY(152deg) rotateZ(-90deg)',
      warpDelayMs: 55,
      primaryBorderHex: '#E879F9',
      secondaryGlowHex: '#38BDF8',
    },
    {
      faceId: 'right',
      faceValue: rightVal,
      axis: 'X',
      polarity: 1,
      dimensionLabel: '+W/+X',
      baseRotation: 'rotateX(0deg) rotateY(90deg)',
      idleRotation: 'rotateX(8deg) rotateY(82deg) rotateZ(12deg)',
      insideOutRotation: 'rotateX(0deg) rotateY(-90deg) rotateZ(45deg)',
      shiftRotation: 'rotateX(28deg) rotateY(118deg) rotateZ(90deg)',
      warpDelayMs: 110,
      primaryBorderHex: '#38BDF8',
      secondaryGlowHex: '#E879F9',
    },
    {
      faceId: 'left',
      faceValue: leftVal,
      axis: 'X',
      polarity: -1,
      dimensionLabel: '-W/-X',
      baseRotation: 'rotateX(0deg) rotateY(-90deg)',
      idleRotation: 'rotateX(-8deg) rotateY(-82deg) rotateZ(-12deg)',
      insideOutRotation: 'rotateX(0deg) rotateY(90deg) rotateZ(-45deg)',
      shiftRotation: 'rotateX(-28deg) rotateY(-118deg) rotateZ(-90deg)',
      warpDelayMs: 165,
      primaryBorderHex: '#C084FC',
      secondaryGlowHex: '#67E8F9',
    },
    {
      faceId: 'top',
      faceValue: topVal,
      axis: 'Y',
      polarity: 1,
      dimensionLabel: '+W/+Y',
      baseRotation: 'rotateX(90deg) rotateY(0deg)',
      idleRotation: 'rotateX(82deg) rotateY(8deg) rotateZ(12deg)',
      insideOutRotation: 'rotateX(-90deg) rotateY(180deg) rotateZ(45deg)',
      shiftRotation: 'rotateX(118deg) rotateY(24deg) rotateZ(90deg)',
      warpDelayMs: 220,
      primaryBorderHex: '#67E8F9',
      secondaryGlowHex: '#F472B6',
    },
    {
      faceId: 'bottom',
      faceValue: bottomVal,
      axis: 'Y',
      polarity: -1,
      dimensionLabel: '-W/-Y',
      baseRotation: 'rotateX(-90deg) rotateY(0deg)',
      idleRotation: 'rotateX(-82deg) rotateY(-8deg) rotateZ(-12deg)',
      insideOutRotation: 'rotateX(90deg) rotateY(180deg) rotateZ(-45deg)',
      shiftRotation: 'rotateX(-118deg) rotateY(-24deg) rotateZ(-90deg)',
      warpDelayMs: 275,
      primaryBorderHex: '#E879F9',
      secondaryGlowHex: '#67E8F9',
    },
  ];

  return faceConfigs.map((cfg) => ({
    id: `tesseract-warp-face-${cfg.faceId}`,
    faceId: cfg.faceId,
    faceValue: cfg.faceValue,
    axis: cfg.axis,
    polarity: cfg.polarity,
    dimensionLabel: cfg.dimensionLabel,
    restTransform: `${cfg.baseRotation} translateZ(${z}px) scale3d(1, 1, 1)`,
    idlePrecessTransform: `${cfg.idleRotation} translateZ(${idleZ}px) scale3d(0.76, 0.76, 0.76)`,
    insideOutTransform: `${cfg.insideOutRotation} translateZ(-${innerZ}px) scale3d(-0.56, 0.56, 0.56)`,
    dimensionalShiftTransform: `${cfg.shiftRotation} translateZ(${shiftZ}px) scale3d(1.12, 1.12, 1.12)`,
    warpDelayMs: cfg.warpDelayMs,
    warpDurationMs: 620,
    primaryBorderHex: cfg.primaryBorderHex,
    secondaryGlowHex: cfg.secondaryGlowHex,
    pipCoords: TESSERACT_PIP_LAYOUTS[cfg.faceValue] ?? TESSERACT_PIP_LAYOUTS[6],
  }));
}

// ============================================================================
// COSMO CUBE: IDLE CELESTIAL GALAXY ORBITS & ROLLING SUPERNOVA VORTEX SPECS
// ============================================================================

export interface CosmoIdleOrbitSpec {
  id: string;
  rx: number;
  ry: number;
  tiltDeg: number;
  strokeHex: string;
  dashArray: string;
  planetX: number;
  planetY: number;
  planetRadius: number;
  planetHex: string;
  moonX: number;
  moonY: number;
  moonHex: string;
  durationMs: number;
  direction: 'cw' | 'ccw';
}

export interface CosmoIdleStarGlintSpec {
  id: string;
  cx: number;
  cy: number;
  diamondPath: string;
  colorHex: string;
  durationMs: number;
  delayMs: number;
}

export interface CosmoIdleCelestialSpec {
  galaxySpiralArms: ReadonlyArray<{
    id: string;
    armPath: string;
    glowHex: string;
    coreHex: string;
  }>;
  orbits: ReadonlyArray<CosmoIdleOrbitSpec>;
  starGlints: ReadonlyArray<CosmoIdleStarGlintSpec>;
}

/**
 * Generates the idle-state celestial animation specs for the Cosmo Cube
 * ("A Universe In Your Hands"): a 4-arm swirling spiral galaxy vortex,
 * tilted golden-amber & rose-magenta elliptical planetary orbits with
 * revolving planets/moons, and twinkling 4-point diamond starlight glints.
 */
export function buildCosmoIdleCelestialSpecs(): CosmoIdleCelestialSpec {
  const cx = 50;
  const cy = 50;
  const armColors: ReadonlyArray<readonly [string, string]> = [
    ['rgba(244, 114, 182, 0.65)', '#F5D0FE'],
    ['rgba(192, 132, 252, 0.68)', '#E9D5FF'],
    ['rgba(56, 189, 248, 0.64)', '#BAE6FD'],
    ['rgba(251, 191, 36, 0.62)', '#FEF08A'],
  ];

  const galaxySpiralArms = armColors.map(([glowHex, coreHex], idx) => {
    const startAngle = (idx * Math.PI) / 2;
    const pts: string[] = [];
    const steps = 18;
    for (let s = 0; s <= steps; s++) {
      const prog = s / steps;
      const theta = startAngle + prog * Math.PI * 1.45;
      const rad = 3.5 + prog * 26.5;
      const x = Number((cx + Math.cos(theta) * rad).toFixed(2));
      const y = Number((cy + Math.sin(theta) * rad * 0.86).toFixed(2));
      pts.push(`${s === 0 ? 'M' : 'L'} ${x} ${y}`);
    }
    return {
      id: `cosmo-idle-spiral-arm-${idx}`,
      armPath: pts.join(' '),
      glowHex,
      coreHex,
    };
  });

  const orbits: CosmoIdleOrbitSpec[] = [
    {
      id: 'cosmo-idle-orbit-gold',
      rx: 46,
      ry: 15.5,
      tiltDeg: -30,
      strokeHex: '#FBBF24',
      dashArray: '16 7',
      planetX: 96,
      planetY: 50,
      planetRadius: 2.3,
      planetHex: '#FDE68A',
      moonX: 4,
      moonY: 50,
      moonHex: '#38BDF8',
      durationMs: 4600,
      direction: 'cw',
    },
    {
      id: 'cosmo-idle-orbit-rose',
      rx: 43,
      ry: 18.5,
      tiltDeg: 26,
      strokeHex: '#F472B6',
      dashArray: '12 8',
      planetX: 7,
      planetY: 50,
      planetRadius: 2.0,
      planetHex: '#F5D0FE',
      moonX: 93,
      moonY: 50,
      moonHex: '#C084FC',
      durationMs: 5400,
      direction: 'ccw',
    },
  ];

  const starCoords: ReadonlyArray<readonly [number, number, number, string]> = [
    [12, 14, 3.2, '#FDE68A'],
    [88, 15, 2.9, '#BAE6FD'],
    [11, 86, 3.0, '#F5D0FE'],
    [89, 86, 3.3, '#FDE68A'],
    [50, 5, 2.7, '#FFFFFF'],
    [50, 95, 2.8, '#38BDF8'],
  ];

  const starGlints: CosmoIdleStarGlintSpec[] = starCoords.map(
    ([sx, sy, size, colorHex], idx) => {
      const inner = Number((size * 0.34).toFixed(2));
      const diamondPath = [
        `M ${sx} ${Number((sy - size).toFixed(2))}`,
        `L ${Number((sx + inner).toFixed(2))} ${Number((sy - inner).toFixed(2))}`,
        `L ${Number((sx + size).toFixed(2))} ${sy}`,
        `L ${Number((sx + inner).toFixed(2))} ${Number((sy + inner).toFixed(2))}`,
        `L ${sx} ${Number((sy + size).toFixed(2))}`,
        `L ${Number((sx - inner).toFixed(2))} ${Number((sy + inner).toFixed(2))}`,
        `L ${Number((sx - size).toFixed(2))} ${sy}`,
        `L ${Number((sx - inner).toFixed(2))} ${Number((sy - inner).toFixed(2))}`,
        'Z',
      ].join(' ');
      return {
        id: `cosmo-idle-star-${idx}`,
        cx: sx,
        cy: sy,
        diamondPath,
        colorHex,
        durationMs: 1800 + (idx % 3) * 320,
        delayMs: idx * 210,
      };
    }
  );

  return {
    galaxySpiralArms,
    orbits,
    starGlints,
  };
}

export interface CosmoRollingSpiralArmSpec {
  id: string;
  spiralArmPath: string;
  starlightTrailPath: string;
  coreHex: string;
  nebulaHex: string;
  tipX: number;
  tipY: number;
  delayMs: number;
}

export interface CosmoRollingCometSpec {
  id: string;
  cometTailPath: string;
  headX: number;
  headY: number;
  headHex: string;
  tailHex: string;
  durationMs: number;
  delayMs: number;
}

export interface CosmoRollingSupernovaSpec {
  spiralArms: ReadonlyArray<CosmoRollingSpiralArmSpec>;
  comets: ReadonlyArray<CosmoRollingCometSpec>;
  accretionRingRadius: number;
}

/**
 * Generates the unique rolling-state Cosmic Supernova & Spiral Galaxy Vortex
 * specs for the Cosmo Cube: 4 expanding logarithmic spiral galaxy arms
 * whipping outward around the cube perimeter, 3 blazing shooting-star comet
 * arcs streaking around the cube, and a pulsing supernova accretion ring.
 */
export function buildCosmoRollingSupernovaSpecs(): CosmoRollingSupernovaSpec {
  const cx = 60;
  const cy = 60;
  const palette: ReadonlyArray<readonly [string, string]> = [
    ['#FFFFFF', '#F472B6'],
    ['#FEF08A', '#FBBF24'],
    ['#FFFFFF', '#38BDF8'],
    ['#F5D0FE', '#C084FC'],
  ];

  const spiralArms: CosmoRollingSpiralArmSpec[] = palette.map(
    ([coreHex, nebulaHex], idx) => {
      const startAngle = (idx * Math.PI) / 2;
      const mainPts: string[] = [];
      const trailPts: string[] = [];
      const steps = 18;
      let tipX = cx;
      let tipY = cy;

      for (let s = 0; s <= steps; s++) {
        const prog = s / steps;
        const theta = startAngle + prog * Math.PI * 0.92;
        const rad = 32 + prog * 21;
        const x = Number((cx + Math.cos(theta) * rad).toFixed(2));
        const y = Number((cy + Math.sin(theta) * rad).toFixed(2));
        const tx = Number((cx + Math.cos(theta - 0.14) * (rad * 0.95)).toFixed(2));
        const ty = Number((cy + Math.sin(theta - 0.14) * (rad * 0.95)).toFixed(2));
        mainPts.push(`${s === 0 ? 'M' : 'L'} ${x} ${y}`);
        trailPts.push(`${s === 0 ? 'M' : 'L'} ${tx} ${ty}`);
        if (s === steps) {
          tipX = x;
          tipY = y;
        }
      }

      return {
        id: `cosmo-rolling-spiral-${idx}`,
        spiralArmPath: mainPts.join(' '),
        starlightTrailPath: trailPts.join(' '),
        coreHex,
        nebulaHex,
        tipX,
        tipY,
        delayMs: idx * 95,
      };
    }
  );

  const cometConfigs: ReadonlyArray<
    readonly [number, number, string, string, number]
  > = [
    [0.15, 48, '#FEF08A', '#F472B6', 520],
    [2.25, 50, '#FFFFFF', '#38BDF8', 560],
    [4.35, 46, '#F5D0FE', '#C084FC', 490],
  ];

  const comets: CosmoRollingCometSpec[] = cometConfigs.map(
    ([startAngle, radius, headHex, tailHex, durationMs], idx) => {
      const arcSteps = 14;
      const arcSpan = Math.PI * 0.55;
      const pts: string[] = [];
      let headX = cx;
      let headY = cy;

      for (let s = 0; s <= arcSteps; s++) {
        const prog = s / arcSteps;
        const theta = startAngle + prog * arcSpan;
        const r = radius - (1 - prog) * 3;
        const x = Number((cx + Math.cos(theta) * r).toFixed(2));
        const y = Number((cy + Math.sin(theta) * r).toFixed(2));
        pts.push(`${s === 0 ? 'M' : 'L'} ${x} ${y}`);
        if (s === arcSteps) {
          headX = x;
          headY = y;
        }
      }

      return {
        id: `cosmo-rolling-comet-${idx}`,
        cometTailPath: pts.join(' '),
        headX,
        headY,
        headHex,
        tailHex,
        durationMs,
        delayMs: idx * 140,
      };
    }
  );

  return {
    spiralArms,
    comets,
    accretionRingRadius: 48,
  };
}

// ============================================================================
// VICTORY MODAL: CONFETTI EXPLOSION CANVAS ENGINE
// ============================================================================

export type VictoryConfettiShape = 'ribbon' | 'diamond' | 'star' | 'circle';

export interface VictoryConfettiParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  shape: VictoryConfettiShape;
  rotation: number;
  rotationSpeed: number;
  tiltAngle: number;
  tiltSpeed: number;
  gravity: number;
  drag: number;
  opacity: number;
  burstWave: number;
}

/**
 * Returns a celebratory confetti color palette anchored by the winning player's
 * signature royal color, accented with Grandmaster Gold, Champagne Ivory, and festive jewel tones.
 */
export function getVictoryConfettiPalette(
  winnerColor: PlayerColor = 'red'
): string[] {
  const meta = COLOR_META[winnerColor] || COLOR_META.red;
  return [
    meta.primaryHex,
    meta.secondaryHex,
    meta.lightHex,
    '#F59E0B', // Royal Gold
    '#FDE047', // Sunburst Yellow
    '#F8FAFC', // Platinum Ivory
    '#38BDF8', // Celestial Cyan
    '#10B981', // Emerald Spark
    '#F472B6', // Rose Starlight
  ];
}

/**
 * Deterministically generates a multi-origin celebratory confetti explosion burst
 * across the canvas viewport (central trophy crest explosion + left/right podium cannons).
 */
export function createVictoryConfettiBurst(
  winnerColor: PlayerColor = 'red',
  viewportWidth: number = 1280,
  viewportHeight: number = 800,
  burstWave: number = 0
): VictoryConfettiParticle[] {
  const safeW = Math.max(320, viewportWidth);
  const safeH = Math.max(320, viewportHeight);
  const palette = getVictoryConfettiPalette(winnerColor);
  const shapes: ReadonlyArray<VictoryConfettiShape> = [
    'ribbon',
    'diamond',
    'star',
    'circle',
  ];

  const count = burstWave === 0 ? 96 : 54;
  const particles: VictoryConfettiParticle[] = [];

  for (let i = 0; i < count; i++) {
    // 3 emitter origins: 0 = center trophy burst, 1 = left podium cannon, 2 = right podium cannon
    const emitter = i % 3;
    const goldenAngle = i * 2.399963229728653; // Golden angle in radians for uniform radial distribution
    const norm = (i + 1) / count;

    let originX = safeW * 0.5;
    let originY = safeH * 0.36;
    let launchAngle = -Math.PI / 2 + Math.sin(goldenAngle) * 1.35;
    let speed = 280 + ((i * 67) % 420);

    if (emitter === 1) {
      // Left podium cannon firing up-right toward center
      originX = safeW * 0.16;
      originY = safeH * 0.68;
      launchAngle = -Math.PI * 0.34 + Math.sin(goldenAngle) * 0.38;
      speed = 420 + ((i * 83) % 380);
    } else if (emitter === 2) {
      // Right podium cannon firing up-left toward center
      originX = safeW * 0.84;
      originY = safeH * 0.68;
      launchAngle = -Math.PI * 0.66 + Math.cos(goldenAngle) * 0.38;
      speed = 420 + ((i * 79) % 380);
    } else {
      // Central radial trophy explosion around the Victory crest
      launchAngle = (i / (count / 3)) * Math.PI * 2 - Math.PI / 2;
      speed = 210 + ((i * 97) % 430);
    }

    const shape = shapes[i % shapes.length];
    const width =
      shape === 'ribbon'
        ? 11 + (i % 6)
        : shape === 'star'
        ? 10 + (i % 5)
        : 8 + (i % 5);
    const height =
      shape === 'ribbon'
        ? 5 + (i % 4)
        : width;

    particles.push({
      id: burstWave * 1000 + i,
      x: Number((originX + Math.cos(goldenAngle) * 14).toFixed(2)),
      y: Number((originY + Math.sin(goldenAngle) * 14).toFixed(2)),
      vx: Number((Math.cos(launchAngle) * speed).toFixed(2)),
      vy: Number((Math.sin(launchAngle) * speed - 95 * (1 - norm * 0.4)).toFixed(2)),
      width,
      height,
      color: palette[i % palette.length],
      shape,
      rotation: Number(((i * 47) % 360) * (Math.PI / 180)),
      rotationSpeed: Number(((i % 2 === 0 ? 1 : -1) * (2.4 + (i % 7) * 0.55)).toFixed(2)),
      tiltAngle: Number(((i * 0.65) % (Math.PI * 2)).toFixed(2)),
      tiltSpeed: Number((3.2 + (i % 5) * 0.75).toFixed(2)),
      gravity: 340 + (i % 5) * 28,
      drag: 0.986,
      opacity: 1,
      burstWave,
    });
  }

  return particles;
}

/**
 * Pure physics stepper for the Victory Modal confetti explosion particles.
 * Applies velocity, aerodynamic drag, gravity, lateral flutter sway, 3D tilt, and floor fade-out.
 */
export function stepVictoryConfettiParticles(
  particles: ReadonlyArray<VictoryConfettiParticle>,
  dtSeconds: number,
  viewportWidth: number = 1280,
  viewportHeight: number = 800
): VictoryConfettiParticle[] {
  const clampedDt = Math.max(0.001, Math.min(0.05, dtSeconds));
  const dragFactor = Math.pow(0.985, clampedDt * 60);
  const next: VictoryConfettiParticle[] = [];

  for (const p of particles) {
    const nextTilt = p.tiltAngle + p.tiltSpeed * clampedDt;
    const flutterSway = Math.sin(nextTilt) * 24 * clampedDt;
    const vx = p.vx * dragFactor;
    const vy = p.vy * dragFactor + p.gravity * clampedDt;
    const x = p.x + vx * clampedDt + flutterSway;
    const y = p.y + vy * clampedDt;
    const rotation = p.rotation + p.rotationSpeed * clampedDt;

    // Fade out gently as confetti nears the bottom of the viewport
    const fadeStartY = viewportHeight * 0.78;
    const fadeZone = Math.max(80, viewportHeight * 0.28);
    let opacity = p.opacity;
    if (y > fadeStartY) {
      opacity = Math.max(0, p.opacity - clampedDt * 0.85 - (y - fadeStartY) / (fadeZone * 18));
    }

    if (
      opacity > 0.02 &&
      y < viewportHeight + 60 &&
      x > -120 &&
      x < viewportWidth + 120
    ) {
      next.push({
        ...p,
        x,
        y,
        vx,
        vy,
        rotation,
        tiltAngle: nextTilt,
        opacity,
      });
    }
  }

  return next;
}
