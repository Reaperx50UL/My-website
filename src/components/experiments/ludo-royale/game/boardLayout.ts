import {
  ALL_PLAYER_COLORS,
  COLOR_META,
  START_SAFE_INDICES,
  START_SAFE_INDICES_5P,
  START_SAFE_INDICES_6P,
  START_TRACK_INDEX,
  START_TRACK_INDEX_5P,
  START_TRACK_INDEX_6P,
  STAR_SAFE_INDICES,
  STAR_SAFE_INDICES_5P,
  STAR_SAFE_INDICES_6P,
  TOTAL_TRACK_CELLS,
  TOTAL_TRACK_CELLS_5P,
  TOTAL_TRACK_CELLS_6P,
  getBoardThemeOption,
  getFinishStep,
  getHomePathStartStep,
  getMaxTrackSteps,
} from './constants';
import type {
  BoardTheme,
  GridCoord,
  HouseRules,
  LegalMove,
  PlayerColor,
  Token,
} from './gameTypes';

/**
 * Ordered 52-cell clockwise main track coordinates on the 15x15 Ludo grid (4-Player Cross Board).
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
 * 5-cell colored Home Path coordinates for each player on the 4-Player Cross Board (steps 51..55).
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
  purple: [
    { row: 7, col: 1 },
    { row: 7, col: 2 },
    { row: 7, col: 3 },
    { row: 7, col: 4 },
    { row: 7, col: 5 },
  ],
  orange: [
    { row: 1, col: 7 },
    { row: 2, col: 7 },
    { row: 3, col: 7 },
    { row: 4, col: 7 },
    { row: 5, col: 7 },
  ],
};

/**
 * Starting Yard slot coordinates on the 4-Player Cross Board.
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
  purple: [
    { row: 1.5, col: 1.5 },
    { row: 1.5, col: 3.5 },
    { row: 3.5, col: 1.5 },
    { row: 3.5, col: 3.5 },
  ],
  orange: [
    { row: 1.5, col: 10.5 },
    { row: 1.5, col: 12.5 },
    { row: 3.5, col: 10.5 },
    { row: 3.5, col: 12.5 },
  ],
};

/**
 * Central Finish Triangle coordinates on the 4-Player Cross Board.
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
  purple: [
    { row: 6.7, col: 6.15 },
    { row: 7.3, col: 6.15 },
    { row: 6.85, col: 6.5 },
    { row: 7.15, col: 6.5 },
  ],
  orange: [
    { row: 6.15, col: 6.7 },
    { row: 6.15, col: 7.3 },
    { row: 6.5, col: 6.85 },
    { row: 6.5, col: 7.15 },
  ],
};

// ============================================================================
// CUSTOM RADIAL BOARD GEOMETRY FOR 5-PLAYER (PENTAGON) & 6-PLAYER (HEXAGON)
// ============================================================================

export interface RadialTrackTileMeta {
  globalTrackIndex: number;
  armIndex: number;
  armColor: PlayerColor;
  localIndex: number;
  coord: GridCoord;
  angleDeg: number;
  tileWidth: number;
  tileHeight: number;
  isStartSquare: boolean;
  startColor: PlayerColor | null;
  isStarSafe: boolean;
  isTipTurn: boolean;
}

export interface RadialHomeTileMeta {
  armIndex: number;
  color: PlayerColor;
  stepIndex: number; // 0..4 (for steps 51..55)
  stepNumber: number; // 51..55
  coord: GridCoord;
  angleDeg: number;
  tileWidth: number;
  tileHeight: number;
}

export interface VisualArmCellMeta {
  armIndex: number;
  armColor: PlayerColor;
  row: number; // 0..5 from inner base to outer edge
  col: -1 | 0 | 1; // -1 = left, 0 = center home stretch, +1 = right
  coord: GridCoord;
  angleDeg: number;
  cellW: number;
  cellH: number;
  isColoredHomeStretch: boolean;
  homeStepIndex: number | null; // 0..4 for steps 51..55
  isColoredStartSquare: boolean; // row === 4 && col === 1
  isStarSafe: boolean; // row === 3 && col === -1
  isCenterArrowTip: boolean; // row === 5 && col === 0
  isRightCornerArrow: boolean; // row === 5 && col === 1
}

export interface RadialFinishTrapezoidMeta {
  armIndex: number;
  color: PlayerColor;
  angleDeg: number;
  points: [GridCoord, GridCoord, GridCoord, GridCoord]; // [V_{k-1}, V_k, U_k, U_{k-1}]
  centerCoord: GridCoord;
}

export interface RadialYardMeta {
  armIndex: number;
  playerNumber: number; // 1..5 or 1..6
  color: PlayerColor;
  centerCoord: GridCoord;
  angleDeg: number;
  radiusGrid: number;
  slots: GridCoord[];
  outerTriangle: [GridCoord, GridCoord, GridCoord]; // [V_k, A_k, B_k]
  innerTriangle: [GridCoord, GridCoord, GridCoord]; // [v_k, a_k, b_k]
  nameplateCenter: GridCoord;
  nameplateAngleDeg: number;
  nameplateWidthGrid: number;
  nameplateHeightGrid: number;
}

export interface RadialBoardGeometry {
  playerCount: 5 | 6;
  colors: PlayerColor[];
  armAnglesDeg: number[];
  cellW: number;
  cellH: number;
  armInnerRadiusGrid: number;
  armOuterRadiusGrid: number;
  visualArmCells: VisualArmCellMeta[];
  trackCoords: GridCoord[];
  trackTiles: RadialTrackTileMeta[];
  homePathCoords: Record<PlayerColor, GridCoord[]>;
  homeTiles: RadialHomeTileMeta[];
  yardSlotCoords: Record<PlayerColor, GridCoord[]>;
  yards: RadialYardMeta[];
  finishSlotCoords: Record<PlayerColor, GridCoord[]>;
  finishTrapezoids: RadialFinishTrapezoidMeta[];
  innerCoreVertices: GridCoord[];
  outerWheelVertices: GridCoord[];
  centerPolygonRadiusGrid: number;
}

function polarOffset(
  centerRow: number,
  centerCol: number,
  angleDeg: number,
  radialDist: number,
  lateralDist: number
): GridCoord {
  const rad = (angleDeg * Math.PI) / 180;
  // Unit radial vector u = (cos, sin) in (col, row)
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);
  // Unit clockwise perpendicular vector p = (-sin, cos) in (col, row)
  const px = -Math.sin(rad);
  const py = Math.cos(rad);

  const col = Number(
    (centerCol + radialDist * ux + lateralDist * px).toFixed(4)
  );
  const row = Number(
    (centerRow + radialDist * uy + lateralDist * py).toFixed(4)
  );
  return { row, col };
}

function barycentricGridCoord(
  p1: GridCoord,
  p2: GridCoord,
  p3: GridCoord,
  w1: number,
  w2: number,
  w3: number
): GridCoord {
  return {
    row: Number((p1.row * w1 + p2.row * w2 + p3.row * w3).toFixed(4)),
    col: Number((p1.col * w1 + p2.col * w2 + p3.col * w3).toFixed(4)),
  };
}

/**
 * Builds the exact flush Polygonal Wheel board geometry for 5-Player (Decagonal 10-sided wheel)
 * and 6-Player (Dodecagonal 12-sided wheel) Ludo boards:
 * - N flush 3x6 rectangular track arms meeting edge-to-edge at inner vertices V_k
 * - N flush triangular wedge Home Yards (V_k, A_k, B_k) with inset triangle (v_k, a_k, b_k),
 *   4 circular token sockets, and an extruded outer Player Nameplate Tab
 * - N colored Finish Trapezoids surrounding the central N-gon core with a centered die emblem
 */
