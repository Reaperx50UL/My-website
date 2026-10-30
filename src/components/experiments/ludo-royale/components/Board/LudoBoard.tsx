import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BoardTheme,
  BoardThemeOption,
  DiceStyle,
  GridCoord,
  LegalMove,
  PlayerColor,
  PlayerState,
  Token,
  TokenStyle,
} from '../../game/gameTypes';
import {
  HOME_PATH_COORDS,
  MAIN_TRACK_COORDS,
  YARD_SLOT_COORDS,
  buildMoveIndicators,
  getStackOffset,
  getThemeTileSpec,
  getTokenGridCoord,
  getTurnLightingConfig,
  groupTokensByCell,
} from '../../game/boardLayout';
import {
  COLOR_META,
  FINISH_STEP,
  PLAYER_COLORS,
  STAR_SAFE_INDICES,
  START_TRACK_INDEX,
  getBoardThemeOption,
} from '../../game/constants';

export interface LudoBoardProps {
  players: PlayerState[];
  activeColor?: PlayerColor;
  legalMoves: LegalMove[];
  selectedTokenId: string | null;
  theme: BoardTheme;
  colorBlindMode: boolean;
  reducedMotion: boolean;
  showMoveHints: boolean;
  animatingMove: {
    tokenId: string;
    coord: GridCoord;
  } | null;
  isRolling?: boolean;
  diceValue?: number | null;
  diceStyle?: DiceStyle;
  canRoll?: boolean;
  onRollDice?: () => void;
  onSelectToken: (tokenId: string) => void;
}

interface BurstEffect {
  id: string;
  x: number;
  y: number;
  color: PlayerColor;
}

const BOARD_VIEWBOX_SIZE = 1500;
const CELL_SIZE = 100;

const YARD_QUADRANTS: Record<
  PlayerColor,
  { x: number; y: number; size: number }
> = {
  red: { x: 0, y: 0, size: 600 },
  green: { x: 900, y: 0, size: 600 },
  yellow: { x: 900, y: 900, size: 600 },
  blue: { x: 0, y: 900, size: 600 },
};

const HOME_TRIANGLES: Record<PlayerColor, string> = {
  red: '600,600 750,750 600,900',
  green: '600,600 900,600 750,750',
  yellow: '900,600 900,900 750,750',
  blue: '600,900 900,900 750,750',
};

/**
 * Rich 3D metallic material specification for each player color and territory.
 */
const METALLIC_PAWN_PALETTE: Record<
  PlayerColor,
  {
    name: string;
    territoryTitle: string;
    territorySubtitle: string;
    specHighlight: string;
    lightMetal: string;
    midMetal: string;
    deepMetal: string;
    abyssMetal: string;
    rimReflect: string;
    trimLight: string;
    trimMid: string;
    trimDark: string;
    gemCore: string;
    gemGlow: string;
    arenaOuterMetal: string;
    arenaFloorDark: string;
    arenaFloorMid: string;
  }
> = {
  red: {
    name: 'Ruby',
    territoryTitle: 'RUBY REACTOR',
    territorySubtitle: 'CRIMSON CORE',
    specHighlight: '#FFE4E6',
    lightMetal: '#FB7185',
    midMetal: '#E11D48',
    deepMetal: '#881337',
    abyssMetal: '#2D030E',
    rimReflect: '#F43F5E',
    trimLight: '#FDE68A',
    trimMid: '#D97706',
    trimDark: '#78350F',
    gemCore: '#FFF1F2',
    gemGlow: '#FB7185',
    arenaOuterMetal: '#4C0519',
    arenaFloorDark: '#190208',
    arenaFloorMid: '#58081E',
  },
  green: {
    name: 'Emerald',
    territoryTitle: 'EMERALD SANCTUARY',
    territorySubtitle: 'JADE CITADEL',
    specHighlight: '#D1FAE5',
    lightMetal: '#34D399',
    midMetal: '#059669',
    deepMetal: '#064E3B',
    abyssMetal: '#011C15',
    rimReflect: '#10B981',
    trimLight: '#A7F3D0',
    trimMid: '#10B981',
    trimDark: '#064E3B',
    gemCore: '#ECFDF5',
    gemGlow: '#34D399',
    arenaOuterMetal: '#042F24',
    arenaFloorDark: '#02140F',
    arenaFloorMid: '#064030',
  },
  yellow: {
    name: 'Solar Gold',
    territoryTitle: 'SOLAR FORGE',
    territorySubtitle: 'AUREATE FOUNDRY',
    specHighlight: '#FEF9C3',
    lightMetal: '#FBBF24',
    midMetal: '#D97706',
    deepMetal: '#78350F',
    abyssMetal: '#2B1002',
    rimReflect: '#F59E0B',
    trimLight: '#FEF08A',
    trimMid: '#F59E0B',
    trimDark: '#78350F',
    gemCore: '#FFFBEB',
    gemGlow: '#FDE047',
    arenaOuterMetal: '#451A03',
    arenaFloorDark: '#1C0901',
    arenaFloorMid: '#5C2606',
  },
  blue: {
    name: 'Sapphire',
    territoryTitle: 'SAPPHIRE CORE',
    territorySubtitle: 'CRYO REACTOR',
    specHighlight: '#E0F2FE',
    lightMetal: '#38BDF8',
    midMetal: '#2563EB',
    deepMetal: '#1E3A8A',
    abyssMetal: '#060E29',
    rimReflect: '#60A5FA',
    trimLight: '#BAE6FD',
    trimMid: '#38BDF8',
    trimDark: '#1E3A8A',
    gemCore: '#F0F9FF',
    gemGlow: '#38BDF8',
    arenaOuterMetal: '#0F2454',
    arenaFloorDark: '#050C21',
    arenaFloorMid: '#15306B',
  },
};

function gridCoordToSvgPoint(coord: GridCoord): { x: number; y: number } {
  return {
    x: (coord.col + 0.5) * CELL_SIZE,
    y: (coord.row + 0.5) * CELL_SIZE,
  };
}

