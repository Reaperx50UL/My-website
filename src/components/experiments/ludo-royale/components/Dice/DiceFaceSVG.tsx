import React from 'react';
import { COLOR_META, getDiceStyleOption } from '../../game/constants';
import { DiceStyle, PlayerColor } from '../../game/gameTypes';

export const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [26, 26],
    [50, 50],
    [74, 74],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [26, 26],
    [74, 26],
    [50, 50],
    [26, 74],
    [74, 74],
  ],
  6: [
    [28, 24],
    [72, 24],
    [28, 50],
    [72, 50],
    [28, 76],
    [72, 76],
  ],
};

const ROMAN_NUMERALS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
};

function getHexagonPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

function getStarPath(cx: number, cy: number, r: number): string {
  const inner = r * 0.38;
  return [
    `M ${cx} ${cy - r}`,
    `L ${cx + inner} ${cy - inner}`,
    `L ${cx + r} ${cy}`,
    `L ${cx + inner} ${cy + inner}`,
    `L ${cx} ${cy + r}`,
    `L ${cx - inner} ${cy + inner}`,
    `L ${cx - r} ${cy}`,
    `L ${cx - inner} ${cy - inner}`,
    'Z',
  ].join(' ');
}

export interface DiceFaceSVGProps {
  face: number;
  diceStyle: DiceStyle;
  activeColor?: PlayerColor;
  className?: string;
}

/**
 * Reusable custom SVG renderer for each of the 6 unique dice designs.
 */