function createFlushPolygonalWheelGeometry(
  playerCount: 5 | 6
): RadialBoardGeometry {
  const colors: PlayerColor[] =
    playerCount === 5
      ? ['red', 'green', 'yellow', 'blue', 'purple']
      : ALL_PLAYER_COLORS;

  // Exact arm angles matching the reference 5P and 6P screenshots:
  // - 5P: Top arm at -90°, Bottom horizontal Home Yard (Player 1) at +90°
  // - 6P: Top arm at -90°, Bottom arm at +90°, Left/Right vertical Home Yards at 180° and 0°
  const armAnglesDeg =
    playerCount === 5
      ? [54, 126, -162, -90, -18]
      : [30, 90, 150, -150, -90, -30];

  const centerRow = 7.0;
  const centerCol = 7.0;
  const cellW = playerCount === 5 ? 0.8 : 0.72;
  const cellH = playerCount === 5 ? 0.78 : 0.74;
  const halfArmW = 1.5 * cellW;
  const armLength = 6 * cellH;

  const halfSliceRad = Math.PI / playerCount;
  const armInnerR = halfArmW / Math.tan(halfSliceRad);
  const armOuterR = armInnerR + armLength;
  const vertexR = halfArmW / Math.sin(halfSliceRad);
  const coreR = vertexR * 0.52;

  const visualArmCells: VisualArmCellMeta[] = [];
  const trackCoords: GridCoord[] = [];
  const trackTiles: RadialTrackTileMeta[] = [];
  const homePathCoords = { ...HOME_PATH_COORDS };
  const homeTiles: RadialHomeTileMeta[] = [];
  const yardSlotCoords = { ...YARD_SLOT_COORDS };
  const yards: RadialYardMeta[] = [];
  const finishSlotCoords = { ...FINISH_SLOT_COORDS };
  const finishTrapezoids: RadialFinishTrapezoidMeta[] = [];
  const innerCoreVertices: GridCoord[] = [];
  const outerWheelVertices: GridCoord[] = [];

  const cellsPerArm = 13;
  const homePathStartStep = getHomePathStartStep(playerCount);

  colors.forEach((color, armIdx) => {
    const angleDeg = armAnglesDeg[armIdx];
    const nextAngleDeg = armAnglesDeg[(armIdx + 1) % playerCount];
    const wedgeAngleDeg = angleDeg + 180 / playerCount;
    const prevWedgeAngleDeg = angleDeg - 180 / playerCount;

    // 1. Build all 18 (3 columns x 6 rows) flush visual cells for Arm `armIdx`
    for (let row = 0; row < 6; row++) {
      const cellRadial = armInnerR + (row + 0.5) * cellH;
      for (const col of [-1, 0, 1] as const) {
        const cellLateral = col * cellW;
        const coord = polarOffset(
          centerRow,
          centerCol,
          angleDeg,
          cellRadial,
          cellLateral
        );
        const isColoredHomeStretch = col === 0 && row <= 4;
        const homeStepIndex = isColoredHomeStretch ? 4 - row : null;
        const isColoredStartSquare = col === 1 && row === 4;
        const isStarSafe = col === -1 && row === 3;
        const isCenterArrowTip = col === 0 && row === 5;
        const isRightCornerArrow = col === 1 && row === 5;

        visualArmCells.push({
          armIndex: armIdx,
          armColor: color,
          row,
          col,
          coord,
          angleDeg,
          cellW,
          cellH,
          isColoredHomeStretch,
          homeStepIndex,
          isColoredStartSquare,
          isStarSafe,
          isCenterArrowTip,
          isRightCornerArrow,
        });
      }
    }

    // 2. Map all 13 physical perimeter track cells (local = 0..12) on Arm `armIdx` to exact integer cell centers:
    // - local 0..5: Left column going outward (col = -1, row = 0, 1, 2, 3 [Star], 4, 5)
    // - local 6: Center outer cell (col = 0, row = 5 [Home Stretch Entry Arrow Tip])
    // - local 7..12: Right column going inward (col = +1, row = 5, 4 [Colored Start Square], 3, 2, 1, 0)
    for (let local = 0; local < cellsPerArm; local++) {
      let targetCol: -1 | 0 | 1 = -1;
      let targetRow = 0;

      if (local <= 5) {
        targetCol = -1;
        targetRow = local;
      } else if (local === 6) {
        targetCol = 0;
        targetRow = 5;
      } else {
        targetCol = 1;
        targetRow = 12 - local;
      }

      const coord = polarOffset(
        centerRow,
        centerCol,
        angleDeg,
        armInnerR + (targetRow + 0.5) * cellH,
        targetCol * cellW
      );
      const globalTrackIndex = armIdx * cellsPerArm + local;
      const isStartSquare = local === 8;
      const isStarSafe = local === 3;
      const isTipTurn = local === 6;

      trackCoords.push(coord);
      trackTiles.push({
        globalTrackIndex,
        armIndex: armIdx,
        armColor: color,
        localIndex: local,
        coord,
        angleDeg,
        tileWidth: cellW,
        tileHeight: cellH,
        isStartSquare,
        startColor: isStartSquare ? color : null,
        isStarSafe,
        isTipTurn,
      });
    }

    // 3. 5 Colored Home Stretch cells moving inward along center column (col = 0, row = 4, 3, 2, 1, 0)
    const colorHomeCoords: GridCoord[] = [];
    for (let stepIdx = 0; stepIdx < 5; stepIdx++) {
      const row = 4 - stepIdx; // 4, 3, 2, 1, 0
      const coord = polarOffset(
        centerRow,
        centerCol,
        angleDeg,
        armInnerR + (row + 0.5) * cellH,
        0
      );
      colorHomeCoords.push(coord);
      homeTiles.push({
        armIndex: armIdx,
        color,
        stepIndex: stepIdx,
        stepNumber: homePathStartStep + stepIdx,
        coord,
        angleDeg,
        tileWidth: cellW,
        tileHeight: cellH,
      });
    }
    homePathCoords[color] = colorHomeCoords;

    // 4. Flush Triangular Wedge Home Yard (V_curr, A_curr, B_curr) between Arm `armIdx` and Arm `armIdx + 1`
    const V_prev = polarOffset(
      centerRow,
      centerCol,
      prevWedgeAngleDeg,
      vertexR,
      0
    );
    const V_curr = polarOffset(centerRow, centerCol, wedgeAngleDeg, vertexR, 0);
    const U_prev = polarOffset(
      centerRow,
      centerCol,
      prevWedgeAngleDeg,
      coreR,
      0
    );
    const U_curr = polarOffset(centerRow, centerCol, wedgeAngleDeg, coreR, 0);

    const B_armLeft = polarOffset(
      centerRow,
      centerCol,
      angleDeg,
      armOuterR,
      -halfArmW
    );
    const A_curr = polarOffset(
      centerRow,
      centerCol,
      angleDeg,
      armOuterR,
      +halfArmW
    );
    const B_curr = polarOffset(
      centerRow,
      centerCol,
      nextAngleDeg,
      armOuterR,
      -halfArmW
    );

    outerWheelVertices.push(B_armLeft, A_curr);
    innerCoreVertices.push(U_curr);

    const wedgeOuterBaseR = vertexR + armLength * Math.cos(halfSliceRad);
    const wedgeOuterHalfW = armLength * Math.sin(halfSliceRad);
    const insetD = playerCount === 5 ? 0.42 : 0.38;
    const inApexR = vertexR + insetD / Math.sin(halfSliceRad);
    const inBaseR = wedgeOuterBaseR - insetD;
    const inBaseHalfW = (inBaseR - inApexR) * Math.tan(halfSliceRad);

    const v_in = polarOffset(centerRow, centerCol, wedgeAngleDeg, inApexR, 0);
    const a_in = polarOffset(
      centerRow,
      centerCol,
      wedgeAngleDeg,
      inBaseR,
      -inBaseHalfW
    );
    const b_in = polarOffset(
      centerRow,
      centerCol,
      wedgeAngleDeg,
      inBaseR,
      +inBaseHalfW
    );

    // 4 Circular Colored Token Sockets inside (v_in, a_in, b_in): 1 near inner apex, 1 in center, 2 near outer corners
    const slots: GridCoord[] = [
      barycentricGridCoord(v_in, a_in, b_in, 0.62, 0.19, 0.19),
      barycentricGridCoord(v_in, a_in, b_in, 0.27, 0.365, 0.365),
      barycentricGridCoord(v_in, a_in, b_in, 0.17, 0.65, 0.18),
      barycentricGridCoord(v_in, a_in, b_in, 0.17, 0.18, 0.65),
    ];
    yardSlotCoords[color] = slots;

    const yardCenter = barycentricGridCoord(
      V_curr,
      A_curr,
      B_curr,
      0.34,
      0.33,
      0.33
    );

    const nameplateCenter = polarOffset(
      centerRow,
      centerCol,
      wedgeAngleDeg,
      wedgeOuterBaseR + 0.22,
      0
    );
    // Keep text upright and parallel to the outer triangle base edge (A_curr -> B_curr)
    const normWedge = ((wedgeAngleDeg % 360) + 360) % 360;
    const nameplateAngleDeg =
      normWedge > 180 && normWedge < 360
        ? wedgeAngleDeg + 90
        : wedgeAngleDeg - 90;

    yards.push({
      armIndex: armIdx,
      playerNumber: armIdx + 1,
      color,
      centerCoord: yardCenter,
      angleDeg: wedgeAngleDeg,
      radiusGrid: 1.25,
      slots,
      outerTriangle: [V_curr, A_curr, B_curr],
      innerTriangle: [v_in, a_in, b_in],
      nameplateCenter,
      nameplateAngleDeg,
      nameplateWidthGrid: Number((wedgeOuterHalfW * 1.48).toFixed(4)),
      nameplateHeightGrid: 0.42,
    });

    // 5. Colored Finish Trapezoid (V_prev, V_curr, U_curr, U_prev) at the inner base of Arm `armIdx`
    const trapCenterR = (armInnerR + coreR * Math.cos(halfSliceRad)) * 0.5;
    finishTrapezoids.push({
      armIndex: armIdx,
      color,
      angleDeg,
      points: [V_prev, V_curr, U_curr, U_prev],
      centerCoord: polarOffset(centerRow, centerCol, angleDeg, trapCenterR, 0),
    });

    // 4 Finish slots inside the player's Colored Finish Trapezoid
    const finishOffsets = [
      { r: trapCenterR + 0.12, l: -0.24 },
      { r: trapCenterR + 0.12, l: 0.24 },
      { r: trapCenterR - 0.12, l: -0.18 },
      { r: trapCenterR - 0.12, l: 0.18 },
    ];
    finishSlotCoords[color] = finishOffsets.map((fo) =>
      polarOffset(centerRow, centerCol, angleDeg, fo.r, fo.l)
    );
  });

  return {
    playerCount,
    colors,
    armAnglesDeg,
    cellW,
    cellH,
    armInnerRadiusGrid: armInnerR,
    armOuterRadiusGrid: armOuterR,
    visualArmCells,
    trackCoords,
    trackTiles,
    homePathCoords,
    homeTiles,
    yardSlotCoords,
    yards,
    finishSlotCoords,
    finishTrapezoids,
    innerCoreVertices,
    outerWheelVertices,
    centerPolygonRadiusGrid: vertexR,
  };
}