export const LudoBoard: React.FC<LudoBoardProps> = ({
  players,
  activeColor = 'red',
  legalMoves,
  selectedTokenId,
  theme,
  colorBlindMode,
  reducedMotion,
  showMoveHints,
  animatingMove,
  onSelectToken,
}) => {
  const [hoveredTokenId, setHoveredTokenId] = useState<string | null>(null);
  const [captureBursts, setCaptureBursts] = useState<BurstEffect[]>([]);
  const [homeBursts, setHomeBursts] = useState<BurstEffect[]>([]);

  const prevTokensRef = useRef<Record<string, Token>>({});

  const themeConfig = useMemo(() => getBoardThemeOption(theme), [theme]);
  const effectiveThemeId = themeConfig.id;
  const activeTokenStyle: TokenStyle = themeConfig.tokenStyle;
  const tileSpec = useMemo(
    () => getThemeTileSpec(effectiveThemeId),
    [effectiveThemeId]
  );

  const turnLighting = useMemo(
    () => getTurnLightingConfig(activeColor),
    [activeColor]
  );

  // Detect captures and home arrivals for celebratory visual bursts
  useEffect(() => {
    const currentMap: Record<string, Token> = {};
    for (const p of players) {
      for (const t of p.tokens) {
        currentMap[t.id] = { ...t };
      }
    }

    const prevMap = prevTokensRef.current;
    if (Object.keys(prevMap).length > 0 && !reducedMotion) {
      for (const tokenId of Object.keys(currentMap)) {
        const curr = currentMap[tokenId];
        const prev = prevMap[tokenId];
        if (!prev) continue;

        if (curr.steps === FINISH_STEP && prev.steps < FINISH_STEP) {
          const pt = gridCoordToSvgPoint(
            getTokenGridCoord(curr.color, FINISH_STEP, curr.index)
          );
          const id = `home-${curr.id}-${Date.now()}`;
          setHomeBursts((b) => [...b, { id, x: pt.x, y: pt.y, color: curr.color }]);
          setTimeout(() => {
            setHomeBursts((b) => b.filter((item) => item.id !== id));
          }, 950);
        }

        if (prev.steps >= 0 && curr.steps === -1) {
          const pt = gridCoordToSvgPoint(
            getTokenGridCoord(prev.color, prev.steps, prev.index)
          );
          const id = `cap-${curr.id}-${Date.now()}`;
          setCaptureBursts((b) => [
            ...b,
            { id, x: pt.x, y: pt.y, color: prev.color },
          ]);
          setTimeout(() => {
            setCaptureBursts((b) => b.filter((item) => item.id !== id));
          }, 800);
        }
      }
    }

    prevTokensRef.current = currentMap;
  }, [players, reducedMotion]);

  const legalMoveByTokenId = useMemo(() => {
    const map = new Map<string, LegalMove>();
    for (const m of legalMoves) {
      map.set(m.tokenId, m);
    }
    return map;
  }, [legalMoves]);

  const allTokens = useMemo(() => {
    const list: Token[] = [];
    for (const p of players) {
      for (const t of p.tokens) {
        list.push(t);
      }
    }
    return list;
  }, [players]);

  const tokenPositions = useMemo(() => {
    const grouped = groupTokensByCell(allTokens);
    const result = new Map<
      string,
      {
        x: number;
        y: number;
        scale: number;
        stackCount: number;
        stackIndex: number;
      }
    >();

    for (const [, group] of Array.from(grouped.entries())) {
      group.sort((a: Token, b: Token) => {
        const aLegal = legalMoveByTokenId.has(a.id) ? 1 : 0;
        const bLegal = legalMoveByTokenId.has(b.id) ? 1 : 0;
        return aLegal - bLegal;
      });

      const count = group.length;
      group.forEach((token: Token, idx: number) => {
        const baseCoord = getTokenGridCoord(
          token.color,
          token.steps,
          token.index
        );
        const basePt = gridCoordToSvgPoint(baseCoord);

        if (token.steps < 0 || count === 1) {
          result.set(token.id, {
            x: basePt.x,
            y: basePt.y,
            scale: 1,
            stackCount: count,
            stackIndex: idx,
          });
        } else {
          const offset = getStackOffset(idx, count);
          result.set(token.id, {
            x: basePt.x + offset.dx * CELL_SIZE,
            y: basePt.y + offset.dy * CELL_SIZE,
            scale: offset.scale,
            stackCount: count,
            stackIndex: idx,
          });
        }
      });
    }

    return result;
  }, [allTokens, legalMoveByTokenId]);

  // Build move indicators for ALL playable tokens so the player immediately sees where each token will land
  const moveIndicators = useMemo(
    () => buildMoveIndicators(legalMoves, activeColor),
    [legalMoves, activeColor]
  );

  /**
   * Theme-Specific Safe Square Emblem (`isStar`)
   */
  const renderThemeSafeSquareEmblem = (cx: number, cy: number) => {
    if (effectiveThemeId === 'royal_classic') {
      // 2. ROYAL CLASSIC: 8-Point Burnished Gold Tudor Compass Rose & Royal Jewel
      const pts8: string[] = [];
      for (let i = 0; i < 16; i++) {
        const r = i % 2 === 0 ? 28 : 12;
        const a = (i * Math.PI) / 8 - Math.PI / 2;
        pts8.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
      }
      return (
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={31}
            fill="#451A03"
            stroke="#D97706"
            strokeWidth={2.5}
          />
          <circle
            cx={cx}
            cy={cy}
            r={26}
            fill="none"
            stroke="#FEF08A"
            strokeWidth={1.2}
            strokeDasharray="4 3"
          />
          <polygon
            points={pts8.join(' ')}
            transform="translate(1.5, 2.5)"
            fill="rgba(0,0,0,0.65)"
          />
          <polygon
            points={pts8.join(' ')}
            fill="url(#star-3d-gold)"
            stroke="#FEF08A"
            strokeWidth={1.3}
          />
          <circle cx={cx} cy={cy} r={7} fill="#B91C1C" stroke="#FEF08A" strokeWidth={1.5} />
          <circle cx={cx - 2} cy={cy - 2} r={2.2} fill="#FFFFFF" />
        </g>
      );
    }

    if (effectiveThemeId === 'elemental_realms') {
      // 3. ELEMENTAL REALMS: Carved Stone Runic Circle & 4-Elemental Crystal Compass
      return (
        <g transform={`translate(${cx}, ${cy})`}>
          <circle
            cx={0}
            cy={0}
            r={31}
            fill="#0F172A"
            stroke="#94A3B8"
            strokeWidth={2.5}
          />
          <circle
            cx={0}
            cy={0}
            r={24}
            fill="none"
            stroke="#F97316"
            strokeWidth={1.6}
            strokeDasharray="6 4"
          />
          {/* 4 Elemental Crystal Points */}
          <polygon points="0,-28 7,-8 -7,-8" fill="#EF4444" stroke="#FCA5A5" strokeWidth={1} />
          <polygon points="28,0 8,7 8,-7" fill="#10B981" stroke="#6EE7B7" strokeWidth={1} />
          <polygon points="0,28 7,8 -7,8" fill="#F59E0B" stroke="#FDE68A" strokeWidth={1} />
          <polygon points="-28,0 -8,7 -8,-7" fill="#38BDF8" stroke="#BAE6FD" strokeWidth={1} />
          <polygon
            points="0,-10 10,0 0,10 -10,0"
            fill="#FEF08A"
            stroke="#FFFFFF"
            strokeWidth={1.4}
          />
        </g>
      );
    }

    if (effectiveThemeId === 'neon_tech') {
      // 4. NEON TECH: Cybernetic Hex-Shield Node & Glowing Neon Star Reticle
      const hexPts = Array.from({ length: 6 })
        .map((_, i) => {
          const a = (i * Math.PI) / 3 - Math.PI / 6;
          return `${cx + 28 * Math.cos(a)},${cy + 28 * Math.sin(a)}`;
        })
        .join(' ');
      return (
        <g>
          <polygon
            points={hexPts}
            fill="#020617"
            stroke="#00F5A0"
            strokeWidth={2.4}
          />
          <circle
            cx={cx}
            cy={cy}
            r={18}
            fill="none"
            stroke="#00F0FF"
            strokeWidth={1.5}
            strokeDasharray="8 4"
          />
          <path
            d={`M ${cx} ${cy - 20} L ${cx + 6} ${cy - 6} L ${cx + 20} ${cy} L ${
              cx + 6
            } ${cy + 6} L ${cx} ${cy + 20} L ${cx - 6} ${cy + 6} L ${
              cx - 20
            } ${cy} L ${cx - 6} ${cy - 6} Z`}
            fill="#00F5A0"
            stroke="#FFFFFF"
            strokeWidth={1.2}
          />
          <circle cx={cx} cy={cy} r={4} fill="#FFFFFF" />
        </g>
      );
    }

    if (effectiveThemeId === 'nature_forest') {
      // 5. NATURE / FOREST: Woodland Leaf Wreath & Golden Sun-Flower Medallion
      return (
        <g transform={`translate(${cx}, ${cy})`}>
          <circle
            cx={0}
            cy={0}
            r={30}
            fill="#142916"
            stroke="#4ADE80"
            strokeWidth={2.4}
          />
          {/* 8 Botanical Petals */}
          {Array.from({ length: 8 }).map((_, i) => (
            <ellipse
              key={i}
              cx={0}
              cy={-16}
              rx={5.5}
              ry={10}
              transform={`rotate(${i * 45})`}
              fill={i % 2 === 0 ? '#4ADE80' : '#FBBF24'}
              stroke="#052E16"
              strokeWidth={1}
            />
          ))}
          <circle
            cx={0}
            cy={0}
            r={10}
            fill="#F59E0B"
            stroke="#FEF08A"
            strokeWidth={1.8}
          />
          <circle cx={-2.5} cy={-2.5} r={3} fill="#FFFFFF" opacity={0.85} />
        </g>
      );
    }

    if (effectiveThemeId === 'minimal_3d') {
      // 6. MINIMAL 3D MODERN: Clean Studio Minimalist Diamond & Star Badge
      return (
        <g transform={`translate(${cx}, ${cy})`}>
          <rect
            x={-22}
            y={-22}
            width={44}
            height={44}
            rx={10}
            transform="rotate(45)"
            fill="#F8FAFC"
            stroke="#0EA5E9"
            strokeWidth={2.8}
          />
          <path
            d="M 0 -15 L 4.5 -4.5 L 15 0 L 4.5 4.5 L 0 15 L -4.5 4.5 L -15 0 L -4.5 -4.5 Z"
            fill="#0EA5E9"
          />
          <circle cx={0} cy={0} r={3.5} fill="#FFFFFF" />
        </g>
      );
    }

    // 1. COSMIC GALAXY (Default): 3D Embossed 5-Point Golden Star inside Recessed Orbital Dish
    const outerR = 27;
    const innerR = 11.5;
    const starPoints: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      starPoints.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }

    return (
      <g>
        <circle cx={cx} cy={cy + 2} r={33} fill="rgba(0, 0, 0, 0.72)" />
        <circle
          cx={cx}
          cy={cy}
          r={32}
          fill="url(#safe-dish-well)"
          stroke="url(#gold-rim-bevel)"
          strokeWidth={2.4}
        />
        <circle cx={cx} cy={cy} r={24} fill="rgba(251, 191, 36, 0.18)" />
        <polygon
          points={starPoints.join(' ')}
          transform="translate(2, 3.5)"
          fill="rgba(0, 0, 0, 0.78)"
        />
        <polygon
          points={starPoints.join(' ')}
          fill="url(#star-3d-gold)"
          stroke="#FEF08A"
          strokeWidth={1.3}
          strokeLinejoin="round"
        />
        {Array.from({ length: 5 }).map((_, i) => {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + (outerR - 2) * Math.cos(angle)}
              y2={cy + (outerR - 2) * Math.sin(angle)}
              stroke="#FFFBEB"
              strokeWidth={1.1}
              opacity={0.75}
            />
          );
        })}
        <circle cx={cx - 1} cy={cy - 1} r={4.2} fill="#FFFFFF" opacity={0.9} />
      </g>
    );
  };

  /**
   * Theme-Specific Start Square Medallion (`isStartColor`)
   */
  const renderStartLaunchEngraving = (
    cx: number,
    cy: number,
    color: PlayerColor
  ) => {
    const palette = METALLIC_PAWN_PALETTE[color];
    const rotation =
      color === 'red'
        ? 0
        : color === 'green'
        ? 90
        : color === 'yellow'
        ? 180
        : 270;

    if (effectiveThemeId === 'minimal_3d') {
      // 6. MINIMAL 3D MODERN: Clean Minimalist White Home-Arrow Shield
      return (
        <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
          <rect
            x={-26}
            y={-26}
            width={52}
            height={52}
            rx={14}
            fill="#FFFFFF"
            stroke={palette.midMetal}
            strokeWidth={2.5}
          />
          <path
            d="M -12 -14 L 14 0 L -12 14 L -5 0 Z"
            fill={palette.midMetal}
          />
        </g>
      );
    }

    if (effectiveThemeId === 'neon_tech') {
      // 4. NEON TECH: Cyber Launch Pad with Double Neon Boosters
      return (
        <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
          <circle
            cx={0}
            cy={0}
            r={31}
            fill="#020617"
            stroke="#00F0FF"
            strokeWidth={2.4}
          />
          <path
            d="M -14 -14 L 2 0 L -14 14 M -2 -14 L 14 0 L -2 14"
            fill="none"
            stroke={palette.specHighlight}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
    }

    return (
      <g transform={`translate(${cx}, ${cy})`}>
        <circle cx={0} cy={2.5} r={33} fill="rgba(0, 0, 0, 0.75)" />
        <circle
          cx={0}
          cy={0}
          r={32}
          fill={palette.abyssMetal}
          stroke={palette.trimLight}
          strokeWidth={2.5}
        />
        <circle
          cx={0}
          cy={0}
          r={25}
          fill={`url(#pawn-body-${color})`}
          opacity={0.45}
        />
        {(() => {
          const pts: string[] = [];
          for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? 21 : 9;
            const a = (i * Math.PI) / 5 - Math.PI / 2;
            pts.push(`${r * Math.cos(a)},${r * Math.sin(a)}`);
          }
          return (
            <>
              <polygon
                points={pts.join(' ')}
                transform="translate(1.5, 2.5)"
                fill="rgba(0,0,0,0.72)"
              />
              <polygon
                points={pts.join(' ')}
                fill="url(#star-3d-gold)"
                stroke="#FFFFFF"
                strokeWidth={1.2}
                strokeLinejoin="round"
              />
            </>
          );
        })()}
        <circle cx={-1.5} cy={-1.5} r={3.5} fill="#FFFFFF" opacity={0.92} />
      </g>
    );
  };

  /**
   * Renders a Theme-Unique 3D Track Tile (`100x100`) where every board theme has
   * its own bespoke geometry, surface texture, home-lane motif, and bevel structure!
   */
  const renderPhysicalTrackTile = (
    row: number,
    col: number,
    key: string,
    options: {
      isStartColor?: PlayerColor | null;
      isStar?: boolean;
      homeLaneColor?: PlayerColor | null;
      homeLaneStepIndex?: number;
      trackIndex?: number;
    }
  ) => {
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    const cx = x + CELL_SIZE / 2;
    const cy = y + CELL_SIZE / 2;
    const coloredOwner = options.isStartColor || options.homeLaneColor || null;
    const palette = coloredOwner ? METALLIC_PAWN_PALETTE[coloredOwner] : null;
    const laneRotation =
      options.homeLaneColor === 'red'
        ? 0
        : options.homeLaneColor === 'green'
        ? 90
        : options.homeLaneColor === 'yellow'
        ? 180
        : 270;

    /* ========================================================================
       THEME 6: MINIMAL 3D MODERN (`studio_pillow` geometry)
       Smooth, clean, rounded 3D studio ceramic pillow blocks with minimalist chevrons
       ======================================================================== */
    if (tileSpec.tileGeometry === 'studio_pillow') {
      const pillFill =
        coloredOwner && palette
          ? `url(#tile-colored-plateau-${coloredOwner})`
          : '#FFFFFF';
      const pillStroke =
        coloredOwner && palette ? palette.lightMetal : '#CBD5E1';

      return (
        <g key={key} data-tile-geometry={tileSpec.tileGeometry}>
          <rect x={x} y={y} width={CELL_SIZE} height={CELL_SIZE} fill="#E2E8F0" />
          {/* Soft 3D Studio Drop Shadow */}
          <rect
            x={x + 6}
            y={y + 9}
            width={CELL_SIZE - 12}
            height={CELL_SIZE - 12}
            rx={20}
            fill="rgba(15, 23, 42, 0.18)"
          />
          {/* 3D Lower Ceramic Base Rim */}
          <rect
            x={x + 5}
            y={y + 7}
            width={CELL_SIZE - 10}
            height={CELL_SIZE - 10}
            rx={20}
            fill={coloredOwner && palette ? palette.deepMetal : '#CBD5E1'}
          />
          {/* Smooth Matte 3D Pillow Top Surface */}
          <rect
            x={x + 5}
            y={y + 4}
            width={CELL_SIZE - 10}
            height={CELL_SIZE - 12}
            rx={19}
            fill={pillFill}
            stroke={pillStroke}
            strokeWidth={1.6}
          />
          {/* Soft Studio Top-Left Rim Highlight */}
          <rect
            x={x + 10}
            y={y + 8}
            width={CELL_SIZE - 20}
            height={CELL_SIZE - 22}
            rx={15}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2}
            opacity={coloredOwner ? 0.35 : 0.9}
          />
          {/* Minimalist Home-Lane Chevron or Diamond Motif */}
          {options.homeLaneColor && (
            <g transform={`translate(${cx}, ${cy - 1}) rotate(${laneRotation})`}>
              {options.homeLaneStepIndex === 4 ? (
                <polygon
                  points="0,-14 14,0 0,14 -14,0"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={3}
                />
              ) : (
                <path
                  d="M -7 -11 L 6 0 L -7 11"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={3.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </g>
          )}
          {options.isStartColor &&
            renderStartLaunchEngraving(cx, cy - 1, options.isStartColor)}
          {options.isStar && renderThemeSafeSquareEmblem(cx, cy - 1)}
        </g>
      );
    }

    /* ========================================================================
       THEME 4: NEON TECH (`cyber_octagon` geometry)
       Chamfered sci-fi octagonal panels, glowing neon edge traces, and PCB circuit lines
       ======================================================================== */
    if (tileSpec.tileGeometry === 'cyber_octagon') {
      const c = 14; // Octagonal corner chamfer
      const p = 4;
      const octPoints = `${x + p + c},${y + p} ${x + CELL_SIZE - p - c},${
        y + p
      } ${x + CELL_SIZE - p},${y + p + c} ${x + CELL_SIZE - p},${
        y + CELL_SIZE - p - c
      } ${x + CELL_SIZE - p - c},${y + CELL_SIZE - p} ${x + p + c},${
        y + CELL_SIZE - p
      } ${x + p},${y + CELL_SIZE - p - c} ${x + p},${y + p + c}`;

      const neonStroke =
        coloredOwner && palette
          ? palette.lightMetal
          : options.isStar
          ? '#00F5A0'
          : (row + col) % 2 === 0
          ? '#00F0FF'
          : '#A855F7';

      return (
        <g key={key} data-tile-geometry={tileSpec.tileGeometry}>
          <rect x={x} y={y} width={CELL_SIZE} height={CELL_SIZE} fill="#02050D" />
          {/* Outer Octagonal Cyber Frame */}
          <polygon
            points={octPoints}
            fill={
              coloredOwner && palette
                ? `url(#tile-colored-plateau-${coloredOwner})`
                : '#070F22'
            }
            stroke={neonStroke}
            strokeWidth={coloredOwner ? 2.4 : 1.6}
          />
          {/* Inner Recessed Holo-Grid Screen */}
          <rect
            x={x + 14}
            y={y + 14}
            width={CELL_SIZE - 28}
            height={CELL_SIZE - 28}
            rx={4}
            fill={coloredOwner ? 'rgba(2, 6, 23, 0.38)' : '#040917'}
            stroke={neonStroke}
            strokeWidth={0.9}
            opacity={0.85}
          />
          {/* PCB Circuit Traces & Micro-Nodes on Neutral Cyber Tiles */}
          {!coloredOwner && !options.isStar && (
            <g stroke={neonStroke} opacity={0.42}>
              <path
                d={`M ${x + 18} ${cy} L ${cx - 10} ${cy} L ${cx} ${
                  cy - 10
                } L ${cx + 18} ${cy - 10}`}
                fill="none"
                strokeWidth={1.4}
              />
              <path
                d={`M ${cx} ${y + 18} L ${cx} ${cy + 12} L ${cx - 14} ${
                  cy + 12
                }`}
                fill="none"
                strokeWidth={1.2}
              />
              <circle cx={cx + 18} cy={cy - 10} r={2.5} fill={neonStroke} />
              <circle cx={cx - 14} cy={cy + 12} r={2.2} fill={neonStroke} />
              {/* Corner LED indicators */}
              <rect x={x + 18} y={y + 18} width={6} height={2.5} fill={neonStroke} />
              <rect
                x={x + CELL_SIZE - 24}
                y={y + CELL_SIZE - 20.5}
                width={6}
                height={2.5}
                fill={neonStroke}
              />
            </g>
          )}
          {/* Neon Tech Home Lane: Dual Neon Side Bars + Digital Booster Chevrons */}
          {options.homeLaneColor && palette && (
            <g transform={`translate(${cx}, ${cy}) rotate(${laneRotation})`}>
              <line
                x1={-28}
                y1={-28}
                x2={28}
                y2={-28}
                stroke={palette.specHighlight}
                strokeWidth={3}
              />
              <line
                x1={-28}
                y1={28}
                x2={28}
                y2={28}
                stroke={palette.specHighlight}
                strokeWidth={3}
              />
              <path
                d="M -12 -11 L 0 0 L -12 11 M 2 -11 L 14 0 L 2 11"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.9}
              />
            </g>
          )}
          {options.isStartColor &&
            renderStartLaunchEngraving(cx, cy, options.isStartColor)}
          {options.isStar && renderThemeSafeSquareEmblem(cx, cy)}
        </g>
      );
    }

    /* ========================================================================
       THEME 2: ROYAL CLASSIC (`gilded_marble` geometry)
       Polished Cream/Ivory Veined Marble Slabs with Double Gold Filigree & Royal Stars
       ======================================================================== */
    if (tileSpec.tileGeometry === 'gilded_marble') {
      return (
        <g key={key} data-tile-geometry={tileSpec.tileGeometry}>
          <rect x={x} y={y} width={CELL_SIZE} height={CELL_SIZE} fill="#1C0D04" />
          {/* 4-Sided Burnished Gold Bevel Slopes */}
          <polygon
            points={`${x + 3},${y + 3} ${x + 97},${y + 3} ${x + 87},${y + 13} ${
              x + 13
            },${y + 13}`}
            fill="#FEF08A"
          />
          <polygon
            points={`${x + 3},${y + 3} ${x + 13},${y + 13} ${x + 13},${y + 87} ${
              x + 3
            },${y + 97}`}
            fill="#F59E0B"
          />
          <polygon
            points={`${x + 97},${y + 3} ${x + 97},${y + 97} ${x + 87},${
              y + 87
            } ${x + 87},${y + 13}`}
            fill="#B45309"
          />
          <polygon
            points={`${x + 3},${y + 97} ${x + 13},${y + 87} ${x + 87},${
              y + 87
            } ${x + 97},${y + 97}`}
            fill="#451A03"
          />
          {/* Inner Marble or Royal Velvet Plateau */}
          <rect
            x={x + 12}
            y={y + 12}
            width={76}
            height={76}
            rx={3}
            fill={
              coloredOwner
                ? `url(#tile-colored-plateau-${coloredOwner})`
                : 'url(#tile-royal-marble)'
            }
            stroke="#D97706"
            strokeWidth={2}
          />
          {/* Organic Marble Veining on Neutral Royal Tiles */}
          {!coloredOwner && (
            <g stroke="#B45309" fill="none" opacity={0.22}>
              <path
                d={`M ${x + 16} ${y + 28 + ((row * 9) % 20)} Q ${cx} ${
                  cy - 8
                } ${x + 84} ${y + 68 - ((col * 7) % 18)}`}
                strokeWidth={1.6}
              />
              <path
                d={`M ${x + 28} ${y + 82} Q ${cx + 10} ${cy + 6} ${x + 76} ${
                  y + 18
                }`}
                strokeWidth={1}
              />
            </g>
          )}
          {/* Ornate Inner Gold Filigree Frame & 4 Corner Rosettes */}
          <rect
            x={x + 17}
            y={y + 17}
            width={66}
            height={66}
            fill="none"
            stroke={coloredOwner ? '#FEF08A' : '#D97706'}
            strokeWidth={1}
            opacity={0.65}
          />
          <circle cx={x + 20} cy={y + 20} r={2} fill="#D97706" />
          <circle cx={x + 80} cy={y + 20} r={2} fill="#D97706" />
          <circle cx={x + 20} cy={y + 80} r={2} fill="#D97706" />
          <circle cx={x + 80} cy={y + 80} r={2} fill="#D97706" />

          {/* Royal Classic Home Lane: Embossed Golden 5-Point Star on every Home Tile */}
          {options.homeLaneColor && (
            <g transform={`translate(${cx}, ${cy})`}>
              <polygon
                points="0,-16 4.5,-5 16,-5 7,2 10,13 0,6 -10,13 -7,2 -16,-5 -4.5,-5"
                fill="url(#star-3d-gold)"
                stroke="#FFFBEB"
                strokeWidth={1}
              />
            </g>
          )}
          {options.isStartColor &&
            renderStartLaunchEngraving(cx, cy, options.isStartColor)}
          {options.isStar && renderThemeSafeSquareEmblem(cx, cy)}
        </g>
      );
    }

    /* ========================================================================
       THEME 3: ELEMENTAL REALMS (`chiseled_runestone` geometry)
       Weathered Chiseled Stone Blocks with Fissure Cracks & Elemental Realm Sigils
       ======================================================================== */
    if (tileSpec.tileGeometry === 'chiseled_runestone') {
      // Determine nearest elemental realm tint for neutral perimeter tiles
      const realmAccent =
        row < 6 && col < 8
          ? '#F97316' // Fire (Top-Left)
          : row < 8 && col >= 8
          ? '#10B981' // Earth (Top-Right)
          : row >= 8 && col >= 7
          ? '#FBBF24' // Air (Bottom-Right)
          : '#38BDF8'; // Water/Ice (Bottom-Left)

      return (
        <g key={key} data-tile-geometry={tileSpec.tileGeometry}>
          <rect x={x} y={y} width={CELL_SIZE} height={CELL_SIZE} fill="#090D16" />
          {/* Chiseled Stone Outer Block with Weathered Chamfer */}
          <polygon
            points={`${x + 10},${y + 4} ${x + 92},${y + 4} ${x + 96},${
              y + 12
            } ${x + 96},${y + 90} ${x + 88},${y + 96} ${x + 8},${y + 96} ${
              x + 4
            },${y + 88} ${x + 4},${y + 10}`}
            fill={coloredOwner && palette ? palette.deepMetal : '#475569'}
            stroke="#020617"
            strokeWidth={2}
          />
          {/* Raised Chiseled Stone Tablet */}
          <polygon
            points={`${x + 16},${y + 12} ${x + 86},${y + 12} ${x + 88},${
              y + 18
            } ${x + 88},${y + 84} ${x + 82},${y + 88} ${x + 14},${y + 88} ${
              x + 12
            },${y + 82} ${x + 12},${y + 16}`}
            fill={
              coloredOwner
                ? `url(#tile-colored-plateau-${coloredOwner})`
                : 'url(#tile-elemental-stone)'
            }
            stroke={coloredOwner && palette ? palette.trimLight : realmAccent}
            strokeWidth={1.6}
          />
          {/* Carved Stone Fissures & Elemental Rune Marks on Neutral Tiles */}
          {!coloredOwner && !options.isStar && (
            <g opacity={0.45}>
              <path
                d={`M ${x + 14} ${y + 26} L ${x + 28} ${y + 34} L ${x + 22} ${
                  y + 46
                }`}
                fill="none"
                stroke="#1E293B"
                strokeWidth={1.8}
                strokeLinecap="round"
              />
              <path
                d={`M ${x + 86} ${y + 72} L ${x + 70} ${y + 64} L ${x + 74} ${
                  y + 52
                }`}
                fill="none"
                stroke="#1E293B"
                strokeWidth={1.6}
                strokeLinecap="round"
              />
              {/* Subtle Elemental Rune in Center */}
              <path
                d={`M ${cx} ${cy - 10} L ${cx + 7} ${cy} L ${cx} ${
                  cy + 10
                } L ${cx - 7} ${cy} Z`}
                fill="none"
                stroke={realmAccent}
                strokeWidth={1.5}
              />
            </g>
          )}
          {/* Elemental Realms Home Lane: Carved Elemental Sigil per Color */}
          {options.homeLaneColor && palette && (
            <g transform={`translate(${cx}, ${cy})`}>
              {options.homeLaneColor === 'red' && (
                /* Fire Flame Sigil */
                <path
                  d="M 0 -16 C 10 -6, 12 6, 0 16 C -12 6, -10 -6, 0 -16 Z"
                  fill={palette.specHighlight}
                  opacity={0.8}
                />
              )}
              {options.homeLaneColor === 'green' && (
                /* Earth Crystal Leaf Sigil */
                <polygon
                  points="0,-16 12,0 0,16 -12,0"
                  fill={palette.specHighlight}
                  opacity={0.8}
                />
              )}
              {options.homeLaneColor === 'yellow' && (
                /* Air Sunburst Sigil */
                <circle
                  cx={0}
                  cy={0}
                  r={11}
                  fill="none"
                  stroke={palette.specHighlight}
                  strokeWidth={3}
                />
              )}
              {options.homeLaneColor === 'blue' && (
                /* Water/Ice Snowflake Crystal Sigil */
                <path
                  d="M 0 -15 L 0 15 M -13 -8 L 13 8 M -13 8 L 13 -8"
                  stroke={palette.specHighlight}
                  strokeWidth={2.8}
                  strokeLinecap="round"
                />
              )}
            </g>
          )}
          {options.isStartColor &&
            renderStartLaunchEngraving(cx, cy, options.isStartColor)}
          {options.isStar && renderThemeSafeSquareEmblem(cx, cy)}
        </g>
      );
    }

    /* ========================================================================
       THEME 5: NATURE / FOREST (`carved_timber` geometry)
       Hand-Carved Woodland Timber Planks with Wood Grain Seams & Corner Moss Tufts
       ======================================================================== */
    if (tileSpec.tileGeometry === 'carved_timber') {
      return (
        <g key={key} data-tile-geometry={tileSpec.tileGeometry}>
          <rect x={x} y={y} width={CELL_SIZE} height={CELL_SIZE} fill="#0F1F11" />
          {/* Carved Bark/Timber Outer Bevel */}
          <rect
            x={x + 4}
            y={y + 4}
            width={92}
            height={92}
            rx={10}
            fill={coloredOwner && palette ? palette.deepMetal : '#4E342E'}
            stroke="#1B2E1E"
            strokeWidth={2}
          />
          {/* Inner Timber Plank or Mossy Stepping Stone */}
          <rect
            x={x + 11}
            y={y + 11}
            width={78}
            height={78}
            rx={7}
            fill={
              coloredOwner
                ? `url(#tile-colored-plateau-${coloredOwner})`
                : 'url(#tile-nature-wood)'
            }
            stroke={coloredOwner && palette ? palette.trimLight : '#5D4037'}
            strokeWidth={1.8}
          />
          {/* Authentic Wood Plank Seams & Grain Rings on Neutral Woodland Tiles */}
          {!coloredOwner && (
            <g stroke="#5D4037" fill="none" opacity={0.38}>
              <line x1={x + 12} y1={y + 37} x2={x + 88} y2={y + 37} strokeWidth={1.4} />
              <line x1={x + 12} y1={y + 63} x2={x + 88} y2={y + 63} strokeWidth={1.4} />
              <path
                d={`M ${x + 22} ${y + 24} Q ${cx} ${y + 18} ${x + 78} ${y + 25}`}
                strokeWidth={1.2}
              />
              <path
                d={`M ${x + 20} ${y + 50} Q ${cx - 8} ${y + 56} ${x + 80} ${
                  y + 49
                }`}
                strokeWidth={1.2}
              />
            </g>
          )}
          {/* Corner Emerald Moss Tufts */}
          <g fill="#22C55E" opacity={0.75}>
            <circle cx={x + 15} cy={y + 15} r={4.5} />
            <circle cx={x + 21} cy={y + 13} r={3.2} />
            <circle cx={x + 85} cy={y + 85} r={4.5} />
            <circle cx={x + 79} cy={y + 87} r={3.2} />
          </g>
          {/* Nature Forest Home Lane: Carved Woodland Leaf Emblem */}
          {options.homeLaneColor && palette && (
            <g transform={`translate(${cx}, ${cy}) rotate(${laneRotation})`}>
              <path
                d="M -14 0 C -6 -12, 8 -12, 16 0 C 8 12, -6 12, -14 0 Z"
                fill={palette.specHighlight}
                opacity={0.78}
              />
              <line
                x1={-12}
                y1={0}
                x2={12}
                y2={0}
                stroke={palette.deepMetal}
                strokeWidth={2}
              />
            </g>
          )}
          {options.isStartColor &&
            renderStartLaunchEngraving(cx, cy, options.isStartColor)}
          {options.isStar && renderThemeSafeSquareEmblem(cx, cy)}
        </g>
      );
    }

    /* ========================================================================
       THEME 1: COSMIC GALAXY (`faceted_crystal` geometry — Primary Hero Art Direction)
       4-Faceted 3D Beveled Cosmic Crystal Blocks with Nebula Variation & Glass Sheen
       ======================================================================== */
    const outerPad = 3.5;
    const innerPad = 14.5;
    const x0 = x + outerPad;
    const y0 = y + outerPad;
    const x1 = x + CELL_SIZE - outerPad;
    const y1 = y + CELL_SIZE - outerPad;

    const ix0 = x + innerPad;
    const iy0 = y + innerPad;
    const ix1 = x + CELL_SIZE - innerPad;
    const iy1 = y + CELL_SIZE - innerPad;

    const variant = (((row * 7 + col * 13) % 3) + 3) % 3;
    const topSlopeFill =
      coloredOwner && palette
        ? palette.specHighlight
        : variant === 1
        ? 'rgba(232, 121, 249, 0.44)'
        : 'rgba(125, 211, 252, 0.42)';
    const leftSlopeFill =
      coloredOwner && palette
        ? palette.lightMetal
        : variant === 1
        ? 'rgba(168, 85, 247, 0.28)'
        : 'rgba(56, 189, 248, 0.26)';
    const rightSlopeFill =
      coloredOwner && palette ? palette.deepMetal : 'rgba(8, 11, 28, 0.82)';
    const bottomSlopeFill =
      coloredOwner && palette ? palette.abyssMetal : 'rgba(2, 4, 12, 0.94)';
    const plateauFill =
      coloredOwner && palette
        ? `url(#tile-colored-plateau-${coloredOwner})`
        : variant === 0
        ? 'url(#tile-cosmic-plateau-a)'
        : variant === 1
        ? 'url(#tile-cosmic-plateau-b)'
        : 'url(#tile-cosmic-plateau-c)';
    const plateauStroke =
      coloredOwner && palette
        ? palette.trimLight
        : variant === 1
        ? 'rgba(192, 132, 252, 0.45)'
        : 'rgba(125, 211, 252, 0.42)';

    return (
      <g key={key} data-tile-geometry={tileSpec.tileGeometry}>
        <rect x={x} y={y} width={CELL_SIZE} height={CELL_SIZE} fill="#020308" />
        <rect
          x={x0}
          y={y0 + 2}
          width={CELL_SIZE - outerPad * 2}
          height={CELL_SIZE - outerPad * 2}
          rx={7}
          fill="rgba(0, 0, 0, 0.88)"
        />
        <polygon
          points={`${x0},${y0} ${x1},${y0} ${ix1},${iy0} ${ix0},${iy0}`}
          fill={topSlopeFill}
          opacity={coloredOwner ? 0.85 : 0.95}
        />
        <polygon
          points={`${x0},${y0} ${ix0},${iy0} ${ix0},${iy1} ${x0},${y1}`}
          fill={leftSlopeFill}
          opacity={coloredOwner ? 0.72 : 0.9}
        />
        <polygon
          points={`${x1},${y0} ${x1},${y1} ${ix1},${iy1} ${ix1},${iy0}`}
          fill={rightSlopeFill}
        />
        <polygon
          points={`${x0},${y1} ${ix0},${iy1} ${ix1},${iy1} ${x1},${y1}`}
          fill={bottomSlopeFill}
        />
        <rect
          x={x0}
          y={y0}
          width={CELL_SIZE - outerPad * 2}
          height={CELL_SIZE - outerPad * 2}
          rx={6}
          fill="none"
          stroke="rgba(0, 0, 0, 0.75)"
          strokeWidth={1.4}
        />
        <rect
          x={ix0}
          y={iy0}
          width={ix1 - ix0}
          height={iy1 - iy0}
          rx={4}
          fill={plateauFill}
          stroke={plateauStroke}
          strokeWidth={coloredOwner ? 1.8 : 1.2}
        />
        <polygon
          points={`${ix0 + 2},${iy0 + 2} ${ix0 + 44},${iy0 + 2} ${ix0 + 18},${
            iy1 - 2
          } ${ix0 + 2},${iy1 - 2}`}
          fill="url(#tile-glass-sheen)"
          pointerEvents="none"
        />
        <path
          d={`M ${ix0 + 2} ${iy1 - 6} L ${ix0 + 2} ${iy0 + 2} L ${ix1 - 6} ${
            iy0 + 2
          }`}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={1.3}
          strokeLinecap="round"
          opacity={coloredOwner ? 0.55 : 0.38}
        />
        {!options.isStartColor && !options.isStar && (
          <g
            transform={`translate(${cx}, ${cy})`}
            opacity={coloredOwner ? 0.55 : 0.28}
          >
            <path
              d="M 0 -11 Q 1.5 -1.5 11 0 Q 1.5 1.5 0 11 Q -1.5 1.5 -11 0 Q -1.5 -1.5 0 -11 Z"
              fill={coloredOwner && palette ? palette.specHighlight : '#E0F2FE'}
            />
            <circle cx={0} cy={0} r={2} fill="#FFFFFF" />
          </g>
        )}
        {options.isStartColor &&
          renderStartLaunchEngraving(cx, cy, options.isStartColor)}
        {options.isStar && renderThemeSafeSquareEmblem(cx, cy)}
      </g>
    );
  };

  /**
   * Renders each of the Four Player Territories (`600x600`) with a bespoke 3D
   * Spawn Room Architecture tailored to the active Board Theme:
   * - `cosmic_galaxy`: `orbital_reactor` (3D orbital reactor amphitheater with ringed planets & gravity wells)
   * - `royal_classic`: `imperial_citadel` (Gilded royal castle keep with turret spires, braziers & octagonal throne sockets)
   * - `elemental_realms`: `elemental_sanctuary` (Chiseled elemental caldera/grove/temple/sanctum with lava/crystal/solar/ice craters)
   * - `neon_tech`: `cyber_hex_bay` (Chamfered octagonal cyberpunk neon dock with circuit grid & holo-pad sockets)
   * - `nature_forest`: `woodland_glade` (Carved timber clearing with lush corner tree canopies, lanterns & mossy tree-stump sockets)
   * - `minimal_3d`: `studio_podium` (Clean matte rounded-square recess with 3D cylindrical studio podium & smooth dimple sockets)
   */
  const renderPlayerTerritory = (color: PlayerColor) => {
    const region = YARD_QUADRANTS[color];
    const palette = METALLIC_PAWN_PALETTE[color];
    const isCurrentTurn = activeColor === color;
    const cx = region.x + region.size / 2;
    const cy = region.y + region.size / 2;
    const slots = YARD_SLOT_COORDS[color];
    const territoryTitle =
      tileSpec.territoryTitles[color] || palette.territoryTitle;

    const x0 = region.x + 6;
    const y0 = region.y + 6;
    const x1 = region.x + region.size - 6;
    const y1 = region.y + region.size - 6;
    const bx0 = region.x + 24;
    const by0 = region.y + 24;
    const bx1 = region.x + region.size - 24;
    const by1 = region.y + region.size - 24;

    /* ========================================================================
       SPAWN ROOM 6: MINIMAL 3D MODERN (`studio_podium`)
       Clean Matte Rounded-Square Recess + 3D Cylindrical Studio Podium + Dimple Sockets
       ======================================================================== */
    if (tileSpec.spawnRoomArchitecture === 'studio_podium') {
      // Corner emblem position (toward the center of the board, matching reference panel 6)
      const badgeX =
        color === 'red' || color === 'blue'
          ? region.x + region.size - 92
          : region.x + 92;
      const badgeY =
        color === 'red' || color === 'green'
          ? region.y + region.size - 92
          : region.y + 92;

      return (
        <g
          key={`yard-${color}`}
          data-testid={`spawn-room-${color}`}
          data-spawn-architecture={tileSpec.spawnRoomArchitecture}
        >
          {/* Warm-white matte studio chassis background */}
          <rect
            x={region.x}
            y={region.y}
            width={region.size}
            height={region.size}
            fill="#E2E8F0"
          />

          {/* Outer recessed studio bay shadow */}
          <rect
            x={region.x + 22}
            y={region.y + 28}
            width={region.size - 44}
            height={region.size - 44}
            rx={56}
            fill="rgba(15, 23, 42, 0.24)"
          />

          {/* Smooth 3D matte colored rounded-square recess */}
          <rect
            x={region.x + 20}
            y={region.y + 20}
            width={region.size - 40}
            height={region.size - 40}
            rx={54}
            fill={`url(#tile-colored-plateau-${color})`}
            stroke="#FFFFFF"
            strokeWidth={4}
          />

          {/* Luminous inner neon rim tube inside the rounded-square bay */}
          <rect
            x={region.x + 34}
            y={region.y + 34}
            width={region.size - 68}
            height={region.size - 68}
            rx={42}
            fill="none"
            stroke={palette.specHighlight}
            strokeWidth={3.5}
            opacity={0.9}
          />

          {/* Active Turn Pulse Ring */}
          {isCurrentTurn && (
            <circle
              cx={cx}
              cy={cy - 10}
              r={216}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={7}
              className="animate-turn-yard-ring"
              data-testid="turn-yard-pulse-ring"
            />
          )}

          {/* Sculpted 3D Corner Emblem Medallion (matching reference panel 6) */}
          <g transform={`translate(${badgeX}, ${badgeY})`}>
            <circle cx={2} cy={4} r={28} fill="rgba(15, 23, 42, 0.35)" />
            <circle
              cx={0}
              cy={0}
              r={26}
              fill="rgba(255, 255, 255, 0.22)"
              stroke="#FFFFFF"
              strokeWidth={2}
            />
            {color === 'red' || color === 'green' ? (
              <path
                d="M -11 -11 L 11 11 M 11 -11 L -11 11 M -13 -5 L -5 -13 M 5 -13 L 13 -5"
                stroke="#FFFFFF"
                strokeWidth={3.2}
                strokeLinecap="round"
              />
            ) : color === 'blue' ? (
              <g fill="#FFFFFF">
                <circle cx={-6} cy={-4} r={4.5} />
                <circle cx={6} cy={-4} r={4.5} />
                <path d="M -13 9 C -13 2 -1 2 -1 9 Z M 1 9 C 1 2 13 2 13 9 Z" />
              </g>
            ) : (
              <path
                d="M 0 -13 L 3.8 -3.8 L 13 -3.8 L 5.5 2 L 8.2 11.5 L 0 6 L -8.2 11.5 L -5.5 2 L -13 -3.8 L -3.8 -3.8 Z"
                fill="#FFFFFF"
              />
            )}
          </g>

          {/* 3D Cylindrical Studio Podium Cast Shadow */}
          <ellipse
            cx={cx + 6}
            cy={cy + 26}
            rx={204}
            ry={196}
            fill="rgba(15, 23, 42, 0.48)"
          />

          {/* 3D Cylindrical Podium Extruded Vertical Side Wall */}
          <path
            d={`M ${cx - 196} ${cy - 8} L ${cx - 196} ${
              cy + 20
            } A 196 188 0 0 0 ${cx + 196} ${cy + 20} L ${cx + 196} ${
              cy - 8
            } Z`}
            fill={palette.deepMetal}
          />

          {/* 3D Cylindrical Podium Top Matte Surface */}
          <circle
            cx={cx}
            cy={cy - 8}
            r={196}
            fill={`url(#tile-colored-plateau-${color})`}
            stroke="#FFFFFF"
            strokeWidth={3}
          />

          {/* Crisp Neon-White Inner Rim Ring on the Podium */}
          <circle
            cx={cx}
            cy={cy - 8}
            r={180}
            fill="none"
            stroke={palette.specHighlight}
            strokeWidth={3.5}
          />

          {/* 4 Smooth Studio Dimple Sockets (`matte_studio_dimple`) */}
          {slots.map((slotCoord, idx) => {
            const slot = gridCoordToSvgPoint(slotCoord);
            return (
              <g
                key={`slot-${color}-${idx}`}
                data-socket-style={tileSpec.socketStyle}
              >
                <circle
                  cx={slot.x + 2}
                  cy={slot.y + 4}
                  r={48}
                  fill="rgba(15, 23, 42, 0.35)"
                />
                <circle
                  cx={slot.x}
                  cy={slot.y}
                  r={46}
                  fill={palette.deepMetal}
                  stroke="#FFFFFF"
                  strokeWidth={2.5}
                />
                <circle
                  cx={slot.x}
                  cy={slot.y + 2}
                  r={35}
                  fill={`url(#tile-colored-plateau-${color})`}
                  stroke={palette.specHighlight}
                  strokeWidth={1.6}
                />
              </g>
            );
          })}

          {/* Clean Bold Studio Label (`RED`, `GREEN`, `YELLOW`, `BLUE`) on the Matte Floor */}
          <text
            x={cx}
            y={region.y + region.size - 54}
            textAnchor="middle"
            fill="#FFFFFF"
            stroke="rgba(15, 23, 42, 0.45)"
            strokeWidth={3}
            paintOrder="stroke"
            fontSize="24"
            fontWeight="900"
            letterSpacing="0.18em"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            {territoryTitle}
          </text>
        </g>
      );
    }

    /* ========================================================================
       SPAWN ROOM 4: NEON TECH (`cyber_hex_bay`)
       Chamfered Octagonal Cyberpunk Neon Dock + Circuit Grid + Octagonal Holo-Pads
       ======================================================================== */
    if (tileSpec.spawnRoomArchitecture === 'cyber_hex_bay') {
      const cut = 54;
      const pad = 68;
      const px0 = region.x + pad;
      const py0 = region.y + pad;
      const px1 = region.x + region.size - pad;
      const py1 = region.y + region.size - pad;
      const octPoints = `${px0 + cut},${py0} ${px1 - cut},${py0} ${px1},${
        py0 + cut
      } ${px1},${py1 - cut} ${px1 - cut},${py1} ${px0 + cut},${py1} ${px0},${
        py1 - cut
      } ${px0},${py0 + cut}`;

      const icut = 44;
      const ipad = 92;
      const ix0 = region.x + ipad;
      const iy0 = region.y + ipad;
      const ix1 = region.x + region.size - ipad;
      const iy1 = region.y + region.size - ipad;
      const innerOctPoints = `${ix0 + icut},${iy0} ${ix1 - icut},${iy0} ${ix1},${
        iy0 + icut
      } ${ix1},${iy1 - icut} ${ix1 - icut},${iy1} ${ix0 + icut},${iy1} ${ix0},${
        iy1 - icut
      } ${ix0},${iy0 + icut}`;

      return (
        <g
          key={`yard-${color}`}
          data-testid={`spawn-room-${color}`}
          data-spawn-architecture={tileSpec.spawnRoomArchitecture}
        >
          {/* Dark Obsidian Cyber Deck Chassis */}
          <rect
            x={region.x}
            y={region.y}
            width={region.size}
            height={region.size}
            fill="#030611"
          />

          {/* Outer Cybernetic Trench Frame */}
          <rect
            x={bx0}
            y={by0}
            width={bx1 - bx0}
            height={by1 - by0}
            rx={18}
            fill="#060B19"
            stroke={palette.lightMetal}
            strokeWidth={2.5}
          />

          {/* Glowing Motherboard Circuit Traces in Quadrant Corners */}
          {[
            { tx: region.x + 42, ty: region.y + 42, sx: 1, sy: 1 },
            {
              tx: region.x + region.size - 42,
              ty: region.y + 42,
              sx: -1,
              sy: 1,
            },
            {
              tx: region.x + 42,
              ty: region.y + region.size - 42,
              sx: 1,
              sy: -1,
            },
            {
              tx: region.x + region.size - 42,
              ty: region.y + region.size - 42,
              sx: -1,
              sy: -1,
            },
          ].map((corner, idx) => (
            <g
              key={`cyber-corner-${idx}`}
              transform={`translate(${corner.tx}, ${corner.ty}) scale(${corner.sx}, ${corner.sy})`}
            >
              <path
                d="M 0 58 L 0 0 L 58 0"
                fill="none"
                stroke={palette.specHighlight}
                strokeWidth={4}
                strokeLinecap="square"
              />
              <path
                d="M 14 78 L 14 24 L 34 14 L 78 14"
                fill="none"
                stroke={palette.lightMetal}
                strokeWidth={2}
                opacity={0.85}
              />
              <circle cx={78} cy={14} r={4.5} fill={palette.specHighlight} />
              <circle cx={14} cy={78} r={4.5} fill={palette.specHighlight} />
            </g>
          ))}

          {/* Active Turn Pulse Ring */}
          {isCurrentTurn && (
            <polygon
              points={octPoints}
              fill="none"
              stroke={palette.specHighlight}
              strokeWidth={9}
              className="animate-turn-yard-ring"
              data-testid="turn-yard-pulse-ring"
            />
          )}

          {/* 3D Extruded Lower Shadow & Side Wall of Octagonal Cyber Platform */}
          <polygon
            points={octPoints}
            transform="translate(0, 18)"
            fill="rgba(0, 0, 0, 0.9)"
          />
          <polygon
            points={octPoints}
            transform="translate(0, 10)"
            fill={palette.abyssMetal}
            stroke={palette.midMetal}
            strokeWidth={2}
          />

          {/* Main Chamfered Octagonal Cyber Platform Deck */}
          <polygon
            points={octPoints}
            fill="#070D1F"
            stroke={palette.lightMetal}
            strokeWidth={5}
          />
          {/* Outer High-Intensity Neon Tube Rail */}
          <polygon
            points={octPoints}
            fill={`url(#territory-nebula-${color})`}
            stroke={palette.specHighlight}
            strokeWidth={2}
          />

          {/* Inner Recessed Octagonal Matrix Floor */}
          <polygon
            points={innerOctPoints}
            fill="#040814"
            stroke={palette.lightMetal}
            strokeWidth={3}
          />

          {/* Laser-Etched Cyber Grid Lines & Central Hologram Core */}
          <g opacity={0.45}>
            <line
              x1={cx - 190}
              y1={cy}
              x2={cx + 190}
              y2={cy}
              stroke={palette.lightMetal}
              strokeWidth={1.8}
              strokeDasharray="10 8"
            />
            <line
              x1={cx}
              y1={cy - 190}
              x2={cx}
              y2={cy + 190}
              stroke={palette.lightMetal}
              strokeWidth={1.8}
              strokeDasharray="10 8"
            />
            <polygon
              points={`${cx},${cy - 44} ${cx + 44},${cy} ${cx},${cy + 44} ${
                cx - 44
              },${cy}`}
              fill="none"
              stroke={palette.specHighlight}
              strokeWidth={2.2}
            />
            <circle
              cx={cx}
              cy={cy}
              r={14}
              fill={palette.midMetal}
              stroke={palette.specHighlight}
              strokeWidth={2}
            />
          </g>

          {/* 4 Chamfered Octagonal Holo-Pad Token Sockets (`neon_holo_pad`) */}
          {slots.map((slotCoord, idx) => {
            const slot = gridCoordToSvgPoint(slotCoord);
            const sr = 50;
            const sc = 16;
            const sx0 = slot.x - sr;
            const sy0 = slot.y - sr;
            const sx1 = slot.x + sr;
            const sy1 = slot.y + sr;
            const padOct = `${sx0 + sc},${sy0} ${sx1 - sc},${sy0} ${sx1},${
              sy0 + sc
            } ${sx1},${sy1 - sc} ${sx1 - sc},${sy1} ${sx0 + sc},${sy1} ${sx0},${
              sy1 - sc
            } ${sx0},${sy0 + sc}`;

            return (
              <g
                key={`slot-${color}-${idx}`}
                data-socket-style={tileSpec.socketStyle}
              >
                <polygon
                  points={padOct}
                  transform="translate(0, 6)"
                  fill="rgba(0, 0, 0, 0.85)"
                />
                <polygon
                  points={padOct}
                  fill="#081026"
                  stroke={palette.lightMetal}
                  strokeWidth={3.2}
                />
                <polygon
                  points={padOct}
                  transform={`translate(${slot.x}, ${slot.y}) scale(0.76) translate(${-slot.x}, ${-slot.y})`}
                  fill="#030612"
                  stroke={palette.specHighlight}
                  strokeWidth={2}
                />
                <circle
                  cx={slot.x}
                  cy={slot.y}
                  r={22}
                  fill={palette.midMetal}
                  opacity={0.45}
                />
                <circle
                  cx={slot.x}
                  cy={slot.y}
                  r={24}
                  fill="none"
                  stroke={palette.specHighlight}
                  strokeWidth={1.6}
                  strokeDasharray="8 5"
                />
              </g>
            );
          })}

          {/* Sleek Cyber HUD Nameplate */}
          <g transform={`translate(${cx}, ${cy + 226})`}>
            <polygon
              points="-118,0 -104,-15 104,-15 118,0 104,15 -104,15"
              fill="#030714"
              stroke={palette.specHighlight}
              strokeWidth={2}
            />
            <text
              x={0}
              y={1}
              textAnchor="middle"
              dominantBaseline="central"
              fill={palette.specHighlight}
              fontSize="12"
              fontWeight="900"
              letterSpacing="0.16em"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              {territoryTitle}
            </text>
          </g>
        </g>
      );
    }

    /* ========================================================================
       SPAWN ROOM 2: ROYAL CLASSIC (`imperial_citadel`)
       Gilded Royal Castle Keep + Turret Spires + Flaming Braziers + Octagonal Throne Sockets
       ======================================================================== */
    if (tileSpec.spawnRoomArchitecture === 'imperial_citadel') {
      return (
        <g
          key={`yard-${color}`}
          data-testid={`spawn-room-${color}`}
          data-spawn-architecture={tileSpec.spawnRoomArchitecture}
        >
          {/* Deep Mahogany & Royal Gold-Leaf Outer Frame */}
          <rect
            x={region.x}
            y={region.y}
            width={region.size}
            height={region.size}
            fill="#1C0D04"
          />
          <polygon
            points={`${x0},${y0} ${x1},${y0} ${bx1},${by0} ${bx0},${by0}`}
            fill="#FDE68A"
            opacity={0.85}
          />
          <polygon
            points={`${x0},${y0} ${bx0},${by0} ${bx0},${by1} ${x0},${y1}`}
            fill="#F59E0B"
            opacity={0.75}
          />
          <polygon
            points={`${x1},${y0} ${x1},${y1} ${bx1},${by1} ${bx1},${by0}`}
            fill="#92400E"
          />
          <polygon
            points={`${x0},${y1} ${bx0},${by1} ${bx1},${by1} ${x1},${y1}`}
            fill="#451A03"
          />

          {/* Royal Brocade Velvet Courtyard Housing */}
          <rect
            x={bx0}
            y={by0}
            width={bx1 - bx0}
            height={by1 - by0}
            rx={14}
            fill={`url(#territory-housing-${color})`}
            stroke="url(#gold-rim-bevel)"
            strokeWidth={4}
          />
          {/* Inner Gold Filigree Corner Frame */}
          <rect
            x={bx0 + 12}
            y={by0 + 12}
            width={bx1 - bx0 - 24}
            height={by1 - by0 - 24}
            rx={10}
            fill="none"
            stroke="#FDE68A"
            strokeWidth={1.6}
            strokeDasharray="16 6"
            opacity={0.75}
          />

          {/* 4 Corner Royal Castle Watchtowers & Flaming Golden Braziers */}
          {[
            { px: region.x + 68, py: region.y + 68 },
            { px: region.x + region.size - 68, py: region.y + 68 },
            { px: region.x + 68, py: region.y + region.size - 68 },
            {
              px: region.x + region.size - 68,
              py: region.y + region.size - 68,
            },
          ].map((brazier, idx) => (
            <g
              key={`brazier-${idx}`}
              transform={`translate(${brazier.px}, ${brazier.py})`}
            >
              <circle cx={3} cy={5} r={28} fill="rgba(0,0,0,0.8)" />
              {/* Octagonal gold turret base */}
              <circle
                cx={0}
                cy={0}
                r={26}
                fill="url(#gold-rim-bevel)"
                stroke="#FEF08A"
                strokeWidth={2}
              />
              <circle
                cx={0}
                cy={0}
                r={18}
                fill={palette.deepMetal}
                stroke="#F59E0B"
                strokeWidth={1.8}
              />
              {/* Glowing royal brazier flame / spire */}
              <circle cx={0} cy={0} r={11} fill="#F59E0B" />
              <circle cx={-2} cy={-2} r={6} fill="#FEF08A" />
              <circle cx={-3} cy={-3} r={2.5} fill="#FFFFFF" />
            </g>
          ))}

          {/* Active Turn Pulse Ring */}
          {isCurrentTurn && (
            <circle
              cx={cx}
              cy={cy}
              r={264}
              fill="none"
              stroke="#FEF08A"
              strokeWidth={7}
              className="animate-turn-yard-ring"
              data-testid="turn-yard-pulse-ring"
            />
          )}

          {/* Citadel Moat Shadow */}
          <ellipse
            cx={cx + 4}
            cy={cy + 18}
            rx={254}
            ry={250}
            fill="rgba(0, 0, 0, 0.88)"
          />

          {/* Outer Cream & Gold Marble Citadel Wall */}
          <circle
            cx={cx}
            cy={cy}
            r={248}
            fill="url(#tile-royal-marble)"
            stroke="url(#gold-rim-bevel)"
            strokeWidth={6}
          />

          {/* 24 Crenelated Castle Battlements (Merlons) around the Citadel Perimeter */}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = i * 15;
            return (
              <g
                key={`merlon-${i}`}
                transform={`translate(${cx}, ${cy}) rotate(${angle})`}
              >
                <rect
                  x={-8}
                  y={-248}
                  width={16}
                  height={20}
                  rx={2}
                  fill="url(#gold-rim-bevel)"
                  stroke="#451A03"
                  strokeWidth={1.2}
                />
              </g>
            );
          })}

          {/* Inner Royal Velvet Sanctum Courtyard */}
          <circle
            cx={cx}
            cy={cy}
            r={204}
            fill={`url(#arena-deck-${color})`}
            stroke="#FDE68A"
            strokeWidth={4}
          />
          <circle
            cx={cx}
            cy={cy}
            r={190}
            fill="none"
            stroke="#F59E0B"
            strokeWidth={1.8}
            strokeDasharray="12 6"
          />

          {/* Central Sculpted 3D Castle Keep Spire & Tudor Compass Rose */}
          <g transform={`translate(${cx}, ${cy})`}>
            <polygon
              points="0,-54 14,-14 54,0 14,14 0,54 -14,14 -54,0 -14,-14"
              fill="url(#gold-rim-bevel)"
              stroke="#FEF08A"
              strokeWidth={1.6}
              opacity={0.85}
            />
            <polygon
              points="0,-38 10,-10 38,0 10,10 0,38 -10,10 -38,0 -10,-10"
              fill={palette.lightMetal}
              stroke="#FEF08A"
              strokeWidth={1.5}
              transform="rotate(45)"
            />
            {/* Central Royal Keep Turret Roof */}
            <circle
              cx={0}
              cy={0}
              r={18}
              fill="url(#gold-rim-bevel)"
              stroke="#FFFFFF"
              strokeWidth={2}
            />
            <circle cx={0} cy={0} r={8} fill={palette.specHighlight} />
          </g>

          {/* 4 Gilded Octagonal Throne Pedestal Sockets (`gilded_octagon`) */}
          {slots.map((slotCoord, idx) => {
            const slot = gridCoordToSvgPoint(slotCoord);
            const rOut = 54;
            const octPts = Array.from({ length: 8 })
              .map((_, i) => {
                const a = ((i * 45 + 22.5) * Math.PI) / 180;
                return `${slot.x + Math.cos(a) * rOut},${
                  slot.y + Math.sin(a) * rOut
                }`;
              })
              .join(' ');

            return (
              <g
                key={`slot-${color}-${idx}`}
                data-socket-style={tileSpec.socketStyle}
              >
                <polygon
                  points={octPts}
                  transform="translate(2, 6)"
                  fill="rgba(0, 0, 0, 0.8)"
                />
                <polygon
                  points={octPts}
                  fill="url(#gold-rim-bevel)"
                  stroke="#FEF08A"
                  strokeWidth={2.5}
                />
                <circle
                  cx={slot.x}
                  cy={slot.y}
                  r={41}
                  fill="url(#tile-royal-marble)"
                  stroke="#92400E"
                  strokeWidth={2.2}
                />
                <circle
                  cx={slot.x}
                  cy={slot.y}
                  r={31}
                  fill={palette.deepMetal}
                  stroke="#FDE68A"
                  strokeWidth={2}
                />
                <circle
                  cx={slot.x}
                  cy={slot.y}
                  r={21}
                  fill={`url(#pawn-body-${color})`}
                  opacity={0.7}
                />
              </g>
            );
          })}

          {/* Royal Gold Scroll Nameplate */}
          <g transform={`translate(${cx}, ${cy + 226})`}>
            <rect
              x={-112}
              y={-15}
              width={224}
              height={30}
              rx={8}
              fill="#271003"
              stroke="url(#gold-rim-bevel)"
              strokeWidth={3}
            />
            <circle cx={-98} cy={0} r={4} fill="#FEF08A" />
            <circle cx={98} cy={0} r={4} fill="#FEF08A" />
            <text
              x={0}
              y={1}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#FEF08A"
              fontSize="12.5"
              fontWeight="900"
              letterSpacing="0.16em"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              {territoryTitle}
            </text>
          </g>
        </g>
      );
    }

    /* ========================================================================
       SPAWN ROOM 3: ELEMENTAL REALMS (`elemental_sanctuary`)
       Chiseled Elemental Rock Caldera/Grove/Temple/Sanctum + Biome Terrain + Runic Craters
       ======================================================================== */
    if (tileSpec.spawnRoomArchitecture === 'elemental_sanctuary') {
      // 12-vertex jagged elemental rock cliff ring
      const rockOuterPts = Array.from({ length: 16 })
        .map((_, i) => {
          const a = (i * 22.5 * Math.PI) / 180;
          const rad = i % 2 === 0 ? 256 : 242;
          return `${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`;
        })
        .join(' ');

      const rockInnerPts = Array.from({ length: 16 })
        .map((_, i) => {
          const a = (i * 22.5 * Math.PI) / 180;
          const rad = i % 2 === 0 ? 206 : 196;
          return `${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`;
        })
        .join(' ');

      return (
        <g
          key={`yard-${color}`}
          data-testid={`spawn-room-${color}`}
          data-spawn-architecture={tileSpec.spawnRoomArchitecture}
        >
          {/* Dark Elemental Basalt / Canyon Bedrock */}
          <rect
            x={region.x}
            y={region.y}
            width={region.size}
            height={region.size}
            fill="#070A12"
          />

          {/* Chiseled Elemental Cliff Housing */}
          <rect
            x={bx0}
            y={by0}
            width={bx1 - bx0}
            height={by1 - by0}
            rx={18}
            fill={`url(#territory-housing-${color})`}
            stroke={palette.lightMetal}
            strokeWidth={3}
          />

          {/* Element-Specific Corner Biome Formations (Magma Vents / Emerald Crystals / Solar Obelisks / Ice Spires) */}
          {[
            { px: region.x + 66, py: region.y + 66 },
            { px: region.x + region.size - 66, py: region.y + 66 },
            { px: region.x + 66, py: region.y + region.size - 66 },
            {
              px: region.x + region.size - 66,
              py: region.y + region.size - 66,
            },
          ].map((node, idx) => (
            <g
              key={`elem-corner-${idx}`}
              transform={`translate(${node.px}, ${node.py})`}
            >
              <circle cx={2} cy={5} r={28} fill="rgba(0,0,0,0.8)" />
              {color === 'red' ? (
                /* Fire: Volcanic magma crater vent */
                <g>
                  <polygon
                    points="-24,-10 -10,-26 12,-24 26,-8 22,16 4,26 -18,22"
                    fill="#1E1B18"
                    stroke="#F97316"
                    strokeWidth={2}
                  />
                  <circle cx={0} cy={0} r={13} fill="#EF4444" />
                  <circle cx={0} cy={0} r={7} fill="#FEF08A" />
                </g>
              ) : color === 'green' ? (
                /* Earth: Glowing emerald crystal cluster & boulder */
                <g>
                  <polygon
                    points="0,-28 14,-8 8,22 -12,22 -16,-6"
                    fill="#10B981"
                    stroke="#A7F3D0"
                    strokeWidth={2}
                  />
                  <polygon
                    points="-18,-14 -2,-2 4,20 -22,12"
                    fill="#059669"
                    stroke="#6EE7B7"
                    strokeWidth={1.6}
                  />
                </g>
              ) : color === 'yellow' ? (
                /* Air/Sun: Floating golden sun crystal & wind ring */
                <g>
                  <circle
                    cx={0}
                    cy={0}
                    r={22}
                    fill="none"
                    stroke="#FDE68A"
                    strokeWidth={2}
                    strokeDasharray="10 6"
                  />
                  <polygon
                    points="0,-24 16,0 0,24 -16,0"
                    fill="#F59E0B"
                    stroke="#FEF08A"
                    strokeWidth={2}
                  />
                </g>
              ) : (
                /* Water/Ice: Crystalline glacial ice spire */
                <g>
                  <polygon
                    points="0,-28 12,-12 24,0 12,12 0,28 -12,12 -24,0 -12,-12"
                    fill="#38BDF8"
                    stroke="#E0F2FE"
                    strokeWidth={2}
                  />
                  <circle cx={0} cy={0} r={8} fill="#FFFFFF" />
                </g>
              )}
            </g>
          ))}

          {/* Active Turn Pulse Ring */}
          {isCurrentTurn && (
            <circle
              cx={cx}
              cy={cy}
              r={264}
              fill="none"
              stroke={palette.specHighlight}
              strokeWidth={7}
              className="animate-turn-yard-ring"
              data-testid="turn-yard-pulse-ring"
            />
          )}

          {/* Jagged Chiseled Rock Sanctuary Rim */}
          <polygon
            points={rockOuterPts}
            transform="translate(4, 14)"
            fill="rgba(0, 0, 0, 0.88)"
          />
          <polygon
            points={rockOuterPts}
            fill="url(#tile-elemental-stone)"
            stroke={palette.lightMetal}
            strokeWidth={4}
          />

          {/* Inner Elemental Sanctum Floor */}
          <polygon
            points={rockInnerPts}
            fill={`url(#arena-deck-${color})`}
            stroke={palette.specHighlight}
            strokeWidth={3}
          />

          {/* Element-Specific Floor Energy Veins (Lava Cracks / Earth Roots / Solar Rays / Water Ripples) */}
          <g transform={`translate(${cx}, ${cy})`}>
            {color === 'red' && (
              <g
                stroke="#F97316"
                strokeWidth={3}
                fill="none"
                opacity={0.75}
                strokeLinecap="round"
              >
                <path d="M -175 0 L -75 -18 L 0 0 L 82 22 L 175 0" />
                <path d="M 0 -175 L 18 -72 L 0 0 L -24 85 L 0 175" />
                <circle
                  cx={0}
                  cy={0}
                  r={34}
                  fill="#EF4444"
                  stroke="#FEF08A"
                  strokeWidth={2.5}
                />
              </g>
            )}
            {color === 'green' && (
              <g
                stroke="#34D399"
                strokeWidth={2.8}
                fill="none"
                opacity={0.7}
              >
                <circle cx={0} cy={0} r={148} strokeDasharray="18 10" />
                <polygon
                  points="0,-46 18,-14 46,0 18,14 0,46 -18,14 -46,0 -18,-14"
                  fill="#065F46"
                  stroke="#A7F3D0"
                  strokeWidth={2}
                />
              </g>
            )}
            {color === 'yellow' && (
              <g stroke="#FDE68A" strokeWidth={2.4} fill="none" opacity={0.75}>
                <circle cx={0} cy={0} r={145} />
                <polygon
                  points="0,-52 15,-15 52,0 15,15 0,52 -15,15 -52,0 -15,-15"
                  fill="#D97706"
                  stroke="#FEF08A"
                  strokeWidth={2}
                />
              </g>
            )}
            {color === 'blue' && (
              <g stroke="#7DD3FC" strokeWidth={2.4} fill="none" opacity={0.75}>
                <circle cx={0} cy={0} r={155} strokeDasharray="24 12" />
                <circle cx={0} cy={0} r={115} strokeDasharray="16 10" />
                <circle
                  cx={0}
                  cy={0}
                  r={36}
                  fill="#0284C7"
                  stroke="#E0F2FE"
                  strokeWidth={2.5}
                />
              </g>
            )}
          </g>

          {/* 4 Chiseled Runic Crater Token Sockets (`runic_crater`) */}
          {slots.map((slotCoord, idx) => {
            const slot = gridCoordToSvgPoint(slotCoord);
            const craterPts = Array.from({ length: 10 })
              .map((_, i) => {
                const a = (i * 36 * Math.PI) / 180;
                const r = i % 2 === 0 ? 55 : 49;
                return `${slot.x + Math.cos(a) * r},${
                  slot.y + Math.sin(a) * r
                }`;
              })
              .join(' ');

            return (
              <g
                key={`slot-${color}-${idx}`}
                data-socket-style={tileSpec.socketStyle}
              >
                <polygon
                  points={craterPts}
                  transform="translate(2, 6)"
                  fill="rgba(0, 0, 0, 0.85)"
                />
                <polygon
                  points={craterPts}
                  fill="url(#tile-elemental-stone)"
                  stroke={palette.lightMetal}
                  strokeWidth={2.8}
                />
                <circle
                  cx={slot.x}
                  cy={slot.y}
                  r={38}
                  fill="#090D1A"
                  stroke={palette.specHighlight}
                  strokeWidth={2.5}
                />
                <circle
                  cx={slot.x}
                  cy={slot.y}
                  r={26}
                  fill={`url(#pawn-head-${color})`}
                  opacity={0.75}
                />
              </g>
            );
          })}

          {/* Chiseled Runic Stone Tablet Nameplate */}
          <g transform={`translate(${cx}, ${cy + 226})`}>
            <polygon
              points="-116,0 -102,-15 102,-15 116,0 102,15 -102,15"
              fill="#1E293B"
              stroke={palette.specHighlight}
              strokeWidth={2.4}
            />
            <text
              x={0}
              y={1}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#F8FAFC"
              fontSize="12"
              fontWeight="900"
              letterSpacing="0.15em"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              {territoryTitle}
            </text>
          </g>
        </g>
      );
    }

    /* ========================================================================
       SPAWN ROOM 5: NATURE / FOREST (`woodland_glade`)
       Carved Timber Clearing + Lush Corner Tree Canopies + Lanterns + Mossy Tree-Stump Sockets
       ======================================================================== */
    if (tileSpec.spawnRoomArchitecture === 'woodland_glade') {
      return (
        <g
          key={`yard-${color}`}
          data-testid={`spawn-room-${color}`}
          data-spawn-architecture={tileSpec.spawnRoomArchitecture}
        >
          {/* Deep Forest Timber & Moss Outer Frame */}
          <rect
            x={region.x}
            y={region.y}
            width={region.size}
            height={region.size}
            fill="#142615"
          />

          {/* Warm Carved Wood-Plank Courtyard Base */}
          <rect
            x={bx0}
            y={by0}
            width={bx1 - bx0}
            height={by1 - by0}
            rx={22}
            fill="url(#tile-nature-wood)"
            stroke="#5C3A1B"
            strokeWidth={5}
          />

          {/* Horizontal Timber Plank Seams across the Courtyard */}
          {[110, 200, 300, 400, 490].map((offsetY, i) => (
            <line
              key={`plank-${i}`}
              x1={bx0 + 8}
              y1={region.y + offsetY}
              x2={bx1 - 8}
              y2={region.y + offsetY}
              stroke="rgba(68, 38, 12, 0.35)"
              strokeWidth={2.5}
            />
          ))}

          {/* Active Turn Pulse Ring */}
          {isCurrentTurn && (
            <circle
              cx={cx}
              cy={cy}
              r={262}
              fill="none"
              stroke={palette.specHighlight}
              strokeWidth={7}
              className="animate-turn-yard-ring"
              data-testid="turn-yard-pulse-ring"
            />
          )}

          {/* Circular Carved Timber Log Palisade Shadow */}
          <ellipse
            cx={cx + 4}
            cy={cy + 16}
            rx={246}
            ry={242}
            fill="rgba(0, 0, 0, 0.75)"
          />

          {/* Outer Carved Timber Log Ring */}
          <circle
            cx={cx}
            cy={cy}
            r={242}
            fill="#6D4522"
            stroke="#3E240E"
            strokeWidth={6}
          />

          {/* 16 Interlocking Timber Log Segments & Moss Tufts around the Glade Ring */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = i * 22.5;
            return (
              <g
                key={`log-${i}`}
                transform={`translate(${cx}, ${cy}) rotate(${angle})`}
              >
                <rect
                  x={-14}
                  y={-242}
                  width={28}
                  height={24}
                  rx={6}
                  fill={i % 2 === 0 ? '#8C582B' : '#734620'}
                  stroke="#3E240E"
                  strokeWidth={1.8}
                />
                {i % 3 === 0 && (
                  <circle cx={8} cy={-224} r={7} fill="#22C55E" opacity={0.85} />
                )}
              </g>
            );
          })}

          {/* Inner Colored Woodland Glade Floor */}
          <circle
            cx={cx}
            cy={cy}
            r={212}
            fill={`url(#arena-deck-${color})`}
            stroke="#D9A066"
            strokeWidth={4}
          />

          {/* Concentric Tree-Ring Engravings & Central Botanical Lotus */}
          <circle
            cx={cx}
            cy={cy}
            r={165}
            fill="none"
            stroke={palette.trimLight}
            strokeWidth={1.8}
            strokeDasharray="22 10"
            opacity={0.45}
          />
          <g transform={`translate(${cx}, ${cy})`} opacity={0.75}>
            {Array.from({ length: 8 }).map((_, i) => (
              <path
                key={`petal-${i}`}
                d="M 0 0 C -10 -18 -8 -38 0 -48 C 8 -38 10 -18 0 0 Z"
                fill="#22C55E"
                stroke="#BBF7D0"
                strokeWidth={1.2}
                transform={`rotate(${i * 45})`}
              />
            ))}
            <circle cx={0} cy={0} r={12} fill="#FDE047" stroke="#78350F" strokeWidth={2} />
          </g>

          {/* 4 Mossy Tree-Stump Token Sockets (`mossy_timber_stump`) */}
          {slots.map((slotCoord, idx) => {
            const slot = gridCoordToSvgPoint(slotCoord);
            return (
              <g
                key={`slot-${color}-${idx}`}
                data-socket-style={tileSpec.socketStyle}
              >
                <circle
                  cx={slot.x + 3}
                  cy={slot.y + 6}
                  r={55}
                  fill="rgba(0, 0, 0, 0.72)"
                />
                {/* Outer rough bark tree-stump rim */}
                <circle
                  cx={slot.x}
                  cy={slot.y}
                  r={53}
                  fill="#5C3A1B"
                  stroke="#2E1A08"
                  strokeWidth={3}
                />
                {/* Warm cut-wood growth ring surface */}
                <circle
                  cx={slot.x}
                  cy={slot.y}
                  r={44}
                  fill="url(#tile-nature-wood)"
                  stroke="#784922"
                  strokeWidth={2}
                />
                {/* Recessed colored moss hollow for the token */}
                <circle
                  cx={slot.x}
                  cy={slot.y}
                  r={33}
                  fill={palette.deepMetal}
                  stroke={palette.specHighlight}
                  strokeWidth={2}
                />
                {/* Corner moss tufts on each tree stump */}
                <circle
                  cx={slot.x - 36}
                  cy={slot.y - 24}
                  r={7}
                  fill="#22C55E"
                />
                <circle
                  cx={slot.x - 28}
                  cy={slot.y - 33}
                  r={5}
                  fill="#86EFAC"
                />
                <circle
                  cx={slot.x + 34}
                  cy={slot.y + 26}
                  r={6.5}
                  fill="#16A34A"
                />
              </g>
            );
          })}

          {/* Lush Multi-Layered 3D Corner Tree Canopies & Glowing Forest Lanterns */}
          {[
            { px: region.x + 68, py: region.y + 68, lx: 34, ly: 28 },
            {
              px: region.x + region.size - 68,
              py: region.y + 68,
              lx: -34,
              ly: 28,
            },
            {
              px: region.x + 68,
              py: region.y + region.size - 68,
              lx: 34,
              ly: -28,
            },
            {
              px: region.x + region.size - 68,
              py: region.y + region.size - 68,
              lx: -34,
              ly: -28,
            },
          ].map((tree, idx) => (
            <g
              key={`tree-${idx}`}
              transform={`translate(${tree.px}, ${tree.py})`}
            >
              {/* Tree canopy cast shadow */}
              <circle cx={4} cy={8} r={44} fill="rgba(0,0,0,0.65)" />
              {/* Deep forest base foliage */}
              <circle
                cx={0}
                cy={0}
                r={40}
                fill="#14532D"
                stroke="#052E16"
                strokeWidth={2}
              />
              <circle cx={-16} cy={-12} r={26} fill="#15803D" />
              <circle cx={16} cy={-10} r={24} fill="#16A34A" />
              <circle cx={0} cy={14} r={25} fill="#15803D" />
              {/* Sunlit top leaf clusters */}
              <circle cx={-8} cy={-14} r={16} fill="#22C55E" />
              <circle cx={10} cy={-6} r={14} fill="#4ADE80" />
              <circle cx={-4} cy={-16} r={7} fill="#BBF7D0" opacity={0.85} />
              {/* Warm glowing forest lantern hanging beside the tree */}
              <g transform={`translate(${tree.lx}, ${tree.ly})`}>
                <circle
                  cx={0}
                  cy={0}
                  r={14}
                  fill="rgba(251, 191, 36, 0.35)"
                />
                <circle
                  cx={0}
                  cy={0}
                  r={8}
                  fill="#F59E0B"
                  stroke="#FEF08A"
                  strokeWidth={2}
                />
                <circle cx={0} cy={0} r={3.5} fill="#FFFFFF" />
              </g>
            </g>
          ))}

          {/* Carved Woodland Timber Nameplate */}
          <g transform={`translate(${cx}, ${cy + 226})`}>
            <rect
              x={-108}
              y={-15}
              width={216}
              height={30}
              rx={10}
              fill="#3E240E"
              stroke="#D9A066"
              strokeWidth={2.5}
            />
            <circle cx={-94} cy={0} r={4} fill="#4ADE80" />
            <circle cx={94} cy={0} r={4} fill="#4ADE80" />
            <text
              x={0}
              y={1}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#FEF3C7"
              fontSize="12.5"
              fontWeight="900"
              letterSpacing="0.15em"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              {territoryTitle}
            </text>
          </g>
        </g>
      );
    }

    /* ========================================================================
       SPAWN ROOM 1: COSMIC GALAXY (`orbital_reactor` — Primary Hero Art Direction)
       3D Multi-Tiered Orbital Reactor Amphitheater + Ringed Planets + Gravity Wells
       ======================================================================== */
    return (
      <g
        key={`yard-${color}`}
        data-testid={`spawn-room-${color}`}
        data-spawn-architecture={tileSpec.spawnRoomArchitecture}
      >
        <rect
          x={region.x}
          y={region.y}
          width={region.size}
          height={region.size}
          fill="#020308"
        />
        <polygon
          points={`${x0},${y0} ${x1},${y0} ${bx1},${by0} ${bx0},${by0}`}
          fill={palette.lightMetal}
          opacity={0.65}
        />
        <polygon
          points={`${x0},${y0} ${bx0},${by0} ${bx0},${by1} ${x0},${y1}`}
          fill={palette.midMetal}
          opacity={0.55}
        />
        <polygon
          points={`${x1},${y0} ${x1},${y1} ${bx1},${by1} ${bx1},${by0}`}
          fill={palette.deepMetal}
          opacity={0.85}
        />
        <polygon
          points={`${x0},${y1} ${bx0},${by1} ${bx1},${by1} ${x1},${y1}`}
          fill={palette.abyssMetal}
        />

        <rect
          x={bx0}
          y={by0}
          width={bx1 - bx0}
          height={by1 - by0}
          rx={16}
          fill={`url(#territory-housing-${color})`}
          stroke={palette.trimLight}
          strokeWidth={2}
        />

        <circle
          cx={cx}
          cy={cy}
          r={275}
          fill={`url(#territory-nebula-${color})`}
          opacity={0.65}
        />

        {[
          { px: region.x + 62, py: region.y + 62, r: 22, hasRing: true },
          {
            px: region.x + region.size - 62,
            py: region.y + 62,
            r: 16,
            hasRing: false,
          },
          {
            px: region.x + 62,
            py: region.y + region.size - 62,
            r: 16,
            hasRing: false,
          },
          {
            px: region.x + region.size - 62,
            py: region.y + region.size - 62,
            r: 20,
            hasRing: true,
          },
        ].map((planet, idx) => (
          <g
            key={`planet-${idx}`}
            transform={`translate(${planet.px}, ${planet.py})`}
          >
            <circle cx={3} cy={5} r={planet.r} fill="rgba(0,0,0,0.75)" />
            <circle
              cx={0}
              cy={0}
              r={planet.r}
              fill={`url(#pawn-head-${color})`}
              stroke={palette.trimLight}
              strokeWidth={1}
            />
            {planet.hasRing && (
              <ellipse
                cx={0}
                cy={0}
                rx={planet.r * 1.55}
                ry={planet.r * 0.42}
                transform="rotate(-24)"
                fill="none"
                stroke={palette.trimLight}
                strokeWidth={2.2}
                opacity={0.8}
              />
            )}
            <circle
              cx={-planet.r * 0.32}
              cy={-planet.r * 0.32}
              r={planet.r * 0.22}
              fill="#FFFFFF"
              opacity={0.75}
            />
          </g>
        ))}

        {isCurrentTurn && (
          <circle
            cx={cx}
            cy={cy}
            r={266}
            fill="none"
            stroke={palette.lightMetal}
            strokeWidth={7}
            className="animate-turn-yard-ring"
            data-testid="turn-yard-pulse-ring"
          />
        )}

        <ellipse
          cx={cx + 4}
          cy={cy + 20}
          rx={258}
          ry={254}
          fill="rgba(0, 0, 0, 0.88)"
        />

        <path
          d={`M ${cx - 252} ${cy} L ${cx - 252} ${
            cy + 18
          } A 252 248 0 0 0 ${cx + 252} ${cy + 18} L ${cx + 252} ${cy} Z`}
          fill={`url(#pedestal-wall-${color})`}
          stroke="#020308"
          strokeWidth={2}
        />

        <circle
          cx={cx}
          cy={cy}
          r={252}
          fill={`url(#arena-rim-${color})`}
          stroke={palette.trimLight}
          strokeWidth={2.8}
        />

        <path
          d={`M ${cx - 218} ${cy - 118} A 248 248 0 0 1 ${cx + 140} ${
            cy - 204
          }`}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.72}
        />

        <circle
          cx={cx}
          cy={cy}
          r={234}
          fill="none"
          stroke={palette.trimMid}
          strokeWidth={3.5}
          opacity={0.9}
        />

        <circle
          cx={cx}
          cy={cy}
          r={226}
          fill={`url(#arena-pit-${color})`}
          stroke="#010206"
          strokeWidth={6}
        />

        <circle
          cx={cx}
          cy={cy}
          r={210}
          fill="none"
          stroke={palette.lightMetal}
          strokeWidth={4}
          opacity={0.55}
        />
        <circle
          cx={cx}
          cy={cy}
          r={210}
          fill="none"
          stroke={palette.specHighlight}
          strokeWidth={1.5}
          strokeDasharray="28 14"
          opacity={0.85}
        />

        {Array.from({ length: 12 }).map((_, i) => {
          const angle = i * 30;
          return (
            <g key={i} transform={`translate(${cx}, ${cy}) rotate(${angle})`}>
              <rect
                x={-5}
                y={-225}
                width={10}
                height={32}
                rx={2.5}
                fill={i % 2 === 0 ? palette.trimLight : palette.midMetal}
                stroke="#02040A"
                strokeWidth={1.2}
                opacity={0.88}
              />
            </g>
          );
        })}

        <path
          d={`M ${cx - 192} ${cy} L ${cx - 192} ${
            cy + 11
          } A 192 188 0 0 0 ${cx + 192} ${cy + 11} L ${cx + 192} ${cy} Z`}
          fill={`url(#pedestal-wall-${color})`}
        />
        <circle
          cx={cx}
          cy={cy}
          r={192}
          fill={`url(#arena-deck-${color})`}
          stroke={palette.trimLight}
          strokeWidth={2.4}
        />

        <circle
          cx={cx}
          cy={cy}
          r={142}
          fill="none"
          stroke={palette.trimLight}
          strokeWidth={1.2}
          strokeDasharray="10 8"
          opacity={0.38}
        />
        <path
          d={`M ${cx} ${cy - 32} Q ${cx + 4} ${cy - 4} ${cx + 32} ${cy} Q ${
            cx + 4
          } ${cy + 4} ${cx} ${cy + 32} Q ${cx - 4} ${cy + 4} ${
            cx - 32
          } ${cy} Q ${cx - 4} ${cy - 4} ${cx} ${cy - 32} Z`}
          fill={palette.trimLight}
          opacity={0.28}
        />

        <path
          d={`M ${cx - 162} ${cy - 92} A 188 188 0 0 1 ${cx + 105} ${
            cy - 154
          }`}
          fill="none"
          stroke={palette.specHighlight}
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.62}
        />

        {slots.map((slotCoord, idx) => {
          const slot = gridCoordToSvgPoint(slotCoord);
          return (
            <g
              key={`slot-${color}-${idx}`}
              data-socket-style={tileSpec.socketStyle}
            >
              <circle
                cx={slot.x + 2}
                cy={slot.y + 5}
                r={56}
                fill="rgba(0, 0, 0, 0.78)"
              />
              <circle
                cx={slot.x}
                cy={slot.y}
                r={54}
                fill={`url(#arena-rim-${color})`}
                stroke={palette.trimLight}
                strokeWidth={2.2}
              />
              <circle
                cx={slot.x}
                cy={slot.y}
                r={44}
                fill="url(#socket-concave-well)"
                stroke="#010207"
                strokeWidth={3.5}
              />
              <path
                d={`M ${slot.x - 41} ${slot.y + 6} A 42 42 0 1 1 ${
                  slot.x + 41
                } ${slot.y + 6} A 44 34 0 1 0 ${slot.x - 41} ${slot.y + 6} Z`}
                fill="rgba(0, 0, 0, 0.82)"
              />
              <path
                d={`M ${slot.x - 34} ${slot.y + 24} A 42 42 0 0 0 ${
                  slot.x + 34
                } ${slot.y + 24}`}
                fill="none"
                stroke={palette.specHighlight}
                strokeWidth={2.8}
                strokeLinecap="round"
                opacity={0.85}
              />
              <circle
                cx={slot.x}
                cy={slot.y + 2}
                r={33}
                fill={palette.arenaFloorDark}
                stroke={palette.lightMetal}
                strokeWidth={1.8}
              />
              <circle
                cx={slot.x}
                cy={slot.y + 2}
                r={24}
                fill={`url(#pawn-body-${color})`}
                opacity={0.5}
              />
            </g>
          );
        })}

        <g transform={`translate(${cx}, ${cy + 224})`}>
          <rect
            x={-102}
            y={-12}
            width={204}
            height={28}
            rx={14}
            fill="rgba(0, 0, 0, 0.8)"
          />
          <rect
            x={-102}
            y={-15}
            width={204}
            height={27}
            rx={13.5}
            fill="rgba(4, 7, 20, 0.95)"
            stroke={palette.trimLight}
            strokeWidth={1.8}
          />
          <text
            x={0}
            y={2.5}
            textAnchor="middle"
            fill={palette.specHighlight}
            fontSize="12.5"
            fontWeight="800"
            letterSpacing="0.15em"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            {territoryTitle}
          </text>
        </g>
      </g>
    );
  };

  /**
   * Renders the Massive 3D Central Black Hole & Relativistic Accretion Vortex
   */
  const renderCenterpiece = () => {
    return (
      <g>
        <rect
          x={600}
          y={600}
          width={300}
          height={300}
          fill="#02030A"
          stroke="#1E293B"
          strokeWidth={3}
        />

        {PLAYER_COLORS.map((color) => {
          const palette = METALLIC_PAWN_PALETTE[color];
          return (
            <g key={`home-tri-${color}`}>
              <polygon
                points={HOME_TRIANGLES[color]}
                fill={`url(#home-bay-${color})`}
                stroke={palette.trimLight}
                strokeWidth={2}
                strokeLinejoin="round"
              />
              <polygon
                points={HOME_TRIANGLES[color]}
                fill="none"
                stroke="rgba(0, 0, 0, 0.72)"
                strokeWidth={8}
                opacity={0.65}
              />
            </g>
          );
        })}

        <line
          x1={600}
          y1={600}
          x2={900}
          y2={900}
          stroke="#02040A"
          strokeWidth={8}
        />
        <line
          x1={600}
          y1={600}
          x2={900}
          y2={900}
          stroke="#94A3B8"
          strokeWidth={2.5}
          opacity={0.65}
        />
        <line
          x1={900}
          y1={600}
          x2={600}
          y2={900}
          stroke="#02040A"
          strokeWidth={8}
        />
        <line
          x1={900}
          y1={600}
          x2={600}
          y2={900}
          stroke="#94A3B8"
          strokeWidth={2.5}
          opacity={0.65}
        />

        <g transform="translate(750, 750)">
          <circle cx={3} cy={9} r={138} fill="rgba(0, 0, 0, 0.88)" />
          <circle
            cx={0}
            cy={0}
            r={134}
            fill="url(#reactor-housing-metal)"
            stroke="#64748B"
            strokeWidth={3}
          />
          <path
            d="M -114 -68 A 132 132 0 0 1 78 -108"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={3.5}
            strokeLinecap="round"
            opacity={0.75}
          />

          {[
            { rot: 180, color: '#FB7185' },
            { rot: 270, color: '#34D399' },
            { rot: 0, color: '#FBBF24' },
            { rot: 90, color: '#38BDF8' },
          ].map((intake, idx) => (
            <g key={idx} transform={`rotate(${intake.rot})`}>
              <rect
                x={114}
                y={-14}
                width={20}
                height={28}
                rx={4}
                fill="#090D1E"
                stroke={intake.color}
                strokeWidth={2.2}
              />
              <rect
                x={118}
                y={-7}
                width={12}
                height={14}
                rx={2}
                fill={intake.color}
                opacity={0.85}
              />
            </g>
          ))}

          {Array.from({ length: 12 }).map((_, i) => {
            if (i % 3 === 0) return null;
            const angle = (i * 30 * Math.PI) / 180;
            const bx = Math.cos(angle) * 124;
            const by = Math.sin(angle) * 124;
            return (
              <circle
                key={i}
                cx={bx}
                cy={by}
                r={3.8}
                fill="#CBD5E1"
                stroke="#020617"
                strokeWidth={1.5}
              />
            );
          })}

          <circle
            cx={0}
            cy={0}
            r={114}
            fill="#010207"
            stroke="rgba(226, 232, 240, 0.35)"
            strokeWidth={2.4}
          />

          {effectiveThemeId === 'royal_classic' ? (
            <g>
              <circle
                cx={0}
                cy={0}
                r={108}
                fill="url(#royal-center-pedestal)"
                stroke="#F59E0B"
                strokeWidth={3}
              />
              <circle
                cx={0}
                cy={0}
                r={92}
                fill="none"
                stroke="#FDE68A"
                strokeWidth={1.6}
                strokeDasharray="10 6"
              />
              <path
                d="M -52 30 L -64 -26 L -28 4 L 0 -46 L 28 4 L 64 -26 L 52 30 Z"
                fill="url(#pawn-body-yellow)"
                stroke="#FEF08A"
                strokeWidth={2.6}
                strokeLinejoin="round"
              />
              <rect
                x={-52}
                y={30}
                width={104}
                height={16}
                rx={5}
                fill="#B45309"
                stroke="#FDE68A"
                strokeWidth={2}
              />
              <circle cx={-64} cy={-30} r={6.5} fill="#FEF08A" />
              <circle cx={0} cy={-51} r={9} fill="#FFFFFF" />
              <circle cx={64} cy={-30} r={6.5} fill="#FEF08A" />
            </g>
          ) : effectiveThemeId === 'elemental_realms' ? (
            <g>
              <circle
                cx={0}
                cy={0}
                r={108}
                fill="#070B14"
                stroke="#94A3B8"
                strokeWidth={2.5}
              />
              <g className={reducedMotion ? '' : 'animate-orbit-cw'}>
                <circle
                  cx={0}
                  cy={0}
                  r={92}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth={2.2}
                  strokeDasharray="18 10"
                />
                <circle cx={-38} cy={-38} r={28} fill="url(#pawn-head-red)" />
                <circle cx={38} cy={-38} r={28} fill="url(#pawn-head-green)" />
                <circle cx={38} cy={38} r={28} fill="url(#pawn-head-yellow)" />
                <circle cx={-38} cy={38} r={28} fill="url(#pawn-head-blue)" />
              </g>
              <circle
                cx={0}
                cy={0}
                r={22}
                fill="#0F172A"
                stroke="#F8FAFC"
                strokeWidth={2.5}
              />
              <circle cx={0} cy={0} r={10} fill="#38BDF8" />
            </g>
          ) : effectiveThemeId === 'neon_tech' ? (
            <g>
              <circle
                cx={0}
                cy={0}
                r={108}
                fill="#030712"
                stroke="#00F0FF"
                strokeWidth={2.5}
              />
              <g className={reducedMotion ? '' : 'animate-orbit-ccw'}>
                <circle
                  cx={0}
                  cy={0}
                  r={92}
                  fill="none"
                  stroke="#A855F7"
                  strokeWidth={2.2}
                  strokeDasharray="24 12"
                />
              </g>
              <polygon
                points="0,-64 56,-32 0,0 -56,-32"
                fill="#1E293B"
                stroke="#00F0FF"
                strokeWidth={2.5}
              />
              <polygon
                points="-56,-32 0,0 0,64 -56,32"
                fill="#0F172A"
                stroke="#38BDF8"
                strokeWidth={2.5}
              />
              <polygon
                points="56,-32 0,0 0,64 56,32"
                fill="#090D1A"
                stroke="#A855F7"
                strokeWidth={2.5}
              />
              <circle
                cx={0}
                cy={0}
                r={13}
                fill="#00F0FF"
                className={reducedMotion ? '' : 'animate-photon-pulse'}
              />
            </g>
          ) : effectiveThemeId === 'nature_forest' ? (
            <g>
              <circle
                cx={0}
                cy={0}
                r={108}
                fill="#0D1F12"
                stroke="#8D6E63"
                strokeWidth={3}
              />
              <circle
                cx={0}
                cy={0}
                r={92}
                fill="none"
                stroke="#4ADE80"
                strokeWidth={1.8}
                strokeDasharray="12 6"
              />
              <path
                d="M -24 54 Q -8 20 -10 -8 Q -34 -14 -46 -32 Q 0 -70 46 -32 Q 34 -14 10 -8 Q 8 20 24 54 Z"
                fill="#78350F"
                stroke="#FBBF24"
                strokeWidth={2.2}
              />
              <circle cx={0} cy={-30} r={38} fill="#15803D" />
              <circle cx={-28} cy={-16} r={26} fill="#16A34A" />
              <circle cx={28} cy={-16} r={26} fill="#16A34A" />
              <circle cx={0} cy={-38} r={24} fill="#4ADE80" opacity={0.85} />
            </g>
          ) : effectiveThemeId === 'minimal_3d' ? (
            <g>
              <circle
                cx={0}
                cy={0}
                r={108}
                fill="#F1F5F9"
                stroke="#CBD5E1"
                strokeWidth={3}
              />
              <polygon
                points="0,-54 48,-26 0,2 -48,-26"
                fill="#FFFFFF"
                stroke="#94A3B8"
                strokeWidth={2.2}
              />
              <polygon
                points="-48,-26 0,2 0,56 -48,28"
                fill="#E2E8F0"
                stroke="#94A3B8"
                strokeWidth={2.2}
              />
              <polygon
                points="48,-26 0,2 0,56 48,28"
                fill="#CBD5E1"
                stroke="#94A3B8"
                strokeWidth={2.2}
              />
              <circle cx={0} cy={-26} r={6.5} fill="#EF4444" />
              <circle cx={-22} cy={14} r={5} fill="#0F172A" />
              <circle cx={22} cy={6} r={5} fill="#0F172A" />
              <circle cx={22} cy={26} r={5} fill="#0F172A" />
            </g>
          ) : (
            <g>
              <circle cx={0} cy={0} r={112} fill="url(#blackhole-void-well)" />
              <circle
                cx={0}
                cy={0}
                r={108}
                fill="url(#blackhole-accretion-halo)"
              />
              <g className={reducedMotion ? '' : 'animate-orbit-cw'}>
                <path
                  d="M -96 -28 C -68 -92, 28 -104, 88 -42 C 108 -18, 92 48, 42 74 C -12 98, -68 62, -52 12"
                  fill="none"
                  stroke="url(#accretion-stream-warm)"
                  strokeWidth={14}
                  strokeLinecap="round"
                  opacity={0.9}
                />
                <path
                  d="M 96 28 C 68 92, -28 104, -88 42 C -108 18, -92 -48, -42 -74 C 12 -98, 68 -62, 52 -12"
                  fill="none"
                  stroke="url(#accretion-stream-cool)"
                  strokeWidth={12}
                  strokeLinecap="round"
                  opacity={0.85}
                />
                <ellipse
                  cx={0}
                  cy={0}
                  rx={102}
                  ry={54}
                  transform="rotate(-24)"
                  fill="none"
                  stroke="url(#accretion-stream-warm)"
                  strokeWidth={11}
                  opacity={0.92}
                />
                <ellipse
                  cx={0}
                  cy={0}
                  rx={92}
                  ry={46}
                  transform="rotate(-24)"
                  fill="none"
                  stroke="#FEF08A"
                  strokeWidth={3.5}
                  strokeDasharray="65 35"
                  opacity={0.95}
                />
                <circle cx={-82} cy={-28} r={3.8} fill="#FFFFFF" />
                <circle cx={78} cy={32} r={3.4} fill="#FEF08A" />
                <circle cx={28} cy={-72} r={3} fill="#38BDF8" />
                <circle cx={-34} cy={68} r={3.2} fill="#F472B6" />
              </g>
              <g className={reducedMotion ? '' : 'animate-orbit-ccw'}>
                <ellipse
                  cx={0}
                  cy={0}
                  rx={76}
                  ry={62}
                  transform="rotate(18)"
                  fill="none"
                  stroke="url(#accretion-stream-warm)"
                  strokeWidth={7}
                  strokeDasharray="58 26 42 20"
                  opacity={0.92}
                />
                <ellipse
                  cx={0}
                  cy={0}
                  rx={66}
                  ry={52}
                  transform="rotate(-38)"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth={4}
                  strokeDasharray="38 24"
                  opacity={0.85}
                />
                <circle cx={56} cy={-22} r={2.8} fill="#FFFFFF" />
                <circle cx={-54} cy={24} r={2.8} fill="#67E8F9" />
              </g>
              <g className={reducedMotion ? '' : 'animate-photon-pulse'}>
                <circle
                  cx={0}
                  cy={0}
                  r={54}
                  fill="none"
                  stroke="#EA580C"
                  strokeWidth={8}
                  opacity={0.62}
                />
                <circle
                  cx={0}
                  cy={0}
                  r={49}
                  fill="none"
                  stroke="#FBBF24"
                  strokeWidth={4.5}
                  opacity={0.92}
                />
                <circle
                  cx={0}
                  cy={0}
                  r={46}
                  fill="none"
                  stroke="#FEF9C3"
                  strokeWidth={2.2}
                />
                <path
                  d="M -46 -14 A 48 30 0 0 1 46 -14"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={3.2}
                  strokeLinecap="round"
                  opacity={0.95}
                />
                <path
                  d="M -42 18 A 45 26 0 0 0 42 18"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  opacity={0.88}
                />
              </g>
              <circle
                cx={0}
                cy={0}
                r={43}
                fill="url(#event-horizon-core)"
                stroke="#000000"
                strokeWidth={2.5}
              />
              <path
                d="M -36 -18 A 40 40 0 0 1 28 -28"
                fill="none"
                stroke="rgba(254, 240, 138, 0.55)"
                strokeWidth={1.6}
                strokeLinecap="round"
              />
            </g>
          )}
        </g>
      </g>
    );
  };

  /**
   * Renders a Tall, Sculptural 3D Lathe-Turned Glossy/Metallic Pawn Game Piece
   * with an Engraved 3D Token Number Medallion (`1`, `2`, `3`, `4`) so the player
   * always knows which token is which.
   */
  const render3DMetallicPawn = (
    color: PlayerColor,
    isLegal: boolean,
    tokenNumber: number,
    tokenId: string
  ) => {
    const palette = METALLIC_PAWN_PALETTE[color];

    return (
      <g>
        {/* 1. Directional Cast Shadow + Tight Ground Contact Shadow */}
        <ellipse
          cx={11}
          cy={isLegal ? 29 : 24}
          rx={isLegal ? 31 : 28}
          ry={isLegal ? 12.5 : 11}
          transform="rotate(16 11 24)"
          fill="rgba(0, 0, 0, 0.65)"
        />
        <ellipse
          cx={0}
          cy={isLegal ? 27 : 23}
          rx={isLegal ? 26 : 24.5}
          ry={isLegal ? 10.5 : 9.5}
          fill="rgba(0, 0, 0, 0.9)"
        />

        {/* 2. Thick 3D Cylindrical Pedestal Base (`y=14..24`, `rx=24`) */}
        <path
          d="M -24 17.5 L -24 22.5 A 24 8.8 0 0 0 24 22.5 L 24 17.5 Z"
          fill={`url(#pawn-base-wall-${color})`}
        />
        <ellipse
          cx={0}
          cy={17.5}
          rx={24}
          ry={8.4}
          fill={`url(#pawn-body-${color})`}
          stroke={palette.trimLight}
          strokeWidth={1.4}
        />
        <path
          d="M -19.5 14 L -19.5 17 A 19.5 6.8 0 0 0 19.5 17 L 19.5 14 Z"
          fill={palette.abyssMetal}
        />
        <ellipse
          cx={0}
          cy={14}
          rx={19.5}
          ry={6.5}
          fill={`url(#pawn-body-${color})`}
          stroke={palette.specHighlight}
          strokeWidth={1.1}
        />
        <ellipse cx={0} cy={12.5} rx={15.5} ry={5} fill={palette.deepMetal} />

        {/* 3. Sculpted Lathe-Turned S-Curve Torso (`y=-17..+13`) */}
        <path
          d="M -16 13 C -15 2, -9.2 -6, -7.5 -17.5 L 7.5 -17.5 C 9.2 -6, 15 2, 16 13 A 16 5.4 0 0 1 -16 13 Z"
          fill={`url(#pawn-body-${color})`}
          stroke={palette.abyssMetal}
          strokeWidth={0.9}
          strokeLinejoin="round"
        />

        {/* Long Curved Studio Softbox Specular Reflection on Left-Front of Torso */}
        <path
          d="M -11 11.5 C -10 1, -6.2 -6, -4.8 -16.5 L -1.5 -16.5 C -2.8 -6, -5.8 1, -6.5 12.2 Z"
          fill="url(#pawn-specular-sheen)"
        />

        {/* Secondary Right-Edge Rim Light Reflection */}
        <path
          d="M 13.5 11.5 C 12.5 1, 8 -6, 6.4 -16.5"
          fill="none"
          stroke={palette.specHighlight}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.48}
        />

        {/* Engraved Golden/Metallic Waist Inlay Ring */}
        <path
          d="M -13.2 4.5 A 13.5 4.5 0 0 0 13.2 4.5"
          fill="none"
          stroke={palette.trimLight}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.9}
        />

        {/* 4. Theme-Specific 3D Sculpted Accents */}
        {activeTokenStyle === 'cosmic_pawn' && (
          <g>
            <ellipse
              cx={0}
              cy={-2}
              rx={20}
              ry={6.2}
              transform="rotate(-15)"
              fill="none"
              stroke={palette.trimLight}
              strokeWidth={2.4}
              opacity={0.92}
            />
            <ellipse
              cx={0}
              cy={-2}
              rx={20}
              ry={6.2}
              transform="rotate(-15)"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={1}
              strokeDasharray="14 20"
              opacity={0.9}
            />
          </g>
        )}

        {activeTokenStyle === 'cyber_beacon' && (
          <ellipse
            cx={0}
            cy={-3}
            rx={13}
            ry={3.8}
            fill="none"
            stroke="#00F0FF"
            strokeWidth={2.2}
          />
        )}

        {/* 5. Sculpted 3D Metallic Neck Bolster Ring (`y=-18.5`) */}
        <path
          d="M -10.8 -18.5 L -10.8 -16 A 10.8 3.6 0 0 0 10.8 -16 L 10.8 -18.5 Z"
          fill={palette.trimDark}
        />
        <ellipse
          cx={0}
          cy={-18.5}
          rx={10.8}
          ry={3.6}
          fill={palette.trimLight}
          stroke={palette.abyssMetal}
          strokeWidth={1}
        />
        <ellipse
          cx={0}
          cy={-20.5}
          rx={9}
          ry={3}
          fill="rgba(0, 0, 0, 0.78)"
        />

        {/* 6. Large Glossy 3D Spherical Head (`cx=0, cy=-31, r=14.2`) */}
        <circle
          cx={0}
          cy={-31}
          r={14.2}
          fill={`url(#pawn-head-${color})`}
          stroke={palette.abyssMetal}
          strokeWidth={1}
        />

        <ellipse
          cx={-5.2}
          cy={-36.5}
          rx={5.2}
          ry={3}
          transform="rotate(-28 -5.2 -36.5)"
          fill="#FFFFFF"
          opacity={0.94}
        />
        <circle cx={-1.8} cy={-32.2} r={1.6} fill="#FFFFFF" opacity={0.72} />

        <path
          d="M 2.5 -18.5 A 12 12 0 0 0 12 -28.5"
          fill="none"
          stroke={palette.specHighlight}
          strokeWidth={1.8}
          strokeLinecap="round"
          opacity={0.65}
        />

        {activeTokenStyle === 'royal_spires' && (
          <path
            d="M -7 -43 L -9 -51 L -3.5 -46 L 0 -53 L 3.5 -46 L 9 -51 L 7 -43 Z"
            fill="#FDE68A"
            stroke="#92400E"
            strokeWidth={1.1}
          />
        )}

        {/* 7. 3D Engraved Token Number Medallion (`1`, `2`, `3`, `4`) on Chest */}
        <g transform="translate(0, -1)" data-testid={`token-number-${tokenId}`}>
          <circle
            cx={0}
            cy={1.4}
            r={11.8}
            fill="rgba(0, 0, 0, 0.8)"
          />
          <circle
            cx={0}
            cy={0}
            r={11.2}
            fill="#060A17"
            stroke={isLegal ? '#FFFFFF' : palette.trimLight}
            strokeWidth={isLegal ? 2.4 : 1.8}
          />
          <text
            x={0}
            y={0.8}
            textAnchor="middle"
            dominantBaseline="central"
            fill={isLegal ? '#FEF08A' : '#FFFFFF'}
            fontSize="14"
            fontWeight="900"
            className="font-mono-tabular"
          >
            {tokenNumber}
          </text>
        </g>
      </g>
    );
  };

  /**
   * Renders Ground Trajectory Paths & Target Reticle Rings beneath the tokens.
   */
  const renderMoveTrajectoriesAndReticles = () => {
    if (!showMoveHints || moveIndicators.length === 0) return null;

    return (
      <g className="pointer-events-none" data-testid="board-move-trajectories">
        {/* 1. Trajectory Paths connecting each playable token to its target square */}
        {moveIndicators.map((ind) => {
          const isHovered =
            hoveredTokenId === ind.tokenId || selectedTokenId === ind.tokenId;
          const isDimmed =
            (hoveredTokenId !== null || selectedTokenId !== null) && !isHovered;
          const palette = METALLIC_PAWN_PALETTE[ind.color];

          const startPt = gridCoordToSvgPoint(ind.fromCoord);
          const stepPts = ind.pathCoords.map((c) => gridCoordToSvgPoint(c));
          const allPts = [startPt, ...stepPts];
          const polylineStr = allPts.map((p) => `${p.x},${p.y}`).join(' ');

          const strokeColor = ind.capturesOpponent
            ? '#EF4444'
            : ind.reachesHome
            ? '#FDE047'
            : palette.specHighlight;

          return (
            <g
              key={`traj-${ind.tokenId}`}
              opacity={isDimmed ? 0.28 : isHovered ? 1 : 0.82}
              data-testid={`move-path-${ind.tokenId}`}
            >
              {/* Outer dark shadow path for high contrast on any tile */}
              <polyline
                points={polylineStr}
                fill="none"
                stroke="rgba(2, 6, 23, 0.88)"
                strokeWidth={isHovered ? 9.5 : 7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Luminous dashed trajectory line */}
              <polyline
                points={polylineStr}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isHovered ? 5.2 : 3.8}
                strokeDasharray={isHovered ? '14 8' : '10 8'}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Intermediate step breadcrumbs when hovered or single move */}
              {(isHovered || moveIndicators.length === 1) &&
                stepPts.slice(0, -1).map((pt, sIdx) => (
                  <circle
                    key={sIdx}
                    cx={pt.x}
                    cy={pt.y}
                    r={6}
                    fill={strokeColor}
                    stroke="#020617"
                    strokeWidth={1.6}
                  />
                ))}
            </g>
          );
        })}

        {/* 2. Ground Target Reticle Rings on Destination Squares */}
        {moveIndicators.map((ind) => {
          if (ind.sharedTargetIndex !== 0) return null;
          const isHovered =
            hoveredTokenId === ind.tokenId || selectedTokenId === ind.tokenId;
          const isDimmed =
            (hoveredTokenId !== null || selectedTokenId !== null) && !isHovered;
          const destPt = gridCoordToSvgPoint(ind.toCoord);
          const palette = METALLIC_PAWN_PALETTE[ind.color];

          const badgeColor = ind.capturesOpponent
            ? '#EF4444'
            : ind.reachesHome
            ? '#F59E0B'
            : COLOR_META[ind.color].primaryHex;
          const borderHex = ind.capturesOpponent
            ? '#FCA5A5'
            : ind.reachesHome
            ? '#FEF08A'
            : palette.specHighlight;

          return (
            <g
              key={`reticle-${ind.tokenId}`}
              transform={`translate(${destPt.x}, ${destPt.y})`}
              opacity={isDimmed ? 0.35 : 1}
            >
              <circle
                cx={0}
                cy={0}
                r={isHovered ? 38 : 34}
                fill={badgeColor}
                opacity={0.25}
                className="animate-token-pulse"
              />
              <circle
                cx={0}
                cy={0}
                r={isHovered ? 35 : 31}
                fill="none"
                stroke={borderHex}
                strokeWidth={isHovered ? 4 : 3.2}
                strokeDasharray="10 6"
              />
              <circle
                cx={0}
                cy={0}
                r={9.5}
                fill={badgeColor}
                stroke="#FFFFFF"
                strokeWidth={2.2}
              />
            </g>
          );
        })}
      </g>
    );
  };

  /**
   * Renders Floating Numbered Destination Badges (`→#1`, `→#2`, `⚔#3`, `👑#4`)
   * ON TOP of the tokens layer so they are never occluded by opponent pawns on capture squares.
   */
  const renderMoveDestinationBadges = () => {
    if (!showMoveHints || moveIndicators.length === 0) return null;

    return (
      <g className="pointer-events-auto" data-testid="board-move-indicators">
        {moveIndicators.map((ind) => {
          const isHovered =
            hoveredTokenId === ind.tokenId || selectedTokenId === ind.tokenId;
          const isDimmed =
            (hoveredTokenId !== null || selectedTokenId !== null) && !isHovered;
          const destPt = gridCoordToSvgPoint(ind.toCoord);
          const palette = METALLIC_PAWN_PALETTE[ind.color];

          const badgeColor = ind.capturesOpponent
            ? '#DC2626'
            : ind.reachesHome
            ? '#D97706'
            : '#070B19';
          const borderHex = ind.capturesOpponent
            ? '#FEF08A'
            : ind.reachesHome
            ? '#FEF08A'
            : palette.specHighlight;

          // Stagger horizontally when multiple tokens share the same target square
          const spreadWidth = 48;
          const badgeOffsetX =
            ind.sharedTargetCount > 1
              ? (ind.sharedTargetIndex - (ind.sharedTargetCount - 1) / 2) *
                spreadWidth
              : 0;
          // Elevate higher when capturing an opponent token so the badge floats clearly above the opponent pawn's head
          const badgeOffsetY = ind.capturesOpponent
            ? -50
            : ind.sharedTargetCount > 1
            ? -28
            : -22;

          return (
            <g
              key={`dest-badge-${ind.tokenId}`}
              transform={`translate(${destPt.x}, ${destPt.y})`}
              opacity={isDimmed ? 0.35 : 1}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelectToken(ind.tokenId);
              }}
              onMouseEnter={() => setHoveredTokenId(ind.tokenId)}
              onMouseLeave={() => {
                if (hoveredTokenId === ind.tokenId) setHoveredTokenId(null);
              }}
              data-testid={`move-indicator-${ind.tokenId}`}
            >
              {/* Generous clickable hitbox on the destination square */}
              {ind.sharedTargetCount === 1 && (
                <circle cx={0} cy={0} r={34} fill="transparent" />
              )}

              {/* Floating 3D Numbered Token Destination Pill (`→#1`, `⚔#2`, `👑#3`) */}
              <g transform={`translate(${badgeOffsetX}, ${badgeOffsetY})`}>
                <rect
                  x={-23}
                  y={-14}
                  width={46}
                  height={26}
                  rx={13}
                  fill="rgba(0, 0, 0, 0.88)"
                  transform="translate(1.5, 3)"
                />
                <rect
                  x={-23}
                  y={-14}
                  width={46}
                  height={26}
                  rx={13}
                  fill={badgeColor}
                  stroke={borderHex}
                  strokeWidth={isHovered ? 3 : 2.2}
                />
                <polygon points="-5.5,12 5.5,12 0,19.5" fill={borderHex} />
                <text
                  x={0}
                  y={-0.5}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#FFFFFF"
                  fontSize="13"
                  fontWeight="900"
                  className="font-mono-tabular"
                >
                  {ind.capturesOpponent
                    ? `⚔#${ind.tokenNumber}`
                    : ind.reachesHome
                    ? `👑#${ind.tokenNumber}`
                    : `→#${ind.tokenNumber}`}
                </text>
              </g>
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <div className="relative flex items-center justify-center w-full h-full select-none p-1 sm:p-2">
      {/* Subtle, Controlled Ambient Turn Backlight */}
      <div
        aria-hidden="true"
        data-testid="turn-lighting-layer"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible"
      >
        <div
          className={`w-[min(86vw,50dvh)] h-[min(86vw,50dvh)] sm:w-[min(78vw,54dvh)] sm:h-[min(78vw,54dvh)] landscape:w-[min(52vw,88dvh)] landscape:h-[min(52vw,88dvh)] lg:w-[min(56vw,84dvh)] lg:h-[min(56vw,84dvh)] max-w-[680px] max-h-[680px] rounded-[28px] relative transition-all duration-700 ease-out ${
            reducedMotion ? '' : 'animate-turn-aura'
          }`}
          style={{
            boxShadow: `0 0 42px 6px ${turnLighting.glowHex}`,
            border: `1.5px solid ${turnLighting.primaryHex}55`,
          }}
        >
          <div
            className={`absolute w-[44%] h-[44%] rounded-full blur-2xl transition-all duration-700 ease-out ${
              reducedMotion ? '' : 'animate-turn-spotlight'
            }`}
            style={{
              left: `${turnLighting.quadrantPercent.x}%`,
              top: `${turnLighting.quadrantPercent.y}%`,
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${turnLighting.lightHex}44 0%, ${turnLighting.primaryHex}24 45%, transparent 74%)`,
            }}
          />
        </div>
      </div>

      {/* Physical 3D Tabletop Board Chassis Container */}
      <div
        className="relative z-10 w-[min(86vw,50dvh)] h-[min(86vw,50dvh)] sm:w-[min(78vw,54dvh)] sm:h-[min(78vw,54dvh)] landscape:w-[min(52vw,88dvh)] landscape:h-[min(52vw,88dvh)] lg:w-[min(56vw,84dvh)] lg:h-[min(56vw,84dvh)] max-w-[680px] max-h-[680px] aspect-square rounded-[22px] sm:rounded-[28px] overflow-hidden ludo-3d-chassis transition-all duration-500"
        style={{
          border: `3.5px solid ${
            effectiveThemeId === 'minimal_3d'
              ? '#CBD5E1'
              : effectiveThemeId === 'royal_classic'
              ? '#D97706'
              : '#475569'
          }`,
          background: '#03050C',
        }}
      >
        <svg
          viewBox={`0 0 ${BOARD_VIEWBOX_SIZE} ${BOARD_VIEWBOX_SIZE}`}
          className="w-full h-full block"
          role="img"
          aria-label="Ludo Royale 3D Board"
          data-testid="ludo-board-svg"
        >
          <defs>
            {/* 1. Master Board Chassis & Metallic Gradients */}
            <linearGradient
              id="board-outer-chassis-cosmic"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="30%" stopColor="#0F172A" />
              <stop offset="70%" stopColor="#060916" />
              <stop offset="100%" stopColor="#020308" />
            </linearGradient>

            <linearGradient
              id="reactor-housing-metal"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#64748B" />
              <stop offset="25%" stopColor="#334155" />
              <stop offset="65%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            <radialGradient id="royal-center-pedestal" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#451A03" />
              <stop offset="70%" stopColor="#1C0D04" />
              <stop offset="100%" stopColor="#090401" />
            </radialGradient>

            <radialGradient id="safe-dish-well" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="65%" stopColor="#090D1E" />
              <stop offset="100%" stopColor="#02040A" />
            </radialGradient>

            <radialGradient id="socket-concave-well" cx="50%" cy="62%" r="58%">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="65%" stopColor="#040712" />
              <stop offset="100%" stopColor="#010206" />
            </radialGradient>

            <linearGradient id="gold-rim-bevel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>

            <linearGradient id="star-3d-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="28%" stopColor="#FEF08A" />
              <stop offset="65%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>

            <linearGradient id="tile-glass-sheen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.24)" />
              <stop offset="50%" stopColor="rgba(255, 255, 255, 0.07)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </linearGradient>

            <linearGradient id="pawn-specular-sheen" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.85)" />
              <stop offset="50%" stopColor="rgba(255, 255, 255, 0.45)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.12)" />
            </linearGradient>

            {/* 2. Black Hole & Relativistic Accretion Gradients */}
            <radialGradient id="blackhole-void-well" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000000" />
              <stop offset="50%" stopColor="#070318" />
              <stop offset="80%" stopColor="#261054" />
              <stop offset="100%" stopColor="#050310" />
            </radialGradient>

            <radialGradient
              id="blackhole-accretion-halo"
              cx="50%"
              cy="50%"
              r="50%"
            >
              <stop offset="34%" stopColor="rgba(0,0,0,0)" />
              <stop offset="48%" stopColor="rgba(245, 158, 11, 0.72)" />
              <stop offset="66%" stopColor="rgba(192, 38, 211, 0.68)" />
              <stop offset="84%" stopColor="rgba(56, 189, 248, 0.52)" />
              <stop offset="100%" stopColor="rgba(6, 4, 20, 0)" />
            </radialGradient>

            <linearGradient
              id="accretion-stream-warm"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="25%" stopColor="#FEF08A" />
              <stop offset="55%" stopColor="#F59E0B" />
              <stop offset="80%" stopColor="#EC4899" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>

            <linearGradient
              id="accretion-stream-cool"
              x1="100%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="40%" stopColor="#38BDF8" />
              <stop offset="75%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#1E1B4B" />
            </linearGradient>

            <radialGradient id="event-horizon-core" cx="42%" cy="42%" r="58%">
              <stop offset="0%" stopColor="#000000" />
              <stop offset="82%" stopColor="#010103" />
              <stop offset="95%" stopColor="#0B041E" />
              <stop offset="100%" stopColor="#31105E" />
            </radialGradient>

            {/* 3. Cosmic Mineral & Theme Plateau Gradients */}
            <linearGradient
              id="tile-cosmic-plateau-a"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#262E66" />
              <stop offset="55%" stopColor="#171C42" />
              <stop offset="100%" stopColor="#0C1029" />
            </linearGradient>

            <linearGradient
              id="tile-cosmic-plateau-b"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#342269" />
              <stop offset="55%" stopColor="#1E1445" />
              <stop offset="100%" stopColor="#100A29" />
            </linearGradient>

            <linearGradient
              id="tile-cosmic-plateau-c"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#1E3A6E" />
              <stop offset="55%" stopColor="#13254A" />
              <stop offset="100%" stopColor="#0A142B" />
            </linearGradient>

            <linearGradient id="tile-royal-marble" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFDF9" />
              <stop offset="55%" stopColor="#FDF3DC" />
              <stop offset="100%" stopColor="#EED7A8" />
            </linearGradient>

            <linearGradient id="tile-elemental-stone" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E2E8F0" />
              <stop offset="60%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>

            <linearGradient id="tile-nature-wood" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EED5B0" />
              <stop offset="55%" stopColor="#D4A36A" />
              <stop offset="100%" stopColor="#9C6B3B" />
            </linearGradient>

            {/* 4. Per-Color 3D Metallic Gradients */}
            {PLAYER_COLORS.map((color) => {
              const p = METALLIC_PAWN_PALETTE[color];
              return (
                <React.Fragment key={`defs-${color}`}>
                  <linearGradient
                    id={`tile-colored-plateau-${color}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={p.lightMetal} />
                    <stop offset="48%" stopColor={p.midMetal} />
                    <stop offset="100%" stopColor={p.deepMetal} />
                  </linearGradient>

                  <linearGradient
                    id={`territory-housing-${color}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={p.arenaOuterMetal} />
                    <stop offset="55%" stopColor={p.arenaFloorDark} />
                    <stop offset="100%" stopColor="#03050E" />
                  </linearGradient>

                  <radialGradient
                    id={`territory-nebula-${color}`}
                    cx="50%"
                    cy="50%"
                    r="50%"
                  >
                    <stop offset="0%" stopColor={p.midMetal} stopOpacity="0.45" />
                    <stop offset="70%" stopColor={p.deepMetal} stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                  </radialGradient>

                  <linearGradient
                    id={`pedestal-wall-${color}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor={p.abyssMetal} />
                    <stop offset="22%" stopColor={p.lightMetal} />
                    <stop offset="45%" stopColor={p.specHighlight} />
                    <stop offset="70%" stopColor={p.midMetal} />
                    <stop offset="100%" stopColor={p.abyssMetal} />
                  </linearGradient>

                  <linearGradient
                    id={`arena-rim-${color}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={p.specHighlight} />
                    <stop offset="28%" stopColor={p.lightMetal} />
                    <stop offset="65%" stopColor={p.midMetal} />
                    <stop offset="100%" stopColor={p.abyssMetal} />
                  </linearGradient>

                  <radialGradient
                    id={`arena-pit-${color}`}
                    cx="50%"
                    cy="50%"
                    r="52%"
                  >
                    <stop offset="0%" stopColor="#010206" />
                    <stop offset="78%" stopColor={p.arenaFloorDark} />
                    <stop offset="100%" stopColor="#010104" />
                  </radialGradient>

                  <radialGradient
                    id={`arena-deck-${color}`}
                    cx="34%"
                    cy="30%"
                    r="68%"
                  >
                    <stop offset="0%" stopColor={p.midMetal} />
                    <stop offset="45%" stopColor={p.arenaFloorMid} />
                    <stop offset="85%" stopColor={p.arenaFloorDark} />
                    <stop offset="100%" stopColor="#02040A" />
                  </radialGradient>

                  <linearGradient
                    id={`home-bay-${color}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={p.lightMetal} />
                    <stop offset="55%" stopColor={p.midMetal} />
                    <stop offset="100%" stopColor={p.abyssMetal} />
                  </linearGradient>

                  <linearGradient
                    id={`pawn-base-wall-${color}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor={p.abyssMetal} />
                    <stop offset="28%" stopColor={p.specHighlight} />
                    <stop offset="55%" stopColor={p.midMetal} />
                    <stop offset="85%" stopColor={p.abyssMetal} />
                    <stop offset="100%" stopColor={p.lightMetal} />
                  </linearGradient>

                  <linearGradient
                    id={`pawn-body-${color}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="12%"
                  >
                    <stop offset="0%" stopColor={p.deepMetal} />
                    <stop offset="22%" stopColor={p.specHighlight} />
                    <stop offset="42%" stopColor={p.lightMetal} />
                    <stop offset="68%" stopColor={p.midMetal} />
                    <stop offset="88%" stopColor={p.abyssMetal} />
                    <stop offset="100%" stopColor={p.rimReflect} />
                  </linearGradient>

                  <radialGradient
                    id={`pawn-head-${color}`}
                    cx="50%"
                    cy="50%"
                    r="54%"
                    fx="30%"
                    fy="26%"
                  >
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="18%" stopColor={p.specHighlight} />
                    <stop offset="48%" stopColor={p.lightMetal} />
                    <stop offset="78%" stopColor={p.deepMetal} />
                    <stop offset="100%" stopColor={p.abyssMetal} />
                  </radialGradient>
                </React.Fragment>
              );
            })}
          </defs>

          {/* 1. Master Physical Board Chassis */}
          <rect
            x={0}
            y={0}
            width={BOARD_VIEWBOX_SIZE}
            height={BOARD_VIEWBOX_SIZE}
            fill={
              effectiveThemeId === 'minimal_3d'
                ? '#E2E8F0'
                : effectiveThemeId === 'royal_classic'
                ? '#1F0E04'
                : 'url(#board-outer-chassis-cosmic)'
            }
          />

          {/* 2. Four Sculpted 3D Player Territories */}
          {PLAYER_COLORS.map((color) => renderPlayerTerritory(color))}

          {/* 3. 52 Shared Perimeter Track Tiles (Unique Design per Theme) */}
          <g>
            {MAIN_TRACK_COORDS.map((coord, trackIndex) => {
              const startColor =
                (Object.keys(START_TRACK_INDEX) as PlayerColor[]).find(
                  (c) => START_TRACK_INDEX[c] === trackIndex
                ) || null;
              const isStar = STAR_SAFE_INDICES.includes(trackIndex);
              return renderPhysicalTrackTile(
                coord.row,
                coord.col,
                `track-${trackIndex}`,
                {
                  isStartColor: startColor,
                  isStar,
                  trackIndex,
                }
              );
            })}
          </g>

          {/* 4. 20 Colored Home Lane Tiles (5 per player color) */}
          <g>
            {PLAYER_COLORS.map((color) =>
              HOME_PATH_COORDS[color].map((coord, stepIdx) =>
                renderPhysicalTrackTile(
                  coord.row,
                  coord.col,
                  `homelane-${color}-${stepIdx}`,
                  {
                    homeLaneColor: color,
                    homeLaneStepIndex: stepIdx,
                  }
                )
              )
            )}
          </g>

          {/* 5. Massive Central 3D Black Hole / Theme Centerpiece */}
          {renderCenterpiece()}

          {/* 6. Sculpted Outer 3D Board Moulding Frame Overlay */}
          <rect
            x={3}
            y={3}
            width={BOARD_VIEWBOX_SIZE - 6}
            height={BOARD_VIEWBOX_SIZE - 6}
            rx={22}
            fill="none"
            stroke="rgba(226, 232, 240, 0.24)"
            strokeWidth={6}
            pointerEvents="none"
          />

          {/* 7. Per-Token Ground Move Trajectory Paths & Target Reticles */}
          {renderMoveTrajectoriesAndReticles()}

          {/* 8. Capture Shockwave & Home Arrival Celebratory Effects */}
          {captureBursts.map((burst) => (
            <g
              key={burst.id}
              transform={`translate(${burst.x}, ${burst.y})`}
              className="pointer-events-none"
            >
              <circle
                cx={0}
                cy={0}
                r={44}
                fill="none"
                stroke={COLOR_META[burst.color].lightHex}
                strokeWidth={5}
                className="animate-ping"
              />
              <circle
                cx={0}
                cy={0}
                r={26}
                fill={COLOR_META[burst.color].primaryHex}
                opacity={0.5}
              />
            </g>
          ))}

          {homeBursts.map((burst) => (
            <g
              key={burst.id}
              transform={`translate(${burst.x}, ${burst.y})`}
              className="pointer-events-none"
            >
              <circle
                cx={0}
                cy={0}
                r={52}
                fill="none"
                stroke="#FDE047"
                strokeWidth={5}
                className="animate-ping"
              />
              <circle
                cx={0}
                cy={0}
                r={30}
                fill={COLOR_META[burst.color].lightHex}
                opacity={0.65}
              />
            </g>
          ))}

          {/* 9. All 16 Tall 3D Sculpted Metallic Game Pieces with Token Numbers (1..4) */}
          <g>
            {allTokens.map((token) => {
              const pos = tokenPositions.get(token.id);
              if (!pos) return null;

              const isAnimatingThis =
                animatingMove && animatingMove.tokenId === token.id;
              const animPt = isAnimatingThis
                ? gridCoordToSvgPoint(animatingMove.coord)
                : null;

              const renderX = animPt ? animPt.x : pos.x;
              const renderY = animPt ? animPt.y - 12 : pos.y;

              const isLegal = legalMoveByTokenId.has(token.id);
              const meta = COLOR_META[token.color];
              const palette = METALLIC_PAWN_PALETTE[token.color];
              const tokenNumber = token.index + 1;
              const tokenStateLabel =
                token.steps < 0
                  ? 'yard'
                  : token.steps >= FINISH_STEP
                  ? 'home'
                  : 'track';

              return (
                <g
                  key={token.id}
                  transform={`translate(${renderX}, ${renderY}) scale(${pos.scale})`}
                  style={{
                    transition: reducedMotion
                      ? 'none'
                      : isAnimatingThis
                      ? 'transform 95ms cubic-bezier(0.22, 1, 0.36, 1)'
                      : 'transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                  className={
                    isLegal
                      ? 'cursor-pointer pointer-events-auto'
                      : 'pointer-events-none'
                  }
                  onClick={() => {
                    if (isLegal) {
                      onSelectToken(token.id);
                    }
                  }}
                  onMouseEnter={() => {
                    if (isLegal) setHoveredTokenId(token.id);
                  }}
                  onMouseLeave={() => {
                    if (hoveredTokenId === token.id) setHoveredTokenId(null);
                  }}
                  role={isLegal ? 'button' : undefined}
                  tabIndex={isLegal ? 0 : undefined}
                  aria-label={`${meta.label} token ${tokenNumber} (${tokenStateLabel})${
                    isLegal ? ' - playable' : ''
                  }`}
                  onKeyDown={(e) => {
                    if (isLegal && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onSelectToken(token.id);
                    }
                  }}
                  data-testid={`token-${token.id}`}
                >
                  {/* Generous Transparent Touch/Click Hitbox (88x88) */}
                  <circle cx={0} cy={-6} r={44} fill="transparent" />

                  {/* Playable Ground Selection Halo Ring */}
                  {isLegal && showMoveHints && (
                    <g>
                      <ellipse
                        cx={0}
                        cy={21}
                        rx={35}
                        ry={13.5}
                        fill="none"
                        stroke={palette.specHighlight}
                        strokeWidth={3.5}
                        className="animate-token-pulse"
                      />
                      <ellipse
                        cx={0}
                        cy={21}
                        rx={28}
                        ry={10.5}
                        fill={palette.lightMetal}
                        opacity={0.32}
                      />
                    </g>
                  )}

                  {/* Levitating 3D Pawn Wrapper when Playable */}
                  <g
                    className={
                      isLegal && !reducedMotion ? 'animate-token-levitate' : ''
                    }
                  >
                    {/* 3D Sculpted Metallic Pawn with Engraved Token Number (1..4) */}
                    {render3DMetallicPawn(
                      token.color,
                      isLegal,
                      tokenNumber,
                      token.id
                    )}

                    {/* Color-Blind Accessible Symbol Engraving on Sphere Head */}
                    {colorBlindMode && (
                      <text
                        x={0}
                        y={-31}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#FFFFFF"
                        stroke="#020617"
                        strokeWidth={2.5}
                        paintOrder="stroke"
                        fontSize="13"
                        fontWeight="900"
                      >
                        {meta.symbol}
                      </text>
                    )}

                    {/* Stack Count Badge when Multiple Tokens Share a Tile */}
                    {pos.stackCount > 1 &&
                      pos.stackIndex === pos.stackCount - 1 && (
                        <g transform="translate(20, -36)">
                          <circle
                            cx={0}
                            cy={0}
                            r={12}
                            fill="#090D1A"
                            stroke={palette.specHighlight}
                            strokeWidth={2}
                          />
                          <text
                            x={0}
                            y={1}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#F8FAFC"
                            fontSize="11"
                            fontWeight="800"
                            className="font-mono-tabular"
                          >
                            ×{pos.stackCount}
                          </text>
                        </g>
                      )}
                  </g>
                </g>
              );
            })}
          </g>

          {/* 10. Floating Numbered Destination Badges (`→#1`, `⚔#2`, `👑#3`) Rendered Over Pawns */}
          {renderMoveDestinationBadges()}
        </svg>
      </div>
    </div>
  );
};

export const BoardThemePreviewSVG: React.FC<{
  themeOption: BoardThemeOption;
  className?: string;
}> = ({ themeOption, className = 'w-11 h-11' }) => {
  const spec = getThemeTileSpec(themeOption.id);
  const quadrants: { color: PlayerColor; x: number; y: number }[] = [
    { color: 'red', x: 8, y: 8 },
    { color: 'green', x: 74, y: 8 },
    { color: 'yellow', x: 74, y: 74 },
    { color: 'blue', x: 8, y: 74 },
  ];

  return (
    <svg
      viewBox="0 0 120 120"
      className={`${className} rounded-xl overflow-hidden shrink-0 border border-slate-700/80 shadow-md`}
      aria-hidden="true"
    >
      <rect width="120" height="120" fill={themeOption.boardBg} />
      <rect
        x="3"
        y="3"
        width="114"
        height="114"
        rx="10"
        fill="none"
        stroke={themeOption.boardBorder}
        strokeWidth="2.5"
      />
      {quadrants.map(({ color, x, y }) => {
        const cx = x + 19;
        const cy = y + 19;
        const meta = COLOR_META[color];
        if (spec.spawnRoomArchitecture === 'cyber_hex_bay') {
          return (
            <g key={color}>
              <rect
                x={x}
                y={y}
                width="38"
                height="38"
                rx="4"
                fill="#050B18"
                stroke={meta.lightHex}
                strokeWidth="1.4"
              />
              <polygon
                points={`${x + 10},${y + 5} ${x + 28},${y + 5} ${x + 33},${
                  y + 10
                } ${x + 33},${y + 28} ${x + 28},${y + 33} ${x + 10},${
                  y + 33
                } ${x + 5},${y + 28} ${x + 5},${y + 10}`}
                fill={themeOption.yardInnerBg}
                stroke={meta.primaryHex}
                strokeWidth="1.5"
              />
              <circle cx={cx} cy={cy} r="4.5" fill={meta.lightHex} />
            </g>
          );
        }
        if (spec.spawnRoomArchitecture === 'studio_podium') {
          return (
            <g key={color}>
              <rect
                x={x}
                y={y}
                width="38"
                height="38"
                rx="9"
                fill={meta.primaryHex}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              <circle
                cx={cx}
                cy={cy}
                r="12.5"
                fill={meta.darkHex}
                stroke="#FFFFFF"
                strokeWidth="1.2"
              />
              <circle cx={cx} cy={cy - 1} r="4.5" fill="#FFFFFF" />
            </g>
          );
        }
        if (spec.spawnRoomArchitecture === 'imperial_citadel') {
          return (
            <g key={color}>
              <rect
                x={x}
                y={y}
                width="38"
                height="38"
                rx="4"
                fill={meta.darkHex}
                stroke="#F59E0B"
                strokeWidth="1.6"
              />
              <circle
                cx={cx}
                cy={cy}
                r="14"
                fill="#FDF3DC"
                stroke="#F59E0B"
                strokeWidth="1.5"
                strokeDasharray="3 1.5"
              />
              <circle cx={cx} cy={cy} r="9.5" fill={meta.primaryHex} />
              <polygon
                points={`${cx},${cy - 6} ${cx + 4},${cy + 4} ${cx - 4},${
                  cy + 4
                }`}
                fill="#FEF08A"
              />
            </g>
          );
        }
        if (spec.spawnRoomArchitecture === 'woodland_glade') {
          return (
            <g key={color}>
              <rect
                x={x}
                y={y}
                width="38"
                height="38"
                rx="6"
                fill="#8C582B"
                stroke="#3E240E"
                strokeWidth="1.5"
              />
              <circle
                cx={cx}
                cy={cy}
                r="13.5"
                fill={meta.darkHex}
                stroke="#D9A066"
                strokeWidth="1.5"
              />
              <circle cx={x + 6} cy={y + 6} r="4.5" fill="#22C55E" />
              <circle cx={x + 32} cy={y + 6} r="4.5" fill="#22C55E" />
              <circle cx={cx} cy={cy} r="5" fill={meta.primaryHex} />
            </g>
          );
        }
        if (spec.spawnRoomArchitecture === 'elemental_sanctuary') {
          return (
            <g key={color}>
              <rect
                x={x}
                y={y}
                width="38"
                height="38"
                rx="5"
                fill="#0F172A"
                stroke={meta.primaryHex}
                strokeWidth="1.4"
              />
              <polygon
                points={`${cx},${cy - 14} ${cx + 12},${cy - 6} ${cx + 10},${
                  cy + 11
                } ${cx - 10},${cy + 11} ${cx - 12},${cy - 6}`}
                fill={meta.darkHex}
                stroke="#CBD5E1"
                strokeWidth="1.4"
              />
              <circle cx={cx} cy={cy} r="5.5" fill={meta.lightHex} />
            </g>
          );
        }
        return (
          <g key={color}>
            <rect
              x={x}
              y={y}
              width="38"
              height="38"
              rx="6"
              fill={meta.darkHex}
              stroke={meta.primaryHex}
              strokeWidth="1.2"
            />
            <circle
              cx={cx}
              cy={cy}
              r="14"
              fill={themeOption.yardInnerBg}
              stroke={meta.lightHex}
              strokeWidth="1.2"
            />
            <circle cx={cx} cy={cy - 2} r="5.5" fill={meta.primaryHex} />
          </g>
        );
      })}

      <rect x="49" y="8" width="22" height="38" rx="3" fill={themeOption.trackCellBg} stroke={themeOption.trackCellStroke} strokeWidth="1" />
      <rect x="49" y="74" width="22" height="38" rx="3" fill={themeOption.trackCellBg} stroke={themeOption.trackCellStroke} strokeWidth="1" />
      <rect x="8" y="49" width="38" height="22" rx="3" fill={themeOption.trackCellBg} stroke={themeOption.trackCellStroke} strokeWidth="1" />
      <rect x="74" y="49" width="38" height="22" rx="3" fill={themeOption.trackCellBg} stroke={themeOption.trackCellStroke} strokeWidth="1" />

      <circle cx="60" cy="60" r="13" fill="#040612" stroke={themeOption.centerStroke} strokeWidth="2" />
      <circle cx="60" cy="60" r="6" fill={themeOption.accentColor} />
    </svg>
  );
};
