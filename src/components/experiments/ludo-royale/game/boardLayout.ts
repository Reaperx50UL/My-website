import {
  COLOR_META,
  FINISH_STEP,
  HOME_PATH_START_STEP,
  MAX_TRACK_STEPS,
  START_SAFE_INDICES,
  START_TRACK_INDEX,
  STAR_SAFE_INDICES,
  TOTAL_TRACK_CELLS,
  getBoardThemeOption,
} from './constants';
import {
  BoardTheme,
  GridCoord,
  HouseRules,
  LegalMove,
  PlayerColor,
  Token,
} from './gameTypes';

/**
 * Ordered 52-cell clockwise main track coordinates on the 15x15 Ludo grid.
 * Index 0 is Red's start square at (row 6, col 1).
 * Index 13 is Green's start square at (row 1, col 8).
 * Index 26 is Yellow's start square at (row 8, col 13).
 * Index 39 is Blue's start square at (row 13, col 6).
 */
export const MAIN_TRACK_COORDS: GridCoord[] = [
  // Left arm top row (moving right): 0..4
  { row: 6, col: 1 }, // 0: Red start
  { row: 6, col: 2 }, // 1
  { row: 6, col: 3 }, // 2
  { row: 6, col: 4 }, // 3
  { row: 6, col: 5 }, // 4
  // Top arm left col (moving up): 5..10
  { row: 5, col: 6 }, // 5
  { row: 4, col: 6 }, // 6
  { row: 3, col: 6 }, // 7
  { row: 2, col: 6 }, // 8: Star safe (Red side)
  { row: 1, col: 6 }, // 9
  { row: 0, col: 6 }, // 10
  // Top edge (moving right): 11..12
  { row: 0, col: 7 }, // 11: Green home entry turn
  { row: 0, col: 8 }, // 12
  // Top arm right col (moving down): 13..17
  { row: 1, col: 8 }, // 13: Green start
  { row: 2, col: 8 }, // 14
  { row: 3, col: 8 }, // 15
  { row: 4, col: 8 }, // 16
  { row: 5, col: 8 }, // 17
  // Right arm top row (moving right): 18..23
  { row: 6, col: 9 }, // 18
  { row: 6, col: 10 }, // 19
  { row: 6, col: 11 }, // 20
  { row: 6, col: 12 }, // 21: Star safe (Green side)
  { row: 6, col: 13 }, // 22
  { row: 6, col: 14 }, // 23
  // Right edge (moving down): 24..25
  { row: 7, col: 14 }, // 24: Yellow home entry turn
  { row: 8, col: 14 }, // 25
  // Right arm bottom row (moving left): 26..30
  { row: 8, col: 13 }, // 26: Yellow start
  { row: 8, col: 12 }, // 27
  { row: 8, col: 11 }, // 28
  { row: 8, col: 10 }, // 29
  { row: 8, col: 9 }, // 30
  // Bottom arm right col (moving down): 31..36
  { row: 9, col: 8 }, // 31
  { row: 10, col: 8 }, // 32
  { row: 11, col: 8 }, // 33
  { row: 12, col: 8 }, // 34: Star safe (Yellow side)
  { row: 13, col: 8 }, // 35
  { row: 14, col: 8 }, // 36
  // Bottom edge (moving left): 37..38
  { row: 14, col: 7 }, // 37: Blue home entry turn
  { row: 14, col: 6 }, // 38
  // Bottom arm left col (moving up): 39..43
  { row: 13, col: 6 }, // 39: Blue start
  { row: 12, col: 6 }, // 40
  { row: 11, col: 6 }, // 41
  { row: 10, col: 6 }, // 42
  { row: 9, col: 6 }, // 43
  // Left arm bottom row (moving left): 44..49
  { row: 8, col: 5 }, // 44
  { row: 8, col: 4 }, // 45
  { row: 8, col: 3 }, // 46
  { row: 8, col: 2 }, // 47: Star safe (Blue side)
  { row: 8, col: 1 }, // 48
  { row: 8, col: 0 }, // 49
  // Left edge (moving up): 50..51
  { row: 7, col: 0 }, // 50: Red home entry turn
  { row: 6, col: 0 }, // 51
];

/**
 * 5-cell colored Home Path coordinates for each player (steps 51..55).
 */