export const PENTAGON_BOARD_GEOMETRY: RadialBoardGeometry =
  createFlushPolygonalWheelGeometry(5);
export const HEXAGON_BOARD_GEOMETRY: RadialBoardGeometry =
  createFlushPolygonalWheelGeometry(6);

export const MAIN_TRACK_COORDS_5P: GridCoord[] =
  PENTAGON_BOARD_GEOMETRY.trackCoords;
export const MAIN_TRACK_COORDS_6P: GridCoord[] =
  HEXAGON_BOARD_GEOMETRY.trackCoords;

/**
 * Returns the total shared perimeter track cells for the active board layout (52 for <=4P, 55 for 5P, 54 for 6P).
 */
export function getTotalTrackCellsForPlayerCount(
  playerCount: number = 4
): number {
  if (playerCount === 5) return TOTAL_TRACK_CELLS_5P;
  if (playerCount === 6) return TOTAL_TRACK_CELLS_6P;
  return TOTAL_TRACK_CELLS;
}

/**
 * Converts a player's color and relative step count (0..50) into the global perimeter track index
 * for 4-player (0..51), 5-player Pentagon (0..54), or 6-player Hexagon (0..53) boards.
 * Returns null if the token is in the yard (-1), on the home path (51..55), or finished (56).
 */