export const DiceFaceSVG: React.FC<DiceFaceSVGProps> = ({
  face,
  diceStyle,
  activeColor = 'red',
  className = 'w-10 h-10',
}) => {
  const styleOpt = getDiceStyleOption(diceStyle);
  const colorMeta = COLOR_META[activeColor] || COLOR_META.red;
  const safeFace = face >= 1 && face <= 6 ? face : 6;
  const pips = PIP_POSITIONS[safeFace];
  const isAccentFace = safeFace === 1 || safeFace === 6;

  const primaryPipFill =
    diceStyle === 'classic_ivory' && isAccentFace
      ? colorMeta.secondaryHex
      : isAccentFace
      ? styleOpt.accentPipColor
      : styleOpt.pipColor;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      data-face-texture={styleOpt.texturePattern}
    >
      {/* 1. Procedural Surface Texture Map per Dice Style */}
      {styleOpt.texturePattern === 'ivory_grain' && (
        <g data-texture-layer="ivory_grain" pointerEvents="none">
          {/* Concentric lathe-turned ivory rings & warm organic grain striations */}
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="rgba(148, 163, 184, 0.14)"
            strokeWidth="1"
          />
          <circle
            cx="50"
            cy="50"
            r="32"
            fill="none"
            stroke="rgba(148, 163, 184, 0.1)"
            strokeWidth="0.8"
          />
          <path
            d="M 10 24 Q 50 19 90 25 M 10 50 Q 50 45 90 51 M 10 76 Q 50 71 90 77"
            fill="none"
            stroke="rgba(100, 116, 139, 0.11)"
            strokeWidth="1"
          />
          {/* Beveled tournament frame & corner chamfers */}
          <rect
            x="7"
            y="7"
            width="86"
            height="86"
            rx="16"
            fill="none"
            stroke={styleOpt.innerFrameColor}
            strokeWidth="2"
          />
          <rect
            x="11"
            y="11"
            width="78"
            height="78"
            rx="13"
            fill="none"
            stroke="rgba(255, 255, 255, 0.7)"
            strokeWidth="1"
          />
        </g>
      )}

      {styleOpt.texturePattern === 'brushed_bullion' && (
        <g data-texture-layer="brushed_bullion" pointerEvents="none">
          {/* Diagonal 24k brushed metallic gold grain */}
          <g stroke="rgba(120, 53, 15, 0.18)" strokeWidth="0.9">
            <line x1="8" y1="22" x2="22" y2="8" />
            <line x1="8" y1="40" x2="40" y2="8" />
            <line x1="8" y1="58" x2="58" y2="8" />
            <line x1="8" y1="76" x2="76" y2="8" />
            <line x1="16" y1="92" x2="92" y2="16" />
            <line x1="34" y1="92" x2="92" y2="34" />
            <line x1="52" y1="92" x2="92" y2="52" />
            <line x1="70" y1="92" x2="92" y2="70" />
          </g>
          {/* Specular metallic reflection band */}
          <polygon
            points="12,8 36,8 8,36 8,12"
            fill="rgba(255, 251, 235, 0.28)"
          />
          <polygon
            points="64,92 88,92 92,88 92,64"
            fill="rgba(120, 53, 15, 0.2)"
          />
          {/* Royal damask filigree frame & corner rivets */}
          <g stroke={styleOpt.innerFrameColor} fill="none">
            <rect x="7" y="7" width="86" height="86" rx="12" strokeWidth="2.2" />
            <rect
              x="12"
              y="12"
              width="76"
              height="76"
              rx="8"
              strokeWidth="1.1"
              strokeDasharray="4 2"
            />
            <polygon points="14,7 18,11 14,15 10,11" fill={styleOpt.pipColor} />
            <polygon points="86,7 90,11 86,15 82,11" fill={styleOpt.pipColor} />
            <polygon points="14,85 18,89 14,93 10,89" fill={styleOpt.pipColor} />
            <polygon points="86,85 90,89 86,93 82,89" fill={styleOpt.pipColor} />
          </g>
        </g>
      )}

      {styleOpt.texturePattern === 'carbon_circuit' && (
        <g data-texture-layer="carbon_circuit" pointerEvents="none">
          {/* Carbon fiber diagonal weave matrix */}
          <g stroke="rgba(15, 23, 42, 0.75)" strokeWidth="2.5">
            <line x1="0" y1="20" x2="20" y2="0" />
            <line x1="0" y1="45" x2="45" y2="0" />
            <line x1="0" y1="70" x2="70" y2="0" />
            <line x1="0" y1="95" x2="95" y2="0" />
            <line x1="25" y1="100" x2="100" y2="25" />
            <line x1="50" y1="100" x2="100" y2="50" />
            <line x1="75" y1="100" x2="100" y2="75" />
          </g>
          {/* Glowing PCB circuit traces & micro-vias */}
          <g
            stroke="rgba(56, 189, 248, 0.28)"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          >
            <path d="M 16 50 L 32 50 L 40 42" />
            <path d="M 84 50 L 68 50 L 60 58" />
            <path d="M 50 16 L 50 30 L 58 38" />
            <path d="M 50 84 L 50 70 L 42 62" />
            <circle cx="16" cy="50" r="2" fill="rgba(56, 189, 248, 0.55)" />
            <circle cx="84" cy="50" r="2" fill="rgba(56, 189, 248, 0.55)" />
            <circle cx="50" cy="16" r="2" fill="rgba(244, 63, 94, 0.55)" />
            <circle cx="50" cy="84" r="2" fill="rgba(244, 63, 94, 0.55)" />
          </g>
          {/* Cyber circuit corner brackets */}
          <g stroke={styleOpt.innerFrameColor} fill="none" strokeWidth="2.5">
            <path d="M 9 28 L 9 9 L 28 9" />
            <path d="M 72 9 L 91 9 L 91 28" />
            <path d="M 9 72 L 9 91 L 28 91" />
            <path d="M 72 91 L 91 91 L 91 72" />
            <rect
              x="15"
              y="15"
              width="70"
              height="70"
              rx="7"
              strokeWidth="1"
              stroke="rgba(56, 189, 248, 0.22)"
            />
          </g>
        </g>
      )}

      {styleOpt.texturePattern === 'veined_jade' && (
        <g data-texture-layer="veined_jade" pointerEvents="none">
          {/* Natural imperial jade mineral veining & crystalline clouds */}
          <path
            d="M 12 22 C 28 32, 36 18, 54 34 C 70 48, 66 72, 88 80"
            fill="none"
            stroke="rgba(167, 243, 208, 0.28)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M 18 78 C 36 62, 48 68, 64 46 C 74 32, 80 28, 88 16"
            fill="none"
            stroke="rgba(2, 44, 34, 0.36)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M 30 14 Q 50 40 44 86"
            fill="none"
            stroke="rgba(253, 230, 138, 0.18)"
            strokeWidth="1"
          />
          {/* Carved dynasty frame & corner cloud medallions */}
          <g stroke={styleOpt.innerFrameColor} fill="none" strokeWidth="1.8">
            <rect x="8" y="8" width="84" height="84" rx="16" />
            <circle cx="16" cy="16" r="3.5" />
            <circle cx="84" cy="16" r="3.5" />
            <circle cx="16" cy="84" r="3.5" />
            <circle cx="84" cy="84" r="3.5" />
            <circle
              cx="50"
              cy="50"
              r="30"
              stroke="rgba(253, 230, 138, 0.16)"
              strokeDasharray="6 4"
            />
          </g>
        </g>
      )}

      {styleOpt.texturePattern === 'faceted_gemstone' && (
        <g data-texture-layer="faceted_gemstone" pointerEvents="none">
          {/* Multi-angle triangular gemstone prism refraction planes */}
          <polygon
            points="22,8 78,8 50,50"
            fill="rgba(255, 255, 255, 0.16)"
          />
          <polygon
            points="78,8 92,22 92,78 50,50"
            fill="rgba(254, 202, 202, 0.08)"
          />
          <polygon
            points="92,78 78,92 22,92 50,50"
            fill="rgba(69, 10, 10, 0.34)"
          />
          <polygon
            points="8,78 8,22 22,8 50,50"
            fill="rgba(254, 240, 138, 0.1)"
          />
          {/* Gemstone facet cut lines */}
          <g stroke={styleOpt.innerFrameColor} fill="none" strokeWidth="1.5">
            <polygon points="22,8 78,8 92,22 92,78 78,92 22,92 8,78 8,22" />
            <polygon
              points="30,18 70,18 82,30 82,70 70,82 30,82 18,70 18,30"
              stroke="rgba(254, 240, 138, 0.25)"
              strokeWidth="1"
            />
            <line x1="22" y1="8" x2="30" y2="18" />
            <line x1="78" y1="8" x2="70" y2="18" />
            <line x1="92" y1="22" x2="82" y2="30" />
            <line x1="92" y1="78" x2="82" y2="70" />
            <line x1="78" y1="92" x2="70" y2="82" />
            <line x1="22" y1="92" x2="30" y2="82" />
            <line x1="8" y1="78" x2="18" y2="70" />
            <line x1="8" y1="22" x2="18" y2="30" />
          </g>
        </g>
      )}

      {styleOpt.texturePattern === 'nebula_astrolabe' && (
        <g data-texture-layer="nebula_astrolabe" pointerEvents="none">
          {/* Cosmic nebula swirl & constellation star chart */}
          <ellipse
            cx="50"
            cy="50"
            rx="38"
            ry="24"
            transform="rotate(-28 50 50)"
            fill="rgba(167, 139, 250, 0.14)"
          />
          <ellipse
            cx="50"
            cy="50"
            rx="28"
            ry="15"
            transform="rotate(35 50 50)"
            fill="rgba(56, 189, 248, 0.12)"
          />
          {/* Starfield & astrolabe crosshairs */}
          <g stroke="rgba(253, 230, 138, 0.22)" strokeWidth="0.9">
            <line x1="50" y1="7" x2="50" y2="93" />
            <line x1="7" y1="50" x2="93" y2="50" />
            <line x1="18" y1="18" x2="82" y2="82" strokeDasharray="2 4" />
            <line x1="82" y1="18" x2="18" y2="82" strokeDasharray="2 4" />
          </g>
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={styleOpt.innerFrameColor}
            strokeWidth="1.6"
            strokeDasharray="3 2.5"
          />
          <circle
            cx="50"
            cy="50"
            r="35"
            fill="none"
            stroke={styleOpt.innerFrameColor}
            strokeWidth="1.2"
          />
          <circle
            cx="50"
            cy="50"
            r="26"
            fill="none"
            stroke="rgba(253, 230, 138, 0.25)"
            strokeWidth="0.9"
          />
        </g>
      )}

      {/* 2. 3D Recessed / Embossed Pips or Roman Numerals */}
      {styleOpt.pipShape === 'roman' ? (
        <g>
          {/* Constellation pip nodes connected by faint starlines */}
          {pips.length > 1 && (
            <polyline
              points={pips.map(([cx, cy]) => `${cx},${cy}`).join(' ')}
              fill="none"
              stroke="rgba(56, 189, 248, 0.28)"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}
          {pips.map(([cx, cy], idx) => (
            <g key={idx}>
              <circle
                cx={cx}
                cy={cy}
                r={3.6}
                fill="rgba(253, 230, 138, 0.35)"
              />
              <circle cx={cx} cy={cy} r={1.6} fill="#FFFFFF" />
            </g>
          ))}
          {/* Drop-shadowed Roman numeral engraving */}
          <text
            x="50"
            y="63.5"
            textAnchor="middle"
            fill="rgba(2, 6, 23, 0.85)"
            fontSize={safeFace === 4 || safeFace === 6 ? '34' : '38'}
            fontWeight="800"
            fontFamily="Georgia, serif"
            letterSpacing="1"
          >
            {ROMAN_NUMERALS[safeFace]}
          </text>
          <text
            x="50"
            y="62"
            textAnchor="middle"
            fill={primaryPipFill}
            fontSize={safeFace === 4 || safeFace === 6 ? '34' : '38'}
            fontWeight="800"
            fontFamily="Georgia, serif"
            letterSpacing="1"
          >
            {ROMAN_NUMERALS[safeFace]}
          </text>
        </g>
      ) : (
        pips.map(([cx, cy], idx) => {
          const r = safeFace === 1 ? 13.5 : 9.5;

          if (styleOpt.pipShape === 'diamond') {
            return (
              <g key={idx}>
                {/* Beveled socket shadow */}
                <polygon
                  points={`${cx},${cy - r * 1.26} ${cx + r * 1.26},${cy} ${cx},${
                    cy + r * 1.26
                  } ${cx - r * 1.26},${cy}`}
                  fill="rgba(0, 0, 0, 0.38)"
                />
                <polygon
                  points={`${cx},${cy - r * 1.15} ${cx + r * 1.15},${cy} ${cx},${
                    cy + r * 1.15
                  } ${cx - r * 1.15},${cy}`}
                  fill={primaryPipFill}
                />
                <polygon
                  points={`${cx},${cy - r * 0.5} ${cx + r * 0.5},${cy} ${cx},${
                    cy + r * 0.5
                  } ${cx - r * 0.5},${cy}`}
                  fill="rgba(255,255,255,0.55)"
                />
              </g>
            );
          }

          if (styleOpt.pipShape === 'hexagon') {
            return (
              <g key={idx}>
                {/* Outer neon halo socket */}
                <polygon
                  points={getHexagonPoints(cx, cy, r * 1.25)}
                  fill="rgba(2, 6, 23, 0.8)"
                  stroke={primaryPipFill}
                  strokeWidth="1"
                />
                <polygon
                  points={getHexagonPoints(cx, cy, r * 1.02)}
                  fill={primaryPipFill}
                />
                <circle cx={cx} cy={cy} r={r * 0.38} fill="#FFFFFF" />
              </g>
            );
          }

          if (styleOpt.pipShape === 'star') {
            return (
              <g key={idx}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r * 1.05}
                  fill="rgba(2, 44, 34, 0.55)"
                />
                <path
                  d={getStarPath(cx, cy, r * 1.28)}
                  fill={primaryPipFill}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={r * 0.28}
                  fill="rgba(255,255,255,0.88)"
                />
              </g>
            );
          }

          // Default 'circle' pip (Classic Ivory concave lathe-drilled socket)
          return (
            <g key={idx}>
              <circle
                cx={cx}
                cy={cy + 0.8}
                r={r * 1.08}
                fill="rgba(255, 255, 255, 0.8)"
              />
              <circle
                cx={cx}
                cy={cy - 0.6}
                r={r * 1.05}
                fill="rgba(15, 23, 42, 0.25)"
              />
              <circle cx={cx} cy={cy} r={r} fill={primaryPipFill} />
              <circle
                cx={cx - r * 0.28}
                cy={cy - r * 0.28}
                r={r * 0.24}
                fill="rgba(255,255,255,0.42)"
              />
            </g>
          );
        })
      )}
    </svg>
  );
};