export const HOME_PATH_COORDS: Record<PlayerColor, GridCoord[]> = {
  red: [
    { row: 7, col: 1 },
    { row: 7, col: 2 },
    { row: 7, col: 3 },
    { row: 7, col: 4 },
    { row: 7, col: 5 },
  ],
  green: [
    { row: 1, col: 7 },
    { row: 2, col: 7 },
    { row: 3, col: 7 },
    { row: 4, col: 7 },
    { row: 5, col: 7 },
  ],
  yellow: [
    { row: 7, col: 13 },
    { row: 7, col: 12 },
    { row: 7, col: 11 },
    { row: 7, col: 10 },
    { row: 7, col: 9 },
  ],
  blue: [
    { row: 13, col: 7 },
    { row: 12, col: 7 },
    { row: 11, col: 7 },
    { row: 10, col: 7 },
    { row: 9, col: 7 },
  ],
};

/**
 * Starting Yard slot coordinates (fractional or integer grid cells inside each 6x6 corner base).
 */
export const YARD_SLOT_COORDS: Record<PlayerColor, GridCoord[]> = {
  red: [
    { row: 1.5, col: 1.5 },
    { row: 1.5, col: 3.5 },
    { row: 3.5, col: 1.5 },
    { row: 3.5, col: 3.5 },
  ],
  green: [
    { row: 1.5, col: 10.5 },
    { row: 1.5, col: 12.5 },
    { row: 3.5, col: 10.5 },
    { row: 3.5, col: 12.5 },
  ],
  yellow: [
    { row: 10.5, col: 10.5 },
    { row: 10.5, col: 12.5 },
    { row: 12.5, col: 10.5 },
    { row: 12.5, col: 12.5 },
  ],
  blue: [
    { row: 10.5, col: 1.5 },
    { row: 10.5, col: 3.5 },
    { row: 12.5, col: 1.5 },
    { row: 12.5, col: 3.5 },
  ],
};

/**
 * Central Finish Triangle coordinates for each color and token index (0..3).
 */
export const FINISH_SLOT_COORDS: Record<PlayerColor, GridCoord[]> = {
  red: [
    { row: 6.7, col: 6.15 },
    { row: 7.3, col: 6.15 },
    { row: 6.85, col: 6.5 },
    { row: 7.15, col: 6.5 },
  ],
  green: [
    { row: 6.15, col: 6.7 },
    { row: 6.15, col: 7.3 },
    { row: 6.5, col: 6.85 },
    { row: 6.5, col: 7.15 },
  ],
  yellow: [
    { row: 6.7, col: 7.85 },
    { row: 7.3, col: 7.85 },
    { row: 6.85, col: 7.5 },
    { row: 7.15, col: 7.5 },
  ],
  blue: [
    { row: 7.85, col: 6.7 },
    { row: 7.85, col: 7.3 },
    { row: 7.5, col: 6.85 },
    { row: 7.5, col: 7.15 },
  ],
};

/**
 * Converts a player's color and relative step count (0..50) into the global 0..51 track index.
 * Returns null if the token is in the yard (-1), on the home path (51..55), or finished (56).
 */
export function getGlobalTrackIndex(color: PlayerColor, steps: number): number | null {
  if (steps < 0 || steps > MAX_TRACK_STEPS) {
    return null;
  }
  return (START_TRACK_INDEX[color] + steps) % TOTAL_TRACK_CELLS;
}

/**
 * Determines if a global track index (0..51) is a protected safe square under current rules.
 */
export function isSafeTrackIndex(trackIndex: number, rules: HouseRules): boolean {
  if (START_SAFE_INDICES.includes(trackIndex)) {
    return true;
  }
  if (rules.safeStarSquares && STAR_SAFE_INDICES.includes(trackIndex)) {
    return true;
  }
  return false;
}

/**
 * Returns the exact 15x15 GridCoord for any token state (yard, track, home path, or finish).
 */
export function getTokenGridCoord(
  color: PlayerColor,
  steps: number,
  tokenIndex: number = 0
): GridCoord {
  if (steps < 0) {
    return YARD_SLOT_COORDS[color][tokenIndex] ?? YARD_SLOT_COORDS[color][0];
  }
  if (steps <= MAX_TRACK_STEPS) {
    const globalIdx = getGlobalTrackIndex(color, steps)!;
    return MAIN_TRACK_COORDS[globalIdx];
  }
  if (steps >= HOME_PATH_START_STEP && steps < FINISH_STEP) {
    const homeIdx = steps - HOME_PATH_START_STEP;
    return HOME_PATH_COORDS[color][homeIdx];
  }
  return FINISH_SLOT_COORDS[color][tokenIndex] ?? FINISH_SLOT_COORDS[color][0];
}