export function getGlobalTrackIndex(
  color: PlayerColor,
  steps: number,
  playerCount: number = 4
): number | null {
  const maxTrackSteps = getMaxTrackSteps(playerCount);
  if (steps < 0 || steps > maxTrackSteps) {
    return null;
  }
  if (playerCount === 5) {
    return (START_TRACK_INDEX_5P[color] + steps) % TOTAL_TRACK_CELLS_5P;
  }
  if (playerCount === 6) {
    return (START_TRACK_INDEX_6P[color] + steps) % TOTAL_TRACK_CELLS_6P;
  }
  return (START_TRACK_INDEX[color] + steps) % TOTAL_TRACK_CELLS;
}

/**
 * Determines if a global track index is a protected safe square under current rules and board player count.
 */
export function isSafeTrackIndex(
  trackIndex: number,
  rules: HouseRules,
  playerCount: number = 4
): boolean {
  if (playerCount === 5) {
    if (START_SAFE_INDICES_5P.includes(trackIndex)) return true;
    if (rules.safeStarSquares && STAR_SAFE_INDICES_5P.includes(trackIndex)) {
      return true;
    }
    return false;
  }
  if (playerCount === 6) {
    if (START_SAFE_INDICES_6P.includes(trackIndex)) return true;
    if (rules.safeStarSquares && STAR_SAFE_INDICES_6P.includes(trackIndex)) {
      return true;
    }
    return false;
  }
  if (START_SAFE_INDICES.includes(trackIndex)) {
    return true;
  }
  if (rules.safeStarSquares && STAR_SAFE_INDICES.includes(trackIndex)) {
    return true;
  }
  return false;
}

