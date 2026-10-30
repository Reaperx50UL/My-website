export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export type PlayerType = 'human' | 'ai' | 'remote';

export type GameMode = 'local' | 'ai' | 'friends' | 'matchmaking';

export type ShellState = 'title' | 'playing' | 'paused' | 'gameover';

export type BoardTheme =
  | 'cosmic_galaxy'
  | 'royal_classic'
  | 'elemental_realms'
  | 'neon_tech'
  | 'nature_forest'
  | 'minimal_3d'
  | 'royal_slate'
  | 'classic_parchment'
  | 'midnight_emerald';

export type TokenStyle =
  | 'cosmic_pawn'
  | 'royal_spires'
  | 'elemental_totem'
  | 'cyber_beacon'
  | 'woodland_acorn'
  | 'minimal_pawn';

export interface BoardThemeOption {
  id:
    | 'cosmic_galaxy'
    | 'royal_classic'
    | 'elemental_realms'
    | 'neon_tech'
    | 'nature_forest'
    | 'minimal_3d';
  indexNumber: number;
  label: string;
  subtitle: string;
  tokenStyle: TokenStyle;
  tokenStyleLabel: string;
  boardBg: string;
  boardBorder: string;
  trackCellBg: string;
  trackCellStroke: string;
  yardInnerBg: string;
  centerStroke: string;
  starColor: string;
  accentColor: string;
}

export type TurnPhase =
  | 'WAITING_FOR_ROLL'
  | 'ROLLING'
  | 'SELECTING_TOKEN'
  | 'ANIMATING_MOVE'
  | 'TURN_TRANSITION'
  | 'GAME_OVER';

export interface Token {
  id: string; // e.g., 'red-0', 'red-1', 'red-2', 'red-3'
  color: PlayerColor;
  index: number; // 0..3
  /**
   * -1 = in starting yard
   * 0..50 = on shared 52-cell perimeter track (relative to player's start square)
   * 51..55 = on player's colored 5-cell home column
   * 56 = reached central finishing triangle (home)
   */
  steps: number;
}

export interface PlayerConfig {
  color: PlayerColor;
  name: string;
  avatar: string;
  type: PlayerType;
  aiDifficulty?: AIDifficulty;
  connected?: boolean;
  ready?: boolean;
}

export interface PlayerState extends PlayerConfig {
  tokens: Token[];
  hasFinished: boolean;
  finishRank?: number; // 1 = 1st, 2 = 2nd, etc.
  capturesMade: number;
  sixesRolled: number;
  movesCount: number;
}

export interface HouseRules {
  /** Maximum consecutive sixes allowed before turn is forfeited (e.g. 3 in standard rules, or 0 for unlimited) */
  maxConsecutiveSixes: 3 | 0;
  /** Whether capturing an opponent's token grants a bonus dice roll */
  bonusRollOnCapture: boolean;
  /** Whether rolling a token into the exact final home triangle grants a bonus dice roll */
  bonusRollOnHome: boolean;
  /** Whether the 4 star squares (8 cells ahead of each start) protect tokens from capture */
  safeStarSquares: boolean;
  /** Whether each player starts with 1 token already on their starting square for faster games */
  fastStart: boolean;
}

export interface LegalMove {
  tokenId: string;
  tokenIndex: number;
  fromSteps: number;
  toSteps: number;
  pathCoords: GridCoord[];
  capturesTokenIds: string[];
  entersHomePath: boolean;
  reachesHome: boolean;
   reachesSafeSquare: boolean;
}

export interface GridCoord {
  row: number; // 0..14
  col: number; // 0..14
}

export interface GameEventLog {
  id: string;
  timestamp: number;
  playerColor: PlayerColor;
  playerName: string;
  type: 'roll' | 'move' | 'capture' | 'home' | 'forfeit_sixes' | 'skip' | 'win';
  message: string;
}