/**
 * Computes step-by-step grid coordinates for animating a token from `fromSteps` to `toSteps`.
 */
export function getStepPathCoords(
  color: PlayerColor,
  fromSteps: number,
  toSteps: number,
  tokenIndex: number
): GridCoord[] {
  if (fromSteps < 0 && toSteps === 0) {
    return [getTokenGridCoord(color, 0, tokenIndex)];
  }
  const coords: GridCoord[] = [];
  for (let s = fromSteps + 1; s <= toSteps; s++) {
    coords.push(getTokenGridCoord(color, s, tokenIndex));
  }
  return coords;
}

/**
 * Computes visual sub-cell offset (in grid cell units) when multiple tokens share the exact same square.
 */
export function getStackOffset(
  stackIndex: number,
  stackSize: number
): { dx: number; dy: number; scale: number } {
  if (stackSize <= 1) {
    return { dx: 0, dy: 0, scale: 1 };
  }
  if (stackSize === 2) {
    const offsets = [
      { dx: -0.18, dy: -0.12 },
      { dx: 0.18, dy: 0.12 },
    ];
    return { ...offsets[stackIndex % 2], scale: 0.82 };
  }
  if (stackSize === 3) {
    const offsets = [
      { dx: 0, dy: -0.2 },
      { dx: -0.2, dy: 0.16 },
      { dx: 0.2, dy: 0.16 },
    ];
    return { ...offsets[stackIndex % 3], scale: 0.76 };
  }
  // 4 or more tokens sharing a cell
  const angle = (stackIndex / stackSize) * Math.PI * 2 - Math.PI / 4;
  const radius = 0.22;
  return {
    dx: Math.cos(angle) * radius,
    dy: Math.sin(angle) * radius,
    scale: 0.72,
  };
}

/**
 * Groups all active tokens on the board by their logical cell key so multiple tokens on the same square
 * can be rendered with distinct radial offsets and badges.
 */
export function groupTokensByCell(tokens: Token[]): Map<string, Token[]> {
  const map = new Map<string, Token[]>();
  for (const token of tokens) {
    let key: string;
    if (token.steps < 0) {
      key = `yard-${token.color}-${token.index}`;
    } else if (token.steps >= FINISH_STEP) {
      key = `finish-${token.color}-${token.index}`;
    } else if (token.steps >= HOME_PATH_START_STEP) {
      key = `home-${token.color}-${token.steps}`;
    } else {
      const globalIdx = getGlobalTrackIndex(token.color, token.steps);
      key = `track-${globalIdx}`;
    }
    const existing = map.get(key) || [];
    existing.push(token);
    map.set(key, existing);
  }
  return map;
}

export interface TurnLightingConfig {
  color: PlayerColor;
  primaryHex: string;
  lightHex: string;
  glowHex: string;
  quadrantPercent: { x: number; y: number };
  svgCenter: { cx: number; cy: number };
  beamAngleDeg: number;
}

const QUADRANT_LIGHT_POSITIONS: Record<
  PlayerColor,
  {
    quadrantPercent: { x: number; y: number };
    svgCenter: { cx: number; cy: number };
    beamAngleDeg: number;
  }
> = {
  red: {
    quadrantPercent: { x: 20, y: 20 },
    svgCenter: { cx: 300, cy: 300 },
    beamAngleDeg: 315,
  },
  green: {
    quadrantPercent: { x: 80, y: 20 },
    svgCenter: { cx: 1200, cy: 300 },
    beamAngleDeg: 45,
  },
  yellow: {
    quadrantPercent: { x: 80, y: 80 },
    svgCenter: { cx: 1200, cy: 1200 },
    beamAngleDeg: 135,
  },
  blue: {
    quadrantPercent: { x: 20, y: 80 },
    svgCenter: { cx: 300, cy: 1200 },
    beamAngleDeg: 225,
  },
};

/**
 * Returns the spatial coordinates, beam angle, and color tokens for the CSS/SVG board turn-lighting effect.
 */