/**
 * Determines whether a token position (color, steps) is on a Home Yard (-1) or a Safe Star / Start square.
 */
export function isYardOrSafeStarPosition(
  color: PlayerColor,
  steps: number,
  playerCount: number = 4
): boolean {
  if (steps < 0) {
    return true;
  }
  const trackIdx = getGlobalTrackIndex(color, steps, playerCount);
  if (trackIdx === null) return false;
  if (playerCount === 5) {
    return (
      STAR_SAFE_INDICES_5P.includes(trackIdx) ||
      START_SAFE_INDICES_5P.includes(trackIdx)
    );
  }
  if (playerCount === 6) {
    return (
      STAR_SAFE_INDICES_6P.includes(trackIdx) ||
      START_SAFE_INDICES_6P.includes(trackIdx)
    );
  }
  return (
    STAR_SAFE_INDICES.includes(trackIdx) ||
    START_SAFE_INDICES.includes(trackIdx)
  );
}

/**
 * Returns the exact 15x15 GridCoord for any token state (yard, track, home path, or finish)
 * across the 4-Player Cross Board, 5-Player Pentagon Board, and 6-Player Hexagon Board.
 */
export function getTokenGridCoord(
  color: PlayerColor,
  steps: number,
  tokenIndex: number = 0,
  yardSlot?: number,
  playerCount: number = 4
): GridCoord {
  // Support 4-argument callers that pass `playerCount` (5 or 6) in the 4th positional slot
  const resolvedPlayerCount =
    playerCount === 4 && (yardSlot === 5 || yardSlot === 6)
      ? yardSlot
      : playerCount;
  const resolvedYardSlot =
    yardSlot === 5 || yardSlot === 6 ? undefined : yardSlot;

  const geom =
    resolvedPlayerCount === 5
      ? PENTAGON_BOARD_GEOMETRY
      : resolvedPlayerCount === 6
      ? HEXAGON_BOARD_GEOMETRY
      : null;

  const maxTrackSteps = getMaxTrackSteps(resolvedPlayerCount);
  const homePathStartStep = getHomePathStartStep(resolvedPlayerCount);
  const finishStep = getFinishStep(resolvedPlayerCount);

  if (steps < 0) {
    const slot = resolvedYardSlot !== undefined ? resolvedYardSlot : tokenIndex;
    const yardMap = geom ? geom.yardSlotCoords : YARD_SLOT_COORDS;
    return yardMap[color][slot] ?? yardMap[color][0];
  }
  if (steps <= maxTrackSteps) {
    const globalIdx = getGlobalTrackIndex(color, steps, resolvedPlayerCount)!;
    const trackList = geom ? geom.trackCoords : MAIN_TRACK_COORDS;
    return trackList[globalIdx] ?? trackList[0];
  }
  if (steps >= homePathStartStep && steps < finishStep) {
    const homeIdx = steps - homePathStartStep;
    const homeMap = geom ? geom.homePathCoords : HOME_PATH_COORDS;
    return homeMap[color][homeIdx] ?? homeMap[color][0];
  }
  const finishMap = geom ? geom.finishSlotCoords : FINISH_SLOT_COORDS;
  return finishMap[color][tokenIndex] ?? finishMap[color][0];
}