export interface GameState {
  id: string;
  mode: GameMode;
  roomCode?: string;
  players: PlayerState[];
  activePlayerIndex: number;
  turnPhase: TurnPhase;
  diceValue: number | null;
  consecutiveSixes: number;
  legalMoves: LegalMove[];
  selectedTokenId: string | null;
  lastMove: {
    tokenId: string;
    fromSteps: number;
    toSteps: number;
    capturedIds: string[];
  } | null;
  rules: HouseRules;
  rankings: PlayerColor[];
  winner: PlayerColor | null;
  turnNumber: number;
  startedAt: number;
  eventLog: GameEventLog[];
}

export type AvatarUnlockMetric = 'wins' | 'experiencePoints' | 'tokensCaptured' | 'streak';

export interface AvatarRequirement {
  metric: AvatarUnlockMetric;
  threshold: number;
  description: string;
}

export interface AvatarOption {
  id: string;
  label: string;
  icon: string;
  category: 'starter' | 'progression';
  unlockRequirement?: AvatarRequirement;
}

export interface UserProfile {
  nickname: string;
  avatar: string;
  experiencePoints: number;
  wins: number;
}

export type DiceStyle =
  | 'classic_ivory'
  | 'royal_gold'
  | 'obsidian_neon'
  | 'emerald_jade'
  | 'crimson_ruby'
  | 'celestial_runic';

export type DicePipShape = 'circle' | 'diamond' | 'hexagon' | 'star' | 'roman';

export type DiceTexturePattern =
  | 'ivory_grain'
  | 'brushed_bullion'
  | 'carbon_circuit'
  | 'veined_jade'
  | 'faceted_gemstone'
  | 'nebula_astrolabe';

export type DiceAnimationProfile =
  | 'tournament_tumble'
  | 'bullion_slam'
  | 'cyber_gyro'
  | 'jade_levitate'
  | 'ruby_vortex'
  | 'astral_orbit';

export type DiceModelGeometry =
  | 'chamfered_ivory'
  | 'beveled_bullion'
  | 'holo_obsidian'
  | 'carved_jade'
  | 'faceted_ruby'
  | 'astrolabe_runic';

export interface DiceRollPhysics {
  spinMultipliers: { x: number; y: number; z: number };
  liftRatio: number;
  rollScale: number;
  rollDurationMs: number;
  settleDurationMs: number;
  rollEasing: string;
  settleEasing: string;
  idleTilt: { x: number; y: number; z: number };
  hoverTilt: { x: number; y: number; z: number };
  idleAnimationClass: string;
  rollingEffectClass: string;
}

export interface DiceStyleOption {
  id: DiceStyle;
  label: string;
  subtitle: string;
  pipShape: DicePipShape;
  texturePattern: DiceTexturePattern;
  textureLabel: string;
  animationProfile: DiceAnimationProfile;
  animationLabel: string;
  modelGeometry: DiceModelGeometry;
  cornerRadiusFactor: number;
  coreGlowHex: string;
  specularSheen: string;
  rollPhysics: DiceRollPhysics;
  surfaceGradient: string;
  rolledSixGradient: string;
  borderHex: string;
  pipColor: string;
  accentPipColor: string;
  innerFrameColor: string;
  shadowStyle: string;
}

export type HapticIntensity = 'off' | 'light' | 'medium' | 'heavy';

export interface AppSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticIntensity: HapticIntensity;
  animationSpeed: 'normal' | 'fast' | 'instant';
  reducedMotion: boolean;
  boardTheme: BoardTheme;
  diceStyle: DiceStyle;
  colorBlindMode: boolean;
  showMoveHints: boolean;
}

export interface PlayerStats {
  totalGames: number;
  wins: number;
  losses: number;
  tokensCaptured: number;
  tokensHome: number;
  sixesRolled: number;
  currentWinStreak: number;
  longestWinStreak: number;
  modeCounts: Record<GameMode, number>;
  unlockedAchievements: string[];
  matchHistory: {
    id: string;
    date: number;
    mode: GameMode;
    playerCount: number;
    won: boolean;
    turns: number;
    captures: number;
  }[];
}