export function getTurnLightingConfig(activeColor: PlayerColor): TurnLightingConfig {
  const meta = COLOR_META[activeColor] || COLOR_META.red;
  const pos = QUADRANT_LIGHT_POSITIONS[activeColor] || QUADRANT_LIGHT_POSITIONS.red;
  return {
    color: activeColor,
    primaryHex: meta.primaryHex,
    lightHex: meta.lightHex,
    glowHex: meta.glowHex,
    quadrantPercent: pos.quadrantPercent,
    svgCenter: pos.svgCenter,
    beamAngleDeg: pos.beamAngleDeg,
  };
}

export interface ThemeTileSpec {
  themeId:
    | 'cosmic_galaxy'
    | 'royal_classic'
    | 'elemental_realms'
    | 'neon_tech'
    | 'nature_forest'
    | 'minimal_3d';
  tileGeometry:
    | 'faceted_crystal'
    | 'gilded_marble'
    | 'chiseled_runestone'
    | 'cyber_octagon'
    | 'carved_timber'
    | 'studio_pillow';
  surfacePattern:
    | 'nebula_starlight'
    | 'marble_veins'
    | 'elemental_fissures'
    | 'circuit_grid'
    | 'wood_grain_moss'
    | 'matte_ceramic';
  safeSquareEmblem:
    | 'orbital_star'
    | 'tudor_rosette'
    | 'elemental_compass'
    | 'cyber_hex_shield'
    | 'woodland_wreath'
    | 'minimal_diamond';
  homeLaneMotif:
    | 'astral_conduit'
    | 'royal_star_brocade'
    | 'elemental_sigil'
    | 'neon_chevron_cell'
    | 'botanical_stepping_stone'
    | 'minimal_chevron_pill';
  spawnRoomArchitecture:
    | 'orbital_reactor'
    | 'imperial_citadel'
    | 'elemental_sanctuary'
    | 'cyber_hex_bay'
    | 'woodland_glade'
    | 'studio_podium';
  socketStyle:
    | 'gravity_well'
    | 'gilded_octagon'
    | 'runic_crater'
    | 'neon_holo_pad'
    | 'mossy_timber_stump'
    | 'matte_studio_dimple';
  territoryTitles: Record<PlayerColor, string>;
}

const THEME_TILE_SPECS: Record<ThemeTileSpec['themeId'], ThemeTileSpec> = {
  cosmic_galaxy: {
    themeId: 'cosmic_galaxy',
    tileGeometry: 'faceted_crystal',
    surfacePattern: 'nebula_starlight',
    safeSquareEmblem: 'orbital_star',
    homeLaneMotif: 'astral_conduit',
    spawnRoomArchitecture: 'orbital_reactor',
    socketStyle: 'gravity_well',
    territoryTitles: {
      red: 'RUBY REACTOR',
      green: 'EMERALD SANCTUARY',
      yellow: 'SOLAR FORGE',
      blue: 'SAPPHIRE CORE',
    },
  },
  royal_classic: {
    themeId: 'royal_classic',
    tileGeometry: 'gilded_marble',
    surfacePattern: 'marble_veins',
    safeSquareEmblem: 'tudor_rosette',
    homeLaneMotif: 'royal_star_brocade',
    spawnRoomArchitecture: 'imperial_citadel',
    socketStyle: 'gilded_octagon',
    territoryTitles: {
      red: 'CRIMSON KEEP',
      green: 'EMERALD CITADEL',
      yellow: 'SOVEREIGN PALACE',
      blue: 'SAPPHIRE BASTION',
    },
  },
  elemental_realms: {
    themeId: 'elemental_realms',
    tileGeometry: 'chiseled_runestone',
    surfacePattern: 'elemental_fissures',
    safeSquareEmblem: 'elemental_compass',
    homeLaneMotif: 'elemental_sigil',
    spawnRoomArchitecture: 'elemental_sanctuary',
    socketStyle: 'runic_crater',
    territoryTitles: {
      red: 'VOLCANIC CALDERA',
      green: 'VERDANT GROVE',
      yellow: 'SOLAR TEMPLE',
      blue: 'GLACIAL SANCTUM',
    },
  },
  neon_tech: {
    themeId: 'neon_tech',
    tileGeometry: 'cyber_octagon',
    surfacePattern: 'circuit_grid',
    safeSquareEmblem: 'cyber_hex_shield',
    homeLaneMotif: 'neon_chevron_cell',
    spawnRoomArchitecture: 'cyber_hex_bay',
    socketStyle: 'neon_holo_pad',
    territoryTitles: {
      red: 'CRIMSON CYBER BAY',
      green: 'EMERALD MATRIX BAY',
      yellow: 'SOLAR CIRCUIT BAY',
      blue: 'COBALT NEXUS BAY',
    },
  },
  nature_forest: {
    themeId: 'nature_forest',
    tileGeometry: 'carved_timber',
    surfacePattern: 'wood_grain_moss',
    safeSquareEmblem: 'woodland_wreath',
    homeLaneMotif: 'botanical_stepping_stone',
    spawnRoomArchitecture: 'woodland_glade',
    socketStyle: 'mossy_timber_stump',
    territoryTitles: {
      red: 'AUTUMN GROVE',
      green: 'CANOPY GLADE',
      yellow: 'SUNLIT MEADOW',
      blue: 'RIVERBEND HOLLOW',
    },
  },
  minimal_3d: {
    themeId: 'minimal_3d',
    tileGeometry: 'studio_pillow',
    surfacePattern: 'matte_ceramic',
    safeSquareEmblem: 'minimal_diamond',
    homeLaneMotif: 'minimal_chevron_pill',
    spawnRoomArchitecture: 'studio_podium',
    socketStyle: 'matte_studio_dimple',
    territoryTitles: {
      red: 'RED',
      green: 'GREEN',
      yellow: 'YELLOW',
      blue: 'BLUE',
    },
  },
};