/**
 * Computes step-by-step grid coordinates for animating a token from `fromSteps` to `toSteps`.
 */
export function getStepPathCoords(
  color: PlayerColor,
  fromSteps: number,
  toSteps: number,
  tokenIndex: number,
  playerCount: number = 4
): GridCoord[] {
  if (fromSteps < 0 && toSteps === 0) {
    return [getTokenGridCoord(color, 0, tokenIndex, undefined, playerCount)];
  }
  const coords: GridCoord[] = [];
  for (let s = fromSteps + 1; s <= toSteps; s++) {
    coords.push(
      getTokenGridCoord(color, s, tokenIndex, undefined, playerCount)
    );
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
export function groupTokensByCell(
  tokens: Token[],
  playerCount: number = 4
): Map<string, Token[]> {
  const finishStep = getFinishStep(playerCount);
  const homePathStartStep = getHomePathStartStep(playerCount);
  const map = new Map<string, Token[]>();
  for (const token of tokens) {
    let key: string;
    if (token.steps < 0) {
      const slot =
        token.yardSlot !== undefined
          ? token.yardSlot
          : token.pairId
          ? `pair-${token.pairId}`
          : token.index;
      key = `yard-${token.color}-${slot}`;
    } else if (token.steps >= finishStep) {
      key = `finish-${token.color}-${token.index}`;
    } else if (token.steps >= homePathStartStep) {
      key = `home-${token.color}-${token.steps}`;
    } else {
      const globalIdx = getGlobalTrackIndex(
        token.color,
        token.steps,
        playerCount
      );
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
  purple: {
    quadrantPercent: { x: 22, y: 82 },
    svgCenter: { cx: 330, cy: 1230 },
    beamAngleDeg: 210,
  },
  orange: {
    quadrantPercent: { x: 15, y: 50 },
    svgCenter: { cx: 225, cy: 750 },
    beamAngleDeg: 270,
  },
};

/**
 * Returns the spatial coordinates, beam angle, and color tokens for the CSS/SVG board turn-lighting effect.
 */
export function getTurnLightingConfig(
  activeColor: PlayerColor,
  playerCount: number = 4
): TurnLightingConfig {
  const meta = COLOR_META[activeColor] || COLOR_META.red;

  if (playerCount === 5 || playerCount === 6) {
    const geom =
      playerCount === 5 ? PENTAGON_BOARD_GEOMETRY : HEXAGON_BOARD_GEOMETRY;
    const yard = geom.yards.find((y) => y.color === activeColor);
    if (yard) {
      const cx = Math.round((yard.centerCoord.col + 0.5) * 100);
      const cy = Math.round((yard.centerCoord.row + 0.5) * 100);
      return {
        color: activeColor,
        primaryHex: meta.primaryHex,
        lightHex: meta.lightHex,
        glowHex: meta.glowHex,
        quadrantPercent: {
          x: Math.round((cx / 1500) * 100),
          y: Math.round((cy / 1500) * 100),
        },
        svgCenter: { cx, cy },
        beamAngleDeg: (yard.angleDeg + 360) % 360,
      };
    }
  }

  const pos =
    QUADRANT_LIGHT_POSITIONS[activeColor] || QUADRANT_LIGHT_POSITIONS.red;
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
      purple: 'AMETHYST NEBULA',
      orange: 'SUPERNOVA CITADEL',
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
      purple: 'IMPERIAL COURT',
      orange: 'AMBER FORTRESS',
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
      purple: 'AETHERIC RIFT',
      orange: 'MAGMA CRUCIBLE',
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
      purple: 'VIOLET SYNTH BAY',
      orange: 'PLASMA RELAY BAY',
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
      purple: 'LAVENDER THICKET',
      orange: 'MARIGOLD BRIAR',
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
      purple: 'PURPLE',
      orange: 'ORANGE',
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
  activeColor: PlayerColor,
  playerCount: number = 4
): TokenMoveIndicator[] {
  const finishStep = getFinishStep(playerCount);
  const targetGroups = new Map<string, LegalMove[]>();
  for (const move of legalMoves) {
    const toCoord = getTokenGridCoord(
      activeColor,
      move.toSteps,
      move.tokenIndex,
      undefined,
      playerCount
    );
    const key =
      move.toSteps === finishStep
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
      move.tokenIndex,
      undefined,
      playerCount
    );
    const toCoord = getTokenGridCoord(
      activeColor,
      move.toSteps,
      move.tokenIndex,
      undefined,
      playerCount
    );
    const key =
      move.toSteps === finishStep
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