/**
 * Returns the unique tile geometry, surface texture, safe-square emblem, home-lane motif, and spawn room architecture for a board theme.
 */
export function getThemeTileSpec(theme?: BoardTheme | string): ThemeTileSpec {
  const opt = getBoardThemeOption(theme as BoardTheme);
  return THEME_TILE_SPECS[opt.id] || THEME_TILE_SPECS.cosmic_galaxy;
}

export interface TokenMoveIndicator {
  tokenId: string;
  tokenIndex: number;
  tokenNumber: number; // 1..4
  color: PlayerColor;
  fromSteps: number;
  toSteps: number;
  fromCoord: GridCoord;
  toCoord: GridCoord;
  pathCoords: GridCoord[];
  capturesOpponent: boolean;
  reachesHome: boolean;
  reachesSafeSquare: boolean;
  sharedTargetIndex: number;
  sharedTargetCount: number;
}

/**
 * Builds visual move destination & trajectory indicators for each currently playable token.
 */
export function buildMoveIndicators(
  legalMoves: LegalMove[],
  activeColor: PlayerColor
): TokenMoveIndicator[] {
  const targetGroups = new Map<string, LegalMove[]>();
  for (const move of legalMoves) {
    const toCoord = getTokenGridCoord(activeColor, move.toSteps, move.tokenIndex);
    // Group by target cell (note: yard->start moves all land on step 0, which is a single track square)
    const key =
      move.toSteps === FINISH_STEP
        ? `finish-${activeColor}`
        : `${toCoord.row},${toCoord.col}`;
    const list = targetGroups.get(key) || [];
    list.push(move);
    targetGroups.set(key, list);
  }

  return legalMoves.map((move) => {
    const fromCoord = getTokenGridCoord(
      activeColor,
      move.fromSteps,
      move.tokenIndex
    );
    const toCoord = getTokenGridCoord(
      activeColor,
      move.toSteps,
      move.tokenIndex
    );
    const key =
      move.toSteps === FINISH_STEP
        ? `finish-${activeColor}`
        : `${toCoord.row},${toCoord.col}`;
    const group = targetGroups.get(key) || [move];
    const sharedTargetIndex = group.findIndex((m) => m.tokenId === move.tokenId);

    return {
      tokenId: move.tokenId,
      tokenIndex: move.tokenIndex,
      tokenNumber: move.tokenIndex + 1,
      color: activeColor,
      fromSteps: move.fromSteps,
      toSteps: move.toSteps,
      fromCoord,
      toCoord,
      pathCoords: move.pathCoords,
      capturesOpponent: move.capturesTokenIds.length > 0,
      reachesHome: move.reachesHome,
      reachesSafeSquare: move.reachesSafeSquare,
      sharedTargetIndex: sharedTargetIndex >= 0 ? sharedTargetIndex : 0,
      sharedTargetCount: group.length,
    };
  });
}


