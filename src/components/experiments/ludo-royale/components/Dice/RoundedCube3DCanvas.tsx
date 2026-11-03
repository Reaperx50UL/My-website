import React, { useEffect, useRef } from 'react';
import { COLOR_META, getDiceStyleOption } from '../../game/constants';
import { DiceStyle, PlayerColor } from '../../game/gameTypes';
import { CubeFaceOrientation } from './DiceFaceSVG';

export interface RoundedCube3DCanvasProps {
  value: number;
  isRolling: boolean;
  isLanding: boolean;
  diceStyle: DiceStyle;
  activeColor: PlayerColor;
  size: number;
  reducedMotion?: boolean;
}

const TEX_SIZE = 180;

interface FaceMaterialBuffer {
  albedo: Uint8Array; // RGB (TEX_SIZE * TEX_SIZE * 3)
  normalX: Float32Array; // dH/du
  normalY: Float32Array; // dH/dv
  height: Float32Array; // [-1..1]
  emissive: Uint8Array; // RGB (TEX_SIZE * TEX_SIZE * 3)
  roughness: Float32Array; // [0..1]
}

// Standard opposite-faces-sum-to-7 mapping for all 6 faces of the cube
const CUBE_FACE_MAP: Record<number, Record<CubeFaceOrientation, number>> = {
  1: { front: 1, back: 6, right: 2, left: 5, top: 3, bottom: 4 },
  2: { front: 2, back: 5, right: 6, left: 1, top: 3, bottom: 4 },
  3: { front: 3, back: 4, right: 2, left: 5, top: 6, bottom: 1 },
  4: { front: 4, back: 3, right: 2, left: 5, top: 1, bottom: 6 },
  5: { front: 5, back: 2, right: 1, left: 6, top: 3, bottom: 4 },
  6: { front: 6, back: 1, right: 2, left: 5, top: 4, bottom: 3 },
};

const PIP_LAYOUT_100: Record<number, Array<[number, number]>> = {
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

const ROMAN_NUMERALS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
};

// Module-level cache of generated 3D material & normal buffers per (style, face, color)
const faceBufferCache = new Map<string, FaceMaterialBuffer>();

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Fast deterministic 2D hash & value noise for procedural 3D bump maps
function hash2(x: number, y: number, seed: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return h - Math.floor(h);
}

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return mix(mix(a, b, ux), mix(c, d, ux), uy);
}

function fbm(x: number, y: number, seed: number, octaves = 3): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * valueNoise(x * freq, y * freq, seed + i * 19);
    freq *= 2.05;
    amp *= 0.5;
  }
  return val;
}

// Helper to draw a rounded rectangle on a 2D canvas context in [0..100] coordinates
function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function tracePolygon(
  ctx: CanvasRenderingContext2D,
  pts: Array<[number, number]>
) {
  if (pts.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i][0], pts[i][1]);
  }
  ctx.closePath();
}

function traceHexagon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function traceFourPointStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number
) {
  const inner = r * 0.36;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + inner, cy - inner);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx + inner, cy + inner);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - inner, cy + inner);
  ctx.lineTo(cx - r, cy);
  ctx.lineTo(cx - inner, cy - inner);
  ctx.closePath();
}

/**
 * Renders the exact original vector artwork of each die face onto an offscreen
 * 2D canvas in [0..100] coordinate space, then combines it with a 3D height/bump
 * map and emissive map so every die preserves its authentic original design while
 * having genuine 3D surface relief and recessed 3D pips.
 */
function getOrCreateFaceBuffer(
  diceStyle: DiceStyle,
  faceNum: number,
  activeColor: PlayerColor
): FaceMaterialBuffer {
  const colorKey = diceStyle === 'classic_ivory' ? activeColor : 'std';
  const cacheKey = `${diceStyle}:${faceNum}:${colorKey}`;
  const cached = faceBufferCache.get(cacheKey);
  if (cached) return cached;

  const N = TEX_SIZE;
  const albedo = new Uint8Array(N * N * 3);
  const height = new Float32Array(N * N);
  const normalX = new Float32Array(N * N);
  const normalY = new Float32Array(N * N);
  const emissive = new Uint8Array(N * N * 3);
  const roughness = new Float32Array(N * N);

  const styleOpt = getDiceStyleOption(diceStyle);
  const colorMeta = COLOR_META[activeColor] || COLOR_META.red;
  const safeFace = faceNum >= 1 && faceNum <= 6 ? faceNum : 6;
  const pips = PIP_LAYOUT_100[safeFace] || PIP_LAYOUT_100[6];
  const isAccentFace = safeFace === 1 || safeFace === 6;

  const primaryPipFill =
    diceStyle === 'classic_ivory' && isAccentFace
      ? colorMeta.secondaryHex
      : isAccentFace
      ? styleOpt.accentPipColor
      : styleOpt.pipColor;

  // 1. Draw the authentic original face artwork onto an offscreen N x N 2D canvas
  const offCanvas = document.createElement('canvas');
  offCanvas.width = N;
  offCanvas.height = N;
  const ctx = offCanvas.getContext('2d');

  if (ctx) {
    ctx.save();
    ctx.scale(N / 100, N / 100);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // ========================================================================
    // 1. CLASSIC IVORY ("Pearl Micro-Grain")
    // ========================================================================
    if (diceStyle === 'classic_ivory') {
      const bg = ctx.createRadialGradient(32, 28, 4, 50, 50, 78);
      bg.addColorStop(0, '#FFFFFF');
      bg.addColorStop(0.48, '#F8F4EC');
      bg.addColorStop(0.84, '#E5DEC9');
      bg.addColorStop(1, '#CFC5B0');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 100, 100);

      // Subtle concentric ivory grain ring & soft inner frame
      ctx.strokeStyle = 'rgba(168, 158, 142, 0.18)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(50, 50, 38, 0, Math.PI * 2);
      ctx.stroke();

      traceRoundedRect(ctx, 7, 7, 86, 86, 14);
      ctx.strokeStyle = 'rgba(148, 138, 120, 0.22)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }

    // ========================================================================
    // 2. SOVEREIGN GOLD ("24k Brushed Bullion" + Ornate Filigree + Diamond Pips)
    // ========================================================================
    else if (diceStyle === 'royal_gold') {
      const bg = ctx.createRadialGradient(30, 26, 4, 50, 50, 82);
      bg.addColorStop(0, '#FFFBEB');
      bg.addColorStop(0.28, '#FEF08A');
      bg.addColorStop(0.58, '#F59E0B');
      bg.addColorStop(0.85, '#B45309');
      bg.addColorStop(1, '#78350F');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 100, 100);

      const sheen = ctx.createLinearGradient(0, 100, 100, 0);
      sheen.addColorStop(0, 'rgba(120, 53, 15, 0.32)');
      sheen.addColorStop(0.45, 'rgba(254, 240, 138, 0.1)');
      sheen.addColorStop(0.55, 'rgba(255, 251, 235, 0.45)');
      sheen.addColorStop(1, 'rgba(180, 83, 9, 0.22)');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, 100, 100);

      // Embossed Royal Bullion Frame (Shadow + Gold Highlight)
      traceRoundedRect(ctx, 9, 9, 82, 82, 14);
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.72)';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      traceRoundedRect(ctx, 8.2, 8.2, 82, 82, 14);
      ctx.strokeStyle = 'rgba(255, 251, 235, 0.78)';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // Corner Acanthus Scrollwork
      const corners: Array<Array<[number, number]>> = [
        [
          [32, 0],
          [32, 13],
          [13, 32],
          [0, 32],
        ],
        [
          [68, 0],
          [68, 13],
          [87, 32],
          [100, 32],
        ],
        [
          [0, 68],
          [13, 68],
          [32, 87],
          [32, 100],
        ],
        [
          [100, 68],
          [87, 68],
          [68, 87],
          [68, 100],
        ],
      ];
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.65)';
      ctx.lineWidth = 2.0;
      for (const c of corners) {
        ctx.beginPath();
        ctx.moveTo(c[0][0], c[0][1]);
        for (let i = 1; i < c.length; i++) ctx.lineTo(c[i][0], c[i][1]);
        ctx.stroke();
      }
    }

    // ========================================================================
    // 3. CYBER OBSIDIAN ("Carbon PCB Circuit" + Neon Cyan Traces + Hex Pips)
    // ========================================================================
    else if (diceStyle === 'obsidian_neon') {
      const bg = ctx.createRadialGradient(32, 28, 4, 50, 50, 80);
      bg.addColorStop(0, '#334155');
      bg.addColorStop(0.42, '#0F172A');
      bg.addColorStop(0.8, '#060B16');
      bg.addColorStop(1, '#02040A');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 100, 100);

      // Diagonal Carbon-Weave Lines
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.85)';
      ctx.lineWidth = 2.4;
      const diagLines: Array<[number, number, number, number]> = [
        [0, 32, 32, 0],
        [0, 68, 68, 0],
        [0, 100, 100, 0],
        [32, 100, 100, 32],
        [68, 100, 100, 68],
      ];
      for (const [x1, y1, x2, y2] of diagLines) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Deep CNC-Milled Circuit Trenches + Glowing Cyan PCB Traces
      const traces: Array<Array<[number, number]>> = [
        [
          [0, 50],
          [32, 50],
          [40, 42],
        ],
        [
          [100, 50],
          [68, 50],
          [60, 58],
        ],
        [
          [50, 0],
          [50, 32],
          [58, 40],
        ],
        [
          [50, 100],
          [50, 68],
          [42, 60],
        ],
      ];

      ctx.strokeStyle = '#010309';
      ctx.lineWidth = 4.2;
      for (const tr of traces) {
        ctx.beginPath();
        ctx.moveTo(tr[0][0], tr[0][1]);
        ctx.lineTo(tr[1][0], tr[1][1]);
        ctx.lineTo(tr[2][0], tr[2][1]);
        ctx.stroke();
      }
      traceRoundedRect(ctx, 9, 9, 82, 82, 14);
      ctx.stroke();

      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 2.6;
      for (const tr of traces) {
        ctx.beginPath();
        ctx.moveTo(tr[0][0], tr[0][1]);
        ctx.lineTo(tr[1][0], tr[1][1]);
        ctx.lineTo(tr[2][0], tr[2][1]);
        ctx.stroke();
      }
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.3;
      for (const tr of traces) {
        ctx.beginPath();
        ctx.moveTo(tr[0][0], tr[0][1]);
        ctx.lineTo(tr[1][0], tr[1][1]);
        ctx.lineTo(tr[2][0], tr[2][1]);
        ctx.stroke();
      }
      traceRoundedRect(ctx, 9, 9, 82, 82, 14);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.72)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ========================================================================
    // 4. IMPERIAL JADE ("Veined Imperial Jade" + Gold Frame + Celestial Star Pips)
    // ========================================================================
    else if (diceStyle === 'emerald_jade') {
      const bg = ctx.createRadialGradient(30, 26, 4, 50, 50, 82);
      bg.addColorStop(0, '#A7F3D0');
      bg.addColorStop(0.3, '#10B981');
      bg.addColorStop(0.7, '#047857');
      bg.addColorStop(1, '#022C22');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 100, 100);

      // Jadeite mineral clouds & veins
      ctx.save();
      ctx.translate(34, 32);
      ctx.rotate((-24 * Math.PI) / 180);
      ctx.fillStyle = 'rgba(209, 250, 229, 0.24)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 32, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(209, 250, 229, 0.45)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(0, 32);
      ctx.bezierCurveTo(24, 36, 36, 18, 56, 34);
      ctx.bezierCurveTo(74, 50, 74, 64, 100, 68);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(2, 44, 34, 0.56)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(32, 100);
      ctx.bezierCurveTo(36, 70, 50, 68, 64, 44);
      ctx.bezierCurveTo(72, 26, 66, 16, 68, 0);
      ctx.stroke();

      // Recessed Gold-Leaf Inlay Frame
      traceRoundedRect(ctx, 9.5, 9.5, 81, 81, 14);
      ctx.strokeStyle = 'rgba(2, 44, 34, 0.72)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      traceRoundedRect(ctx, 8.8, 8.8, 81, 81, 14);
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.78)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }

    // ========================================================================
    // 5. DRAGON RUBY ("Prism Ruby Facets" + Octagonal Table + Diamond Pips)
    // ========================================================================
    else if (diceStyle === 'crimson_ruby') {
      const bg = ctx.createRadialGradient(30, 26, 4, 50, 50, 82);
      bg.addColorStop(0, '#FECACA');
      bg.addColorStop(0.28, '#EF4444');
      bg.addColorStop(0.66, '#991B1B');
      bg.addColorStop(1, '#2A0404');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 100, 100);

      // 4 Crown & Pavilion Gemstone Facet Planes
      tracePolygon(ctx, [
        [0, 0],
        [100, 0],
        [50, 50],
      ]);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fill();

      tracePolygon(ctx, [
        [0, 100],
        [0, 0],
        [50, 50],
      ]);
      ctx.fillStyle = 'rgba(254, 202, 202, 0.12)';
      ctx.fill();

      tracePolygon(ctx, [
        [100, 0],
        [100, 100],
        [50, 50],
      ]);
      ctx.fillStyle = 'rgba(69, 10, 10, 0.28)';
      ctx.fill();

      tracePolygon(ctx, [
        [100, 100],
        [0, 100],
        [50, 50],
      ]);
      ctx.fillStyle = 'rgba(36, 4, 4, 0.52)';
      ctx.fill();

      // Inner Raised Octagonal Table Facet & Gold Border
      tracePolygon(ctx, [
        [32, 12],
        [68, 12],
        [88, 32],
        [88, 68],
        [68, 88],
        [32, 88],
        [12, 68],
        [12, 32],
      ]);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.62)';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // Corner Facet Ridges
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.lineWidth = 1.0;
      const facetLines: Array<[number, number, number, number]> = [
        [0, 0, 32, 12],
        [0, 0, 12, 32],
        [100, 0, 68, 12],
        [100, 0, 88, 32],
        [100, 100, 88, 68],
        [0, 100, 12, 68],
      ];
      for (const [x1, y1, x2, y2] of facetLines) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // ========================================================================
    // 6. ASTRAL RUNIC ("Nebula Star Chart" + Gilded Roman Numerals I..VI)
    // ========================================================================
    else if (diceStyle === 'celestial_runic') {
      const bg = ctx.createRadialGradient(32, 28, 4, 50, 50, 82);
      bg.addColorStop(0, '#5B21B6');
      bg.addColorStop(0.46, '#1E1B4B');
      bg.addColorStop(0.82, '#0D0924');
      bg.addColorStop(1, '#050310');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 100, 100);

      // Nebula ellipse
      ctx.save();
      ctx.translate(50, 50);
      ctx.rotate((-28 * Math.PI) / 180);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 40, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Astrolabe circles
      ctx.beginPath();
      ctx.arc(50, 50, 39, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.lineWidth = 3.2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(196, 181, 253, 0.72)';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.save();
      ctx.setLineDash([4, 2.5]);
      ctx.beginPath();
      ctx.arc(50, 50, 32, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.48)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.restore();

      // Corner Nordic Runes
      ctx.strokeStyle = 'rgba(216, 180, 254, 0.8)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      // Top-Left
      ctx.moveTo(13, 21);
      ctx.lineTo(17, 14);
      ctx.lineTo(21, 21);
      ctx.moveTo(15, 18);
      ctx.lineTo(19, 18);
      // Top-Right
      ctx.moveTo(79, 21);
      ctx.lineTo(83, 14);
      ctx.lineTo(87, 21);
      ctx.moveTo(83, 14);
      ctx.lineTo(83, 22);
      // Bottom-Left
      ctx.moveTo(13, 79);
      ctx.lineTo(17, 86);
      ctx.lineTo(21, 79);
      // Bottom-Right
      ctx.moveTo(79, 79);
      ctx.lineTo(87, 86);
      ctx.moveTo(87, 79);
      ctx.lineTo(79, 86);
      ctx.stroke();
    }

    // ========================================================================
    // 7. LAVA CUBE ("FORGED IN VOLCANIC CORE") — Exact Match to Reference
    // ========================================================================
    else if (diceStyle === 'lava_cube') {
      // Deep glowing molten magma base
      const magmaBg = ctx.createRadialGradient(50, 50, 4, 50, 50, 76);
      magmaBg.addColorStop(0, '#FFF59D');
      magmaBg.addColorStop(0.26, '#FF9100');
      magmaBg.addColorStop(0.58, '#FF3D00');
      magmaBg.addColorStop(0.86, '#990F00');
      magmaBg.addColorStop(1, '#260400');
      ctx.fillStyle = magmaBg;
      ctx.fillRect(0, 0, 100, 100);

      // Irregular Voronoi-style craggy volcanic obsidian/basalt rock chunks
      // with a dark sunken central volcanic basin (no regular 3x3 grid!)
      const basaltChunks: Array<Array<[number, number]>> = [
        // Top-left corner chunk
        [
          [0, 0],
          [26, 0],
          [31, 14],
          [22, 24],
          [11, 21],
          [0, 27],
        ],
        // Top-mid-left chunk
        [
          [29, 0],
          [53, 0],
          [49, 15],
          [35, 17],
        ],
        // Top-mid-right chunk
        [
          [56, 0],
          [75, 0],
          [71, 17],
          [53, 16],
        ],
        // Top-right corner chunk
        [
          [78, 0],
          [100, 0],
          [100, 26],
          [86, 22],
          [75, 19],
        ],
        // Upper-left flank chunk
        [
          [0, 30],
          [12, 24],
          [24, 27],
          [27, 41],
          [15, 47],
          [0, 46],
        ],
        // Upper-inner-left chunk
        [
          [25, 24],
          [36, 19],
          [47, 21],
          [43, 33],
          [30, 37],
        ],
        // Upper-inner-right chunk
        [
          [51, 19],
          [69, 20],
          [74, 32],
          [60, 36],
          [47, 32],
        ],
        // Upper-right flank chunk
        [
          [77, 22],
          [88, 25],
          [100, 29],
          [100, 49],
          [84, 46],
          [76, 35],
        ],
        // Deep Sunken Central Volcanic Basin (irregular dark octagonal crag)
        [
          [33, 40],
          [46, 35],
          [59, 38],
          [66, 49],
          [61, 61],
          [48, 65],
          [35, 60],
          [29, 49],
        ],
        // Lower-left flank chunk
        [
          [0, 49],
          [16, 50],
          [26, 45],
          [27, 61],
          [17, 69],
          [0, 71],
        ],
        // Lower-right flank chunk
        [
          [74, 39],
          [85, 49],
          [100, 52],
          [100, 72],
          [83, 69],
          [69, 58],
        ],
        // Lower-inner-left chunk
        [
          [29, 63],
          [45, 67],
          [43, 80],
          [26, 78],
          [21, 68],
        ],
        // Lower-inner-right chunk
        [
          [50, 67],
          [64, 63],
          [76, 68],
          [71, 80],
          [52, 81],
        ],
        // Bottom-left corner chunk
        [
          [0, 74],
          [18, 72],
          [24, 81],
          [27, 100],
          [0, 100],
        ],
        // Bottom-mid-left chunk
        [
          [30, 81],
          [47, 83],
          [49, 100],
          [30, 100],
        ],
        // Bottom-mid-right chunk
        [
          [52, 83],
          [70, 82],
          [73, 100],
          [52, 100],
        ],
        // Bottom-right corner chunk
        [
          [79, 71],
          [100, 75],
          [100, 100],
          [76, 100],
          [74, 81],
        ],
      ];

      // Deep canyon drop shadows under each basalt chunk
      ctx.save();
      ctx.translate(1.2, 1.5);
      ctx.fillStyle = '#050100';
      for (const chunk of basaltChunks) {
        tracePolygon(ctx, chunk);
        ctx.fill();
      }
      ctx.restore();

      // Dark charcoal-black volcanic obsidian rock fill with warm ember rim lighting
      for (let i = 0; i < basaltChunks.length; i++) {
        const chunk = basaltChunks[i];
        let cxAvg = 0;
        let cyAvg = 0;
        for (const [px, py] of chunk) {
          cxAvg += px;
          cyAvg += py;
        }
        cxAvg /= chunk.length;
        cyAvg /= chunk.length;

        const isCenterBasin = i === 8;
        const rGrad = ctx.createRadialGradient(
          cxAvg - 4,
          cyAvg - 4,
          1,
          cxAvg,
          cyAvg,
          24
        );
        if (isCenterBasin) {
          rGrad.addColorStop(0, '#1C1412');
          rGrad.addColorStop(0.55, '#0F0A09');
          rGrad.addColorStop(1, '#060302');
        } else {
          rGrad.addColorStop(0, i % 2 === 0 ? '#2B201D' : '#241B18');
          rGrad.addColorStop(0.6, '#140E0C');
          rGrad.addColorStop(1, '#080504');
        }

        tracePolygon(ctx, chunk);
        ctx.fillStyle = rGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 85, 15, 0.36)';
        ctx.lineWidth = 0.85;
        ctx.stroke();

        // Rough craggy rock facet highlight on each fragment
        if (chunk.length >= 4) {
          ctx.beginPath();
          ctx.moveTo(
            mix(chunk[0][0], cxAvg, 0.25),
            mix(chunk[0][1], cyAvg, 0.25)
          );
          ctx.lineTo(
            mix(chunk[1][0], cxAvg, 0.25),
            mix(chunk[1][1], cyAvg, 0.25)
          );
          ctx.lineTo(cxAvg, cyAvg);
          ctx.closePath();
          ctx.fillStyle = isCenterBasin
            ? 'rgba(255, 140, 60, 0.08)'
            : 'rgba(255, 175, 110, 0.14)';
          ctx.fill();
        }
      }

      // Jagged branching molten lava fissures across the volcanic surface
      const mainFissures: Array<Array<[number, number]>> = [
        [
          [27, 0],
          [32, 16],
          [23, 25],
          [12, 22],
          [0, 28],
        ],
        [
          [54, 0],
          [50, 17],
          [35, 18],
          [32, 16],
        ],
        [
          [76, 0],
          [73, 18],
          [50, 17],
        ],
        [
          [100, 27],
          [87, 23],
          [73, 18],
        ],
        [
          [23, 25],
          [29, 39],
          [16, 48],
          [0, 47],
        ],
        [
          [50, 17],
          [46, 33],
          [29, 39],
        ],
        [
          [73, 18],
          [75, 34],
          [60, 37],
          [46, 33],
        ],
        [
          [75, 34],
          [85, 47],
          [100, 50],
        ],
        [
          [29, 39],
          [28, 49],
          [34, 61],
          [48, 66],
          [62, 62],
          [68, 49],
          [60, 37],
        ],
        [
          [16, 48],
          [28, 49],
        ],
        [
          [68, 49],
          [85, 47],
        ],
        [
          [34, 61],
          [20, 69],
          [0, 72],
        ],
        [
          [20, 69],
          [26, 80],
          [28, 100],
        ],
        [
          [48, 66],
          [46, 82],
          [50, 100],
        ],
        [
          [26, 80],
          [46, 82],
          [72, 81],
        ],
        [
          [62, 62],
          [77, 69],
          [100, 73],
        ],
        [
          [77, 69],
          [72, 81],
          [75, 100],
        ],
      ];

      // Also connect glowing magma veins directly into each pip crater on this face
      for (const [px, py] of pips) {
        mainFissures.push([
          [px, py],
          [
            clamp(px + (px < 50 ? -11 : 11), 6, 94),
            clamp(py + (py < 50 ? -9 : 9), 6, 94),
          ],
        ]);
        mainFissures.push([
          [px, py],
          [mix(px, 50, 0.48), mix(py, 50, 0.48)],
        ]);
      }

      const strokeFissures = (color: string, width: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        for (const ch of mainFissures) {
          ctx.beginPath();
          ctx.moveTo(ch[0][0], ch[0][1]);
          for (let i = 1; i < ch.length; i++) ctx.lineTo(ch[i][0], ch[i][1]);
          ctx.stroke();
        }
      };

      strokeFissures('rgba(215, 25, 0, 0.85)', 3.8);
      strokeFissures('#FF6D00', 2.0);
      strokeFissures('#FFEE58', 0.85);

      // Fine secondary hair-cracks across the dark volcanic rock
      const hairCracks: Array<Array<[number, number]>> = [
        [
          [10, 9],
          [18, 14],
          [14, 21],
        ],
        [
          [86, 9],
          [82, 16],
          [91, 19],
        ],
        [
          [11, 84],
          [17, 79],
          [21, 88],
        ],
        [
          [88, 86],
          [82, 79],
          [91, 77],
        ],
        [
          [40, 46],
          [49, 51],
          [57, 45],
        ],
        [
          [43, 56],
          [50, 51],
          [56, 57],
        ],
      ];
      ctx.strokeStyle = '#FF5500';
      ctx.lineWidth = 0.9;
      for (const hc of hairCracks) {
        ctx.beginPath();
        ctx.moveTo(hc[0][0], hc[0][1]);
        for (let i = 1; i < hc.length; i++) ctx.lineTo(hc[i][0], hc[i][1]);
        ctx.stroke();
      }

      // Glowing Molten Outer Rounded Rim Border (matches the glowing orange-yellow frame in screenshot)
      traceRoundedRect(ctx, 4.5, 4.5, 91, 91, 14);
      ctx.strokeStyle = 'rgba(220, 38, 0, 0.85)';
      ctx.lineWidth = 4.2;
      ctx.stroke();

      traceRoundedRect(ctx, 4.5, 4.5, 91, 91, 14);
      ctx.strokeStyle = '#FF7700';
      ctx.lineWidth = 2.1;
      ctx.stroke();

      traceRoundedRect(ctx, 4.5, 4.5, 91, 91, 14);
      ctx.strokeStyle = '#FFF176';
      ctx.lineWidth = 0.85;
      ctx.stroke();

      // Incandescent ember sparks near corners & rim
      const embers: Array<[number, number, number]> = [
        [14, 7, 1.3],
        [85, 8, 1.2],
        [7, 18, 1.1],
        [93, 22, 1.3],
        [8, 82, 1.2],
        [92, 84, 1.3],
        [18, 93, 1.1],
        [82, 93, 1.2],
      ];
      for (const [ex, ey, er] of embers) {
        ctx.beginPath();
        ctx.arc(ex, ey, er, 0, Math.PI * 2);
        ctx.fillStyle = '#FFF59D';
        ctx.fill();
      }
    }

    // ========================================================================
    // 8. ELECTRO CUBE ("POWERED BY PURE ENERGY") — Exact Match to Reference
    // ========================================================================
    else if (diceStyle === 'electro_cube') {
      // Deep dark metallic navy-slate core
      const bg = ctx.createRadialGradient(50, 50, 4, 50, 50, 78);
      bg.addColorStop(0, '#132846');
      bg.addColorStop(0.45, '#0A1628');
      bg.addColorStop(0.82, '#050B16');
      bg.addColorStop(1, '#02050B');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 100, 100);

      // Dark metallic tech sub-panels & recessed mechanical seams
      ctx.strokeStyle = '#02060E';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(50, 12);
      ctx.lineTo(50, 88);
      ctx.moveTo(12, 50);
      ctx.lineTo(88, 50);
      ctx.moveTo(20, 20);
      ctx.lineTo(80, 80);
      ctx.moveTo(80, 20);
      ctx.lineTo(20, 80);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(50, 12);
      ctx.lineTo(50, 88);
      ctx.moveTo(12, 50);
      ctx.lineTo(88, 50);
      ctx.stroke();

      // Central Recessed Dark Metallic Reactor Ring (prominent on faces 1-6 in reference)
      ctx.beginPath();
      ctx.arc(50, 50, 24, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(4, 10, 22, 0.72)';
      ctx.fill();
      ctx.strokeStyle = '#02060D';
      ctx.lineWidth = 3.6;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(50, 50, 24, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.52)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(50, 50, 18.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Inner rounded metallic frame rail
      traceRoundedRect(ctx, 11.5, 11.5, 77, 77, 13);
      ctx.strokeStyle = '#02060E';
      ctx.lineWidth = 4.6;
      ctx.stroke();

      traceRoundedRect(ctx, 11.5, 11.5, 77, 77, 13);
      ctx.strokeStyle = 'rgba(0, 140, 255, 0.72)';
      ctx.lineWidth = 2.8;
      ctx.stroke();

      traceRoundedRect(ctx, 11.5, 11.5, 77, 77, 13);
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // 4 Glowing Cyan-White Energy Bar Conduits along the 4 straight edges (between corner armor)
      const edgeBars: Array<[number, number, number, number]> = [
        [28, 7.5, 72, 7.5], // Top edge bar
        [28, 92.5, 72, 92.5], // Bottom edge bar
        [7.5, 28, 7.5, 72], // Left edge bar
        [92.5, 28, 92.5, 72], // Right edge bar
      ];
      for (const [x1, y1, x2, y2] of edgeBars) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(0, 110, 255, 0.88)';
        ctx.lineWidth = 5.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2.8;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Jagged Branching White-Cyan Lightning Bolts Crackling Across the Face
      const lightningBolts: Array<Array<[number, number]>> = [
        [
          [22, 14],
          [31, 21],
          [27, 28],
          [38, 35],
          [44, 44],
        ],
        [
          [78, 14],
          [69, 22],
          [73, 29],
          [62, 36],
          [56, 44],
        ],
        [
          [14, 76],
          [24, 68],
          [21, 61],
          [34, 56],
          [43, 52],
        ],
        [
          [86, 76],
          [75, 69],
          [78, 61],
          [65, 55],
          [56, 52],
        ],
        [
          [50, 8],
          [46, 18],
          [53, 25],
          [49, 36],
        ],
        [
          [50, 92],
          [54, 81],
          [47, 74],
          [51, 64],
        ],
      ];
      // Also arc lightning directly into each pip position
      for (const [px, py] of pips) {
        lightningBolts.push([
          [px, py],
          [px + (px < 50 ? -8 : 8), py + (py < 50 ? -5 : 5)],
          [px + (px < 50 ? -14 : 14), py + (py < 50 ? -12 : 12)],
        ]);
      }

      const strokeLightning = (color: string, width: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        for (const bolt of lightningBolts) {
          ctx.beginPath();
          ctx.moveTo(bolt[0][0], bolt[0][1]);
          for (let i = 1; i < bolt.length; i++) {
            ctx.lineTo(bolt[i][0], bolt[i][1]);
          }
          ctx.stroke();
        }
      };
      strokeLightning('rgba(0, 160, 255, 0.72)', 2.8);
      strokeLightning('#00F0FF', 1.4);
      strokeLightning('#FFFFFF', 0.65);

      // 4 Heavy Chamfered Silver/Gunmetal Metallic Corner Armor Brackets (Exact match to reference)
      const cornerBrackets: Array<{
        outer: Array<[number, number]>;
        innerHighlight: Array<[number, number]>;
        notch: [number, number, number, number];
      }> = [
        // Top-Left Bracket
        {
          outer: [
            [0, 0],
            [29, 0],
            [29, 9],
            [20, 12],
            [12, 20],
            [9, 29],
            [0, 29],
          ],
          innerHighlight: [
            [3, 26],
            [8, 26],
            [11, 18],
            [18, 11],
            [26, 8],
            [26, 3],
          ],
          notch: [8, 8, 6, 6],
        },
        // Top-Right Bracket
        {
          outer: [
            [71, 0],
            [100, 0],
            [100, 29],
            [91, 29],
            [88, 20],
            [80, 12],
            [71, 9],
          ],
          innerHighlight: [
            [74, 3],
            [74, 8],
            [82, 11],
            [89, 18],
            [92, 26],
            [97, 26],
          ],
          notch: [86, 8, 6, 6],
        },
        // Bottom-Left Bracket
        {
          outer: [
            [0, 71],
            [9, 71],
            [12, 80],
            [20, 88],
            [29, 91],
            [29, 100],
            [0, 100],
          ],
          innerHighlight: [
            [3, 74],
            [8, 74],
            [11, 82],
            [18, 89],
            [26, 92],
            [26, 97],
          ],
          notch: [8, 86, 6, 6],
        },
        // Bottom-Right Bracket
        {
          outer: [
            [71, 91],
            [80, 88],
            [88, 80],
            [91, 71],
            [100, 71],
            [100, 100],
            [71, 100],
          ],
          innerHighlight: [
            [74, 97],
            [74, 92],
            [82, 89],
            [89, 82],
            [92, 74],
            [97, 74],
          ],
          notch: [86, 86, 6, 6],
        },
      ];

      const armorGrad = ctx.createLinearGradient(0, 0, 100, 100);
      armorGrad.addColorStop(0, '#F8FAFC');
      armorGrad.addColorStop(0.25, '#CBD5E1');
      armorGrad.addColorStop(0.55, '#64748B');
      armorGrad.addColorStop(0.82, '#334155');
      armorGrad.addColorStop(1, '#0F172A');

      for (const cb of cornerBrackets) {
        // Drop shadow under bracket
        ctx.save();
        ctx.translate(1.2, 1.4);
        tracePolygon(ctx, cb.outer);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fill();
        ctx.restore();

        // Metallic bracket body
        tracePolygon(ctx, cb.outer);
        ctx.fillStyle = armorGrad;
        ctx.fill();
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Machined silver inner bevel ridge
        ctx.beginPath();
        ctx.moveTo(cb.innerHighlight[0][0], cb.innerHighlight[0][1]);
        for (let i = 1; i < cb.innerHighlight.length; i++) {
          ctx.lineTo(cb.innerHighlight[i][0], cb.innerHighlight[i][1]);
        }
        ctx.strokeStyle = '#F1F5F9';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Dark recessed mechanical socket notch in corner armor
        const [nx, ny, nw, nh] = cb.notch;
        traceRoundedRect(ctx, nx, ny, nw, nh, 1.5);
        ctx.fillStyle = '#091322';
        ctx.fill();
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }
    }

    // ========================================================================
    // 9. TESSERACT CUBE ("BEYOND DIMENSIONS") — Exact Match to Reference
    // ========================================================================
    else if (diceStyle === 'tesseract_cube') {
      // Deep translucent violet-indigo hypercube crystal interior
      const bg = ctx.createRadialGradient(50, 50, 4, 50, 50, 82);
      bg.addColorStop(0, '#3B1578');
      bg.addColorStop(0.42, '#1E0B45');
      bg.addColorStop(0.78, '#0E0526');
      bg.addColorStop(1, '#050212');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 100, 100);

      // Prismatic glass refraction planes (cyan top/left, magenta-violet bottom/right)
      tracePolygon(ctx, [
        [6, 6],
        [94, 6],
        [76, 24],
        [24, 24],
      ]);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.20)';
      ctx.fill();

      tracePolygon(ctx, [
        [6, 6],
        [24, 24],
        [24, 76],
        [6, 94],
      ]);
      ctx.fillStyle = 'rgba(192, 132, 252, 0.18)';
      ctx.fill();

      tracePolygon(ctx, [
        [94, 6],
        [94, 94],
        [76, 76],
        [76, 24],
      ]);
      ctx.fillStyle = 'rgba(109, 40, 217, 0.22)';
      ctx.fill();

      tracePolygon(ctx, [
        [6, 94],
        [24, 76],
        [76, 76],
        [94, 94],
      ]);
      ctx.fillStyle = 'rgba(217, 70, 239, 0.16)';
      ctx.fill();

      // 8-Point Starburst / Octagram Geometric Laser Grid passing through (50,50)
      const laserLines: Array<[number, number, number, number]> = [
        // Primary axes
        [6, 50, 94, 50],
        [50, 6, 50, 94],
        // 4D corner perspective struts
        [6, 6, 94, 94],
        [94, 6, 6, 94],
        // Outer diamond octagram
        [50, 11, 89, 50],
        [89, 50, 50, 89],
        [50, 89, 11, 50],
        [11, 50, 50, 11],
        // Starburst rays from inner cube vertices through center
        [24, 24, 50, 89],
        [76, 24, 50, 89],
        [24, 76, 50, 11],
        [76, 76, 50, 11],
        [24, 24, 89, 50],
        [24, 76, 89, 50],
        [76, 24, 11, 50],
        [76, 76, 11, 50],
      ];

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
      ctx.lineWidth = 1.6;
      for (const [x1, y1, x2, y2] of laserLines) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(232, 121, 249, 0.65)';
      ctx.lineWidth = 0.75;
      for (const [x1, y1, x2, y2] of laserLines) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // 4 Prominent 4D Perspective Corner Struts connecting Outer Frame to Inner Cube
      const cornerStruts: Array<[number, number, number, number]> = [
        [6, 6, 36, 36],
        [94, 6, 64, 36],
        [6, 94, 36, 64],
        [94, 94, 64, 64],
      ];
      ctx.strokeStyle = '#67E8F9';
      ctx.lineWidth = 2.0;
      for (const [x1, y1, x2, y2] of cornerStruts) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 0.8;
      for (const [x1, y1, x2, y2] of cornerStruts) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Nested 3D Inner Cube Squares (The signature Tesseract hypercube chambers)
      // 1) Outer chamber frame (13..87)
      traceRoundedRect(ctx, 13, 13, 74, 74, 6);
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 2) Main Nested Inner Cube (24..76)
      traceRoundedRect(ctx, 24, 24, 52, 52, 3);
      ctx.fillStyle = 'rgba(12, 6, 34, 0.36)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.strokeStyle = '#F5D0FE';
      ctx.lineWidth = 0.9;
      ctx.stroke();

      // 3) Deep Inner Cube (36..64)
      traceRoundedRect(ctx, 36, 36, 28, 28, 2);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.18)';
      ctx.fill();
      ctx.strokeStyle = '#E879F9';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 0.65;
      ctx.stroke();

      // Bright Glowing Crystalline Outer Perimeter Frame
      traceRoundedRect(ctx, 5.5, 5.5, 89, 89, 12);
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.88)';
      ctx.lineWidth = 3.8;
      ctx.stroke();

      traceRoundedRect(ctx, 5.5, 5.5, 89, 89, 12);
      ctx.strokeStyle = '#67E8F9';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      traceRoundedRect(ctx, 5.5, 5.5, 89, 89, 12);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Glowing dimensional vertex nodes at hypercube corners
      const vertices: Array<[number, number]> = [
        [24, 24],
        [76, 24],
        [24, 76],
        [76, 76],
        [36, 36],
        [64, 36],
        [36, 64],
        [64, 64],
      ];
      for (const [vx, vy] of vertices) {
        ctx.beginPath();
        ctx.arc(vx, vy, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }
    }

    // ========================================================================
    // 10. COSMO CUBE ("A UNIVERSE IN YOUR HANDS") — Exact Match to Reference
    // ========================================================================
    else if (diceStyle === 'cosmo_cube') {
      // Deep space midnight background
      const bg = ctx.createRadialGradient(50, 50, 4, 50, 50, 84);
      bg.addColorStop(0, '#2A115E');
      bg.addColorStop(0.42, '#130734');
      bg.addColorStop(0.78, '#070318');
      bg.addColorStop(1, '#02010A');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 100, 100);

      // Vibrant multi-cloud cosmic nebulae (magenta-pink, royal violet, turquoise-cyan)
      const drawNebulaCloud = (
        cx: number,
        cy: number,
        rx: number,
        ry: number,
        angleDeg: number,
        innerCol: string,
        midCol: string
      ) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((angleDeg * Math.PI) / 180);
        const ng = ctx.createRadialGradient(0, 0, 2, 0, 0, Math.max(rx, ry));
        ng.addColorStop(0, innerCol);
        ng.addColorStop(0.5, midCol);
        ng.addColorStop(1, 'rgba(4, 2, 16, 0)');
        ctx.fillStyle = ng;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      drawNebulaCloud(
        34,
        32,
        40,
        24,
        -28,
        'rgba(236, 72, 153, 0.52)',
        'rgba(147, 51, 234, 0.28)'
      );
      drawNebulaCloud(
        66,
        68,
        40,
        24,
        -28,
        'rgba(56, 189, 248, 0.48)',
        'rgba(37, 99, 235, 0.26)'
      );
      drawNebulaCloud(
        50,
        50,
        42,
        36,
        18,
        'rgba(192, 132, 252, 0.55)',
        'rgba(79, 70, 229, 0.26)'
      );

      // Swirling Spiral Galaxy Vortex in the center of the cube
      const drawGalaxySpiralArm = (
        startAngle: number,
        colorGlow: string,
        colorCore: string
      ) => {
        ctx.save();
        ctx.translate(50, 50);
        ctx.rotate(startAngle);

        ctx.beginPath();
        for (let t = 0; t <= 42; t++) {
          const prog = t / 42;
          const theta = prog * Math.PI * 1.65;
          const rad = 2.5 + prog * 37;
          const gx = Math.cos(theta) * rad;
          const gy = Math.sin(theta) * rad * 0.82;
          if (t === 0) ctx.moveTo(gx, gy);
          else ctx.lineTo(gx, gy);
        }
        ctx.strokeStyle = colorGlow;
        ctx.lineWidth = 6.5;
        ctx.stroke();

        ctx.strokeStyle = colorCore;
        ctx.lineWidth = 2.0;
        ctx.stroke();
        ctx.restore();
      };

      drawGalaxySpiralArm(0, 'rgba(236, 72, 153, 0.48)', '#F5D0FE');
      drawGalaxySpiralArm(Math.PI, 'rgba(168, 85, 247, 0.52)', '#E9D5FF');
      drawGalaxySpiralArm(Math.PI * 0.5, 'rgba(56, 189, 248, 0.46)', '#BAE6FD');
      drawGalaxySpiralArm(Math.PI * 1.5, 'rgba(99, 102, 241, 0.44)', '#C7D2FE');

      // Bright galactic nucleus glow
      const coreGlow = ctx.createRadialGradient(50, 50, 1, 50, 50, 20);
      coreGlow.addColorStop(0, '#FFFFFF');
      coreGlow.addColorStop(0.32, 'rgba(245, 208, 254, 0.92)');
      coreGlow.addColorStop(0.68, 'rgba(168, 85, 247, 0.45)');
      coreGlow.addColorStop(1, 'rgba(15, 7, 40, 0)');
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(50, 50, 20, 0, Math.PI * 2);
      ctx.fill();

      // Golden-Amber & Rose-Gold Elliptical Planetary Orbital Rings (Exact match to reference)
      ctx.save();
      ctx.translate(50, 50);
      ctx.rotate((-32 * Math.PI) / 180);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.72)';
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.ellipse(0, 0, 43, 16, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(244, 114, 182, 0.58)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(0, 0, 36, 22, 0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Dense Starfield & 4-Point Cosmic Starlight Glints
      const starCount = 34;
      for (let s = 0; s < starCount; s++) {
        const sx = 9 + hash2(s, safeFace, 101) * 82;
        const sy = 9 + hash2(safeFace, s, 202) * 82;
        const sr = 0.55 + hash2(s, s, 303) * 0.95;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fillStyle =
          s % 4 === 0
            ? '#FDE68A'
            : s % 3 === 0
            ? '#BAE6FD'
            : s % 2 === 0
            ? '#F5D0FE'
            : '#FFFFFF';
        ctx.fill();
      }

      // Glossy Rounded Cosmic Glass Outer Rim with Golden-Rose & Cyan Starlight Reflections
      const rimGrad = ctx.createLinearGradient(0, 0, 100, 100);
      rimGrad.addColorStop(0, '#7DD3FC');
      rimGrad.addColorStop(0.28, '#C084FC');
      rimGrad.addColorStop(0.55, '#F472B6');
      rimGrad.addColorStop(0.8, '#FBBF24');
      rimGrad.addColorStop(1, '#FEF08A');

      traceRoundedRect(ctx, 5, 5, 90, 90, 14);
      ctx.strokeStyle = rimGrad;
      ctx.lineWidth = 3.0;
      ctx.stroke();

      traceRoundedRect(ctx, 5, 5, 90, 90, 14);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }

    // ========================================================================
    // DRAW PIP SHAPES / ROMAN NUMERALS FOR ALL 10 DICE
    // ========================================================================
    if (styleOpt.pipShape === 'roman') {
      // Astral Runic: Constellation lines + star dots + Gilded Roman Numerals I..VI
      if (pips.length > 1) {
        ctx.save();
        ctx.setLineDash([2.2, 2.2]);
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(pips[0][0], pips[0][1]);
        for (let i = 1; i < pips.length; i++) {
          ctx.lineTo(pips[i][0], pips[i][1]);
        }
        ctx.stroke();
        ctx.restore();
      }
      for (const [cx, cy] of pips) {
        ctx.beginPath();
        ctx.arc(cx, cy, 3.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(253, 230, 138, 0.38)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }
      const fontSize = safeFace === 4 || safeFace === 6 ? 34 : 38;
      ctx.font = `800 ${fontSize}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
      ctx.fillText(ROMAN_NUMERALS[safeFace], 51.2, 64);
      ctx.fillStyle = primaryPipFill;
      ctx.fillText(ROMAN_NUMERALS[safeFace], 50, 62.2);
    } else {
      for (const [cx, cy] of pips) {
        const r = safeFace === 1 ? 11.4 : 8.8;

        if (styleOpt.pipShape === 'magma') {
          // Lava Cube: Glowing Molten Magma Crater Orb (Exact match to Column 1 of reference)
          const outerHeat = ctx.createRadialGradient(
            cx,
            cy,
            r * 0.2,
            cx,
            cy,
            r * 1.55
          );
          outerHeat.addColorStop(0, '#FF6D00');
          outerHeat.addColorStop(0.55, 'rgba(255, 45, 0, 0.65)');
          outerHeat.addColorStop(1, 'rgba(180, 10, 0, 0)');
          ctx.beginPath();
          ctx.arc(cx, cy, r * 1.55, 0, Math.PI * 2);
          ctx.fillStyle = outerHeat;
          ctx.fill();

          // Dark charred volcanic crater lip
          ctx.beginPath();
          ctx.arc(cx, cy, r * 1.18, 0, Math.PI * 2);
          ctx.fillStyle = '#0B0402';
          ctx.fill();
          ctx.strokeStyle = '#FF3D00';
          ctx.lineWidth = 1.3;
          ctx.stroke();

          // Molten orange-red-yellow magma pool gradient
          const pg = ctx.createRadialGradient(
            cx - r * 0.12,
            cy - r * 0.12,
            r * 0.08,
            cx,
            cy,
            r * 1.04
          );
          pg.addColorStop(0, '#FFFFFF');
          pg.addColorStop(0.28, '#FFF59D');
          pg.addColorStop(0.56, '#FF9100');
          pg.addColorStop(0.84, '#FF2A00');
          pg.addColorStop(1, '#7F0900');
          ctx.beginPath();
          ctx.arc(cx, cy, r * 1.04, 0, Math.PI * 2);
          ctx.fillStyle = pg;
          ctx.fill();

          // Incandescent yellow-white core
          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.54, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFDE7';
          ctx.fill();
        } else if (styleOpt.pipShape === 'plasma') {
          // Electro Cube: Intense Blue-White Plasma Sphere (Exact match to Column 2 of reference)
          const corona = ctx.createRadialGradient(
            cx,
            cy,
            r * 0.1,
            cx,
            cy,
            r * 1.65
          );
          corona.addColorStop(0, '#FFFFFF');
          corona.addColorStop(0.35, '#00F0FF');
          corona.addColorStop(0.7, 'rgba(0, 110, 255, 0.58)');
          corona.addColorStop(1, 'rgba(0, 40, 120, 0)');
          ctx.beginPath();
          ctx.arc(cx, cy, r * 1.65, 0, Math.PI * 2);
          ctx.fillStyle = corona;
          ctx.fill();

          // Recessed dark metallic socket rim
          ctx.beginPath();
          ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2);
          ctx.fillStyle = '#040B18';
          ctx.fill();
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 1.3;
          ctx.stroke();

          // Glowing cyan plasma sphere
          const pGrad = ctx.createRadialGradient(cx, cy, r * 0.08, cx, cy, r * 0.96);
          pGrad.addColorStop(0, '#FFFFFF');
          pGrad.addColorStop(0.48, '#E0F7FA');
          pGrad.addColorStop(0.78, '#00E5FF');
          pGrad.addColorStop(1, '#0284C7');
          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2);
          ctx.fillStyle = pGrad;
          ctx.fill();

          // Pure white plasma core
          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        } else if (styleOpt.pipShape === 'tesseract') {
          // Tesseract Cube: Radiant Circular Dimensional Energy Sphere (Exact match to Column 3 of reference)
          const corona = ctx.createRadialGradient(
            cx,
            cy,
            r * 0.1,
            cx,
            cy,
            r * 1.65
          );
          corona.addColorStop(0, '#FFFFFF');
          corona.addColorStop(0.38, '#F0ABFC');
          corona.addColorStop(0.7, 'rgba(168, 85, 247, 0.55)');
          corona.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.beginPath();
          ctx.arc(cx, cy, r * 1.65, 0, Math.PI * 2);
          ctx.fillStyle = corona;
          ctx.fill();

          // Delicate cyan/violet geometric ring around the energy sphere
          ctx.beginPath();
          ctx.arc(cx, cy, r * 1.14, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(103, 232, 249, 0.78)';
          ctx.lineWidth = 1.0;
          ctx.stroke();

          // Smooth glowing lavender-white dimensional orb
          const orbGrad = ctx.createRadialGradient(
            cx,
            cy,
            r * 0.08,
            cx,
            cy,
            r * 0.95
          );
          orbGrad.addColorStop(0, '#FFFFFF');
          orbGrad.addColorStop(0.45, '#FAF5FF');
          orbGrad.addColorStop(0.78, '#E879F9');
          orbGrad.addColorStop(1, '#9333EA');
          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2);
          ctx.fillStyle = orbGrad;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        } else if (styleOpt.pipShape === 'cosmos') {
          // Cosmo Cube: Radiant Celestial Star-Core Orb (Exact match to Column 4 of reference)
          const corona = ctx.createRadialGradient(
            cx,
            cy,
            r * 0.1,
            cx,
            cy,
            r * 1.68
          );
          corona.addColorStop(0, '#FFFFFF');
          corona.addColorStop(0.36, '#38BDF8');
          corona.addColorStop(0.68, 'rgba(168, 85, 247, 0.58)');
          corona.addColorStop(1, 'rgba(15, 7, 40, 0)');
          ctx.beginPath();
          ctx.arc(cx, cy, r * 1.68, 0, Math.PI * 2);
          ctx.fillStyle = corona;
          ctx.fill();

          // Smooth glowing cyan-white star orb
          const starOrb = ctx.createRadialGradient(
            cx,
            cy,
            r * 0.08,
            cx,
            cy,
            r * 0.96
          );
          starOrb.addColorStop(0, '#FFFFFF');
          starOrb.addColorStop(0.48, '#E0F2FE');
          starOrb.addColorStop(0.8, '#00E5FF');
          starOrb.addColorStop(1, '#6366F1');
          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2);
          ctx.fillStyle = starOrb;
          ctx.fill();

          // Brilliant white core
          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        } else if (styleOpt.pipShape === 'diamond') {
          // Sovereign Gold & Dragon Ruby: Diamond-Cut Pips
          tracePolygon(ctx, [
            [cx + 0.9, cy - r * 1.26 + 0.9],
            [cx + r * 1.26 + 0.9, cy + 0.9],
            [cx + 0.9, cy + r * 1.26 + 0.9],
            [cx - r * 1.26 + 0.9, cy + 0.9],
          ]);
          ctx.fillStyle = 'rgba(255, 251, 235, 0.72)';
          ctx.fill();

          tracePolygon(ctx, [
            [cx, cy - r * 1.26],
            [cx + r * 1.26, cy],
            [cx, cy + r * 1.26],
            [cx - r * 1.26, cy],
          ]);
          ctx.fillStyle = 'rgba(24, 10, 2, 0.86)';
          ctx.fill();

          tracePolygon(ctx, [
            [cx, cy - r * 1.06],
            [cx + r * 1.06, cy],
            [cx, cy + r * 1.06],
            [cx - r * 1.06, cy],
          ]);
          ctx.fillStyle = primaryPipFill;
          ctx.fill();

          tracePolygon(ctx, [
            [cx, cy - r * 0.48],
            [cx + r * 0.48, cy],
            [cx, cy + r * 0.48],
            [cx - r * 0.48, cy],
          ]);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
          ctx.fill();
        } else if (styleOpt.pipShape === 'hexagon') {
          // Cyber Obsidian: Hexagonal Pips
          traceHexagon(ctx, cx + 0.8, cy + 0.9, r * 1.26);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.42)';
          ctx.fill();

          traceHexagon(ctx, cx, cy, r * 1.24);
          ctx.fillStyle = '#020617';
          ctx.fill();
          ctx.strokeStyle = primaryPipFill;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          traceHexagon(ctx, cx, cy, r * 0.98);
          ctx.fillStyle = primaryPipFill;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(cx - r * 0.15, cy - r * 0.15, r * 0.38, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        } else if (styleOpt.pipShape === 'star') {
          // Imperial Jade: 4-Pointed Golden Celestial Star Inlays
          ctx.beginPath();
          ctx.arc(cx + 0.8, cy + 0.9, r * 1.16, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(209, 250, 229, 0.48)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(cx, cy, r * 1.14, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(1, 28, 22, 0.88)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(253, 230, 138, 0.58)';
          ctx.lineWidth = 1.0;
          ctx.stroke();

          traceFourPointStar(ctx, cx, cy, r * 1.24);
          ctx.fillStyle = primaryPipFill;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.34, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        } else {
          // Classic Ivory: Deeply Recessed Circular Pips
          ctx.beginPath();
          ctx.arc(cx + 0.9, cy + 1.0, r * 1.14, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(cx - 0.7, cy - 0.8, r * 1.1, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(45, 38, 28, 0.56)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.98, 0, Math.PI * 2);
          ctx.fillStyle = primaryPipFill;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(cx - r * 0.26, cy - r * 0.26, r * 0.26, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  // Extract pixel data from the offscreen 2D canvas and compute 3D height, normals, and emissive maps
  const pixelData = ctx ? ctx.getImageData(0, 0, N, N).data : null;
  const seed = safeFace * 17 + 11;
  const pipRadiusUV = safeFace === 1 ? 0.118 : 0.092;

  for (let y = 0; y < N; y++) {
    const v = (y + 0.5) / N;
    const v100 = v * 100;
    for (let x = 0; x < N; x++) {
      const u = (x + 0.5) / N;
      const u100 = u * 100;
      const idx = y * N + x;
      const rgbIdx = idx * 3;
      const pIdx = idx * 4;

      const r = pixelData ? pixelData[pIdx] : 240;
      const g = pixelData ? pixelData[pIdx + 1] : 235;
      const b = pixelData ? pixelData[pIdx + 2] : 220;

      albedo[rgbIdx] = r;
      albedo[rgbIdx + 1] = g;
      albedo[rgbIdx + 2] = b;

      const luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

      // Procedural 3D surface micro-relief + luminance relief
      let h = 0.25;
      let er = 0;
      let eg = 0;
      let eb = 0;
      let rough = 0.2;

      if (diceStyle === 'lava_cube') {
        const rockGrain = fbm(u * 22, v * 22, seed, 3);
        // Bright orange/yellow pixels are recessed molten magma fissures & craters
        const magmaHeat = clamp((r - 65) / 170, 0, 1);
        h = mix(0.48 + (rockGrain - 0.5) * 0.45, -0.78, magmaHeat);
        er = Math.round(r * magmaHeat * 1.0);
        eg = Math.round(g * magmaHeat * 0.96);
        eb = Math.round(b * magmaHeat * 0.9);
        rough = mix(0.62, 0.12, magmaHeat);
      } else if (diceStyle === 'electro_cube') {
        const brush = fbm(u * 6, v * 36, seed, 2);
        const cyanGlow = clamp((b - r * 0.65) / 145, 0, 1);
        h = 0.32 + (brush - 0.5) * 0.12 + luma * 0.24 - cyanGlow * 0.58;
        if (b > 135 && (g > 110 || b - r > 70)) {
          const boost = smoothstep(120, 240, b);
          er = Math.round(r * boost * 0.92);
          eg = Math.round(g * boost * 0.96);
          eb = Math.round(b * boost);
        }
        rough = 0.14;
      } else if (diceStyle === 'tesseract_cube') {
        const facet = fbm(u * 10, v * 10, seed, 2);
        h = 0.3 + (facet - 0.5) * 0.06 + luma * 0.26;
        if (luma > 0.26 || b > 110) {
          const glow = smoothstep(0.22, 0.82, Math.max(luma, b / 255));
          er = Math.round(r * glow * 0.94);
          eg = Math.round(g * glow * 0.94);
          eb = Math.round(b * glow * 1.0);
        }
        rough = 0.08;
      } else if (diceStyle === 'cosmo_cube') {
        const neb = fbm(u * 10, v * 10, seed, 2);
        h = 0.3 + (neb - 0.5) * 0.06 + luma * 0.2;
        if (luma > 0.22 || b > 100 || r > 120) {
          const glow = smoothstep(
            0.2,
            0.82,
            Math.max(luma, Math.max(r, b) / 255)
          );
          er = Math.round(r * glow * 0.94);
          eg = Math.round(g * glow * 0.94);
          eb = Math.round(b * glow * 0.98);
        }
        rough = 0.08;
      } else if (diceStyle === 'royal_gold') {
        const brush = fbm(u * 5, v * 40, seed, 2);
        h = 0.35 + (brush - 0.5) * 0.15 + (luma - 0.5) * 0.32;
        rough = 0.14;
      } else if (diceStyle === 'obsidian_neon') {
        const micro = fbm(u * 18, v * 18, seed, 2);
        const neon = clamp(Math.max(b - 90, r - 90) / 150, 0, 1);
        h = 0.3 + (micro - 0.5) * 0.12 - neon * 0.45;
        er = Math.round(r * neon * 0.78);
        eg = Math.round(g * neon * 0.82);
        eb = Math.round(b * neon * 0.88);
        rough = 0.16;
      } else if (diceStyle === 'emerald_jade') {
        const vein = fbm(u * 11, v * 11, seed, 3);
        h = 0.34 + (vein - 0.5) * 0.18 + (luma - 0.5) * 0.25;
        rough = 0.16;
      } else if (diceStyle === 'crimson_ruby') {
        const crystal = fbm(u * 12, v * 12, seed, 2);
        h = 0.34 + (crystal - 0.5) * 0.14 + (luma - 0.5) * 0.3;
        rough = 0.12;
      } else if (diceStyle === 'celestial_runic') {
        const stone = fbm(u * 16, v * 16, seed, 3);
        const runeGlow = smoothstep(0.35, 0.82, luma);
        h = 0.32 + (stone - 0.5) * 0.22 - runeGlow * 0.48;
        er = Math.round(r * runeGlow * 0.72);
        eg = Math.round(g * runeGlow * 0.72);
        eb = Math.round(b * runeGlow * 0.78);
        rough = 0.24;
      } else {
        // classic_ivory
        const grain = fbm(u * 14, v * 14, seed, 3);
        h = 0.35 + (grain - 0.5) * 0.08;
        rough = 0.16;
      }

      // Carve 3D recessed concave pip sockets into the height map for non-Roman pips
      if (styleOpt.pipShape !== 'roman') {
        for (let p = 0; p < pips.length; p++) {
          const [px100, py100] = pips[p];
          const distUV = Math.hypot(u100 - px100, v100 - py100) * 0.01;
          if (distUV < pipRadiusUV) {
            const nr = distUV / pipRadiusUV;
            const socketDepth = Math.sqrt(Math.max(0, 1 - nr * nr));
            h = -0.85 * socketDepth;
          }
        }
      }

      height[idx] = h;
      emissive[rgbIdx] = clamp(er, 0, 255);
      emissive[rgbIdx + 1] = clamp(eg, 0, 255);
      emissive[rgbIdx + 2] = clamp(eb, 0, 255);
      roughness[idx] = rough;
    }
  }

  // Precompute tangent-space 3D surface normal perturbations (dH/du, dH/dv)
  const bumpStrength =
    diceStyle === 'lava_cube'
      ? 2.55
      : diceStyle === 'electro_cube'
      ? 1.95
      : diceStyle === 'tesseract_cube' || diceStyle === 'cosmo_cube'
      ? 1.35
      : diceStyle === 'royal_gold' || diceStyle === 'celestial_runic'
      ? 2.05
      : 1.85;

  for (let y = 0; y < N; y++) {
    const ym = Math.max(0, y - 1);
    const yp = Math.min(N - 1, y + 1);
    for (let x = 0; x < N; x++) {
      const xm = Math.max(0, x - 1);
      const xp = Math.min(N - 1, x + 1);
      const idx = y * N + x;
      const dhdu = (height[y * N + xp] - height[y * N + xm]) * 0.5;
      const dhdv = (height[yp * N + x] - height[ym * N + x]) * 0.5;
      normalX[idx] = -dhdu * bumpStrength;
      normalY[idx] = -dhdv * bumpStrength;
    }
  }

  const buffer: FaceMaterialBuffer = {
    albedo,
    normalX,
    normalY,
    height,
    emissive,
    roughness,
  };
  faceBufferCache.set(cacheKey, buffer);
  return buffer;
}

// Signed Distance Function for a 3D Rounded Cube (half-size = b + r = 1.0)
function sdRoundBox(
  px: number,
  py: number,
  pz: number,
  b: number,
  r: number
): number {
  const qx = Math.abs(px) - b;
  const qy = Math.abs(py) - b;
  const qz = Math.abs(pz) - b;
  const mx = Math.max(qx, 0);
  const my = Math.max(qy, 0);
  const mz = Math.max(qz, 0);
  const outDist = Math.hypot(mx, my, mz);
  const inDist = Math.min(Math.max(qx, Math.max(qy, qz)), 0);
  return outDist + inDist - r;
}

// Fast Ray-AABB Slab Intersection against [-B, +B]^3
function intersectAABB(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  B: number
): [number, number] | null {
  const invDx = dx !== 0 ? 1 / dx : 1e9;
  const invDy = dy !== 0 ? 1 / dy : 1e9;
  const invDz = dz !== 0 ? 1 / dz : 1e9;

  const t1 = (-B - ox) * invDx;
  const t2 = (B - ox) * invDx;
  const t3 = (-B - oy) * invDy;
  const t4 = (B - oy) * invDy;
  const t5 = (-B - oz) * invDz;
  const t6 = (B - oz) * invDz;

  const tmin = Math.max(
    Math.min(t1, t2),
    Math.max(Math.min(t3, t4), Math.min(t5, t6))
  );
  const tmax = Math.min(
    Math.max(t1, t2),
    Math.min(Math.max(t3, t4), Math.max(t5, t6))
  );

  if (tmax < 0 || tmin > tmax) return null;
  return [Math.max(0, tmin), tmax];
}

// Bilinearly sample a face buffer at UV in [0..1]^2 and return perturbed 3D normal in local cube space
function sampleFace3D(
  buf: FaceMaterialBuffer,
  u: number,
  v: number,
  ux: number,
  uy: number,
  uz: number,
  vx: number,
  vy: number,
  vz: number
): {
  r: number;
  g: number;
  b: number;
  er: number;
  eg: number;
  eb: number;
  rough: number;
  dnx: number;
  dny: number;
  dnz: number;
} {
  const fx = clamp(u * (TEX_SIZE - 1), 0, TEX_SIZE - 1.001);
  const fy = clamp(v * (TEX_SIZE - 1), 0, TEX_SIZE - 1.001);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(TEX_SIZE - 1, x0 + 1);
  const y1 = Math.min(TEX_SIZE - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;

  const w00 = (1 - tx) * (1 - ty);
  const w10 = tx * (1 - ty);
  const w01 = (1 - tx) * ty;
  const w11 = tx * ty;

  const i00 = y0 * TEX_SIZE + x0;
  const i10 = y0 * TEX_SIZE + x1;
  const i01 = y1 * TEX_SIZE + x0;
  const i11 = y1 * TEX_SIZE + x1;

  const c00 = i00 * 3;
  const c10 = i10 * 3;
  const c01 = i01 * 3;
  const c11 = i11 * 3;

  const r =
    buf.albedo[c00] * w00 +
    buf.albedo[c10] * w10 +
    buf.albedo[c01] * w01 +
    buf.albedo[c11] * w11;
  const g =
    buf.albedo[c00 + 1] * w00 +
    buf.albedo[c10 + 1] * w10 +
    buf.albedo[c01 + 1] * w01 +
    buf.albedo[c11 + 1] * w11;
  const b =
    buf.albedo[c00 + 2] * w00 +
    buf.albedo[c10 + 2] * w10 +
    buf.albedo[c01 + 2] * w01 +
    buf.albedo[c11 + 2] * w11;

  const er =
    buf.emissive[c00] * w00 +
    buf.emissive[c10] * w10 +
    buf.emissive[c01] * w01 +
    buf.emissive[c11] * w11;
  const eg =
    buf.emissive[c00 + 1] * w00 +
    buf.emissive[c10 + 1] * w10 +
    buf.emissive[c01 + 1] * w01 +
    buf.emissive[c11 + 1] * w11;
  const eb =
    buf.emissive[c00 + 2] * w00 +
    buf.emissive[c10 + 2] * w10 +
    buf.emissive[c01 + 2] * w01 +
    buf.emissive[c11 + 2] * w11;

  const rough =
    buf.roughness[i00] * w00 +
    buf.roughness[i10] * w10 +
    buf.roughness[i01] * w01 +
    buf.roughness[i11] * w11;

  const nx =
    buf.normalX[i00] * w00 +
    buf.normalX[i10] * w10 +
    buf.normalX[i01] * w01 +
    buf.normalX[i11] * w11;
  const ny =
    buf.normalY[i00] * w00 +
    buf.normalY[i10] * w10 +
    buf.normalY[i01] * w01 +
    buf.normalY[i11] * w11;

  return {
    r,
    g,
    b,
    er,
    eg,
    eb,
    rough,
    dnx: nx * ux + ny * vx,
    dny: nx * uy + ny * vy,
    dnz: nx * uz + ny * vz,
  };
}

/**
 * Real-time 3D Raycasted Rounded-Cube PBR & Normal-Mapped Renderer.
 * Renders a single solid, continuous 3D rounded cube (`sdRoundBox`) with smooth
 * spherical corners, curved cylindrical edges, authentic original face designs,
 * and style-specific pulsating idle & rolling animations.
 */
export const RoundedCube3DCanvas: React.FC<RoundedCube3DCanvasProps> = ({
  value,
  isRolling,
  isLanding,
  diceStyle,
  activeColor,
  size,
  reducedMotion = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rollStartRef = useRef<number>(performance.now());
  const landStartRef = useRef<number>(performance.now());
  const isVisibleRef = useRef<boolean>(true);

  useEffect(() => {
    if (isRolling) {
      rollStartRef.current = performance.now();
    }
  }, [isRolling]);

  useEffect(() => {
    if (isLanding) {
      landStartRef.current = performance.now();
    }
  }, [isLanding]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisibleRef.current = entry.isIntersecting;
        }
      },
      { threshold: 0.01 }
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const safeFace = value >= 1 && value <= 6 ? value : 6;
    const faceMap = CUBE_FACE_MAP[safeFace] || CUBE_FACE_MAP[6];

    // Pre-fetch the 6 face buffers for this die
    const faces: Record<CubeFaceOrientation, FaceMaterialBuffer> = {
      front: getOrCreateFaceBuffer(diceStyle, faceMap.front, activeColor),
      back: getOrCreateFaceBuffer(diceStyle, faceMap.back, activeColor),
      right: getOrCreateFaceBuffer(diceStyle, faceMap.right, activeColor),
      left: getOrCreateFaceBuffer(diceStyle, faceMap.left, activeColor),
      top: getOrCreateFaceBuffer(diceStyle, faceMap.top, activeColor),
      bottom: getOrCreateFaceBuffer(diceStyle, faceMap.bottom, activeColor),
    };

    // High-DPI internal render resolution
    const res = clamp(Math.round(size * 1.9), 84, 124);
    if (canvas.width !== res || canvas.height !== res) {
      canvas.width = res;
      canvas.height = res;
    }

    const imgData = ctx.createImageData(res, res);
    const data = imgData.data;

    // Rounded Cube Geometry Parameters:
    // Total half-extent B = 1.0, corner/edge rounding radius r = 0.25 (smooth 25% 3D rounded corners & edges)
    const cornerRadius = 0.25;
    const innerBox = 1.0 - cornerRadius; // 0.75

    // Fixed Studio 3D Lighting Vectors (in World/Camera Space: +X right, -Y up, +Z toward viewer)
    const keyLx = -0.42;
    const keyLy = -0.55;
    const keyLz = 0.72;
    const halfLen = Math.hypot(keyLx, keyLy, keyLz + 1.0);
    const hx = keyLx / halfLen;
    const hy = keyLy / halfLen;
    const hz = (keyLz + 1.0) / halfLen;

    const rimLx = 0.65;
    const rimLy = -0.48;
    const rimLz = 0.58;

    let animFrameId = 0;

    // Straight upright 3D tabletop die orientation when idle/resting:
    // The Front rolled face sits completely straight and upright (0 deg tilt),
    // while perspective raycasting against the 3D rounded cube (`sdRoundBox`)
    // naturally reveals all 4 curved 3D bevels and 4 spherical corners symmetrically.
    const baseRx = 0.0;
    const baseRy = 0.0;
    const baseRz = 0.0;

    const renderFrame = (now: number) => {
      if (!isVisibleRef.current && !isRolling) {
        animFrameId = window.requestAnimationFrame(renderFrame);
        return;
      }

      const tSec = now * 0.001;

      // ======================================================================
      // 1. COMPUTE 3D POSE (rx, ry, rz, scale, pan) & PULSATING EMISSIVE GLOW
      // ======================================================================
      let rx = baseRx;
      let ry = baseRy;
      let rz = baseRz;
      let scale = 1.0;
      let emissivePulse = 1.0;
      let rollPanX = 0.0;
      let rollPanY = 0.0;

      if (!reducedMotion) {
        if (isRolling) {
          // 5-Stage Physical 3D Tumbling + Airborne Hop Arc per Die Design
          const elapsed = (now - rollStartRef.current) * 0.001;
          const p = (elapsed % 0.74) / 0.74;
          emissivePulse = 1.45 + 0.35 * Math.sin(p * Math.PI * 6);
          rollPanY = Math.sin(p * Math.PI) * 0.085;
          rollPanX = Math.sin(p * Math.PI * 2) * 0.045;

          if (diceStyle === 'lava_cube') {
            rx = p * Math.PI * 4 + Math.sin(p * Math.PI * 2) * 0.38;
            ry = p * Math.PI * 2 + Math.cos(p * Math.PI * 2) * 0.32;
            rz = -p * Math.PI * 2;
            scale = 0.94 + 0.08 * Math.sin(p * Math.PI);
          } else if (diceStyle === 'electro_cube') {
            rx = p * Math.PI * 4 + Math.sin(p * Math.PI * 8) * 0.16;
            ry = -p * Math.PI * 4;
            rz = p * Math.PI * 2 + Math.cos(p * Math.PI * 6) * 0.14;
            scale = 0.94 + 0.08 * Math.sin(p * Math.PI);
            rollPanX += Math.sin(p * Math.PI * 10) * 0.025;
          } else if (diceStyle === 'tesseract_cube') {
            rx = p * Math.PI * 4;
            ry = -p * Math.PI * 2 + Math.sin(p * Math.PI * 4) * 0.42;
            rz = p * Math.PI * 4;
            scale = 0.94 + 0.09 * Math.sin(p * Math.PI);
          } else if (diceStyle === 'cosmo_cube') {
            rx = p * Math.PI * 2 + Math.sin(p * Math.PI * 2) * 0.45;
            ry = p * Math.PI * 4;
            rz = p * Math.PI * 2;
            scale = 0.94 + 0.08 * Math.sin(p * Math.PI);
          } else {
            rx = p * Math.PI * 4;
            ry = p * Math.PI * 2 + Math.sin(p * Math.PI * 2) * 0.32;
            rz = p * Math.PI * 2;
            scale = 0.94 + 0.08 * Math.sin(p * Math.PI);
          }
        } else if (isLanding) {
          const elapsed = Math.min(1, (now - landStartRef.current) / 520);
          const damper = Math.exp(-elapsed * 5.8);
          const bounce = Math.cos(elapsed * Math.PI * 3.5) * damper;
          rx = bounce * 0.12;
          ry = -bounce * 0.10;
          rz = bounce * 0.04;
          scale = 1.0 + bounce * 0.05;
          rollPanY = Math.abs(bounce) * 0.05;
          emissivePulse = 1.0 + damper * 0.65;
        } else {
          // STRAIGHT UPRIGHT IDLE WITH DISTINCT PULSATING ENERGY & BREATHING SCALE
          rx = 0.0;
          ry = 0.0;
          rz = 0.0;
          if (diceStyle === 'lava_cube') {
            const pulse = 0.5 + 0.5 * Math.sin(tSec * 2.8);
            const sharpPulse = Math.pow(pulse, 1.5);
            scale = 0.99 + sharpPulse * 0.035;
            emissivePulse = 0.78 + sharpPulse * 0.92;
          } else if (diceStyle === 'electro_cube') {
            const wave = 0.5 + 0.5 * Math.sin(tSec * 3.6);
            const spark = Math.pow(0.5 + 0.5 * Math.sin(tSec * 9.5), 3.0);
            scale = 0.99 + wave * 0.03 + spark * 0.015;
            emissivePulse = 0.82 + wave * 0.65 + spark * 0.55;
          } else if (diceStyle === 'tesseract_cube') {
            const phase = 0.5 + 0.5 * Math.sin(tSec * 2.5);
            scale = 0.99 + phase * 0.035;
            emissivePulse = 0.80 + phase * 0.86;
          } else if (diceStyle === 'cosmo_cube') {
            const breath = 0.5 + 0.5 * Math.sin(tSec * 2.2);
            scale = 0.99 + breath * 0.035;
            emissivePulse = 0.82 + breath * 0.80;
          } else {
            const gentle = 0.5 + 0.5 * Math.sin(tSec * 1.8);
            scale = 0.995 + gentle * 0.015;
            emissivePulse = 0.95 + gentle * 0.14;
          }
        }
      }

      // Build 3x3 Orthogonal Rotation Matrix R = Rz * Ry * Rx
      const cx = Math.cos(rx),
        sx = Math.sin(rx);
      const cy = Math.cos(ry),
        sy = Math.sin(ry);
      const cz = Math.cos(rz),
        sz = Math.sin(rz);

      const r00 = cz * cy;
      const r01 = cz * sy * sx - sz * cx;
      const r02 = cz * sy * cx + sz * sx;
      const r10 = sz * cy;
      const r11 = sz * sy * sx + cz * cx;
      const r12 = sz * sy * cx - cz * sx;
      const r20 = -sy;
      const r21 = cy * sx;
      const r22 = cy * cx;

      // Prominent camera framing (~20% larger than before) with slight dynamic
      // FOV expansion during rolling so the entire 3D tumble fits cleanly inside the canvas
      const camZ = 3.85;
      const rollFovMargin = isRolling ? 0.075 : isLanding ? 0.025 : 0.0;
      const fovScale = (0.78 + rollFovMargin) / scale;
      const panX = rollPanX;
      const panY = rollPanY;

      const origX = r20 * camZ;
      const origY = r21 * camZ;
      const origZ = r22 * camZ;

      const lKeyX = r00 * keyLx + r10 * keyLy + r20 * keyLz;
      const lKeyY = r01 * keyLx + r11 * keyLy + r21 * keyLz;
      const lKeyZ = r02 * keyLx + r12 * keyLy + r22 * keyLz;

      const lHalfX = r00 * hx + r10 * hy + r20 * hz;
      const lHalfY = r01 * hx + r11 * hy + r21 * hz;
      const lHalfZ = r02 * hx + r12 * hy + r22 * hz;

      const lRimX = r00 * rimLx + r10 * rimLy + r20 * rimLz;
      const lRimY = r01 * rimLx + r11 * rimLy + r21 * rimLz;
      const lRimZ = r02 * rimLx + r12 * rimLy + r22 * rimLz;

      const viewX = r20;
      const viewY = r21;
      const viewZ = r22;

      const invRes = 2.0 / res;

      // ======================================================================
      // 2. PER-PIXEL 3D ROUNDED-CUBE RAYCASTER & PBR BUMP SHADER
      // ======================================================================
      for (let py = 0; py < res; py++) {
        const syNorm = (py + 0.5) * invRes - 1.0;
        for (let px = 0; px < res; px++) {
          const sxNorm = (px + 0.5) * invRes - 1.0;
          const outIdx = (py * res + px) * 4;

          const wx = sxNorm * fovScale + panX;
          const wy = syNorm * fovScale + panY;
          const wz = -1.9;
          const wLen = Math.hypot(wx, wy, wz);
          const dwx = wx / wLen;
          const dwy = wy / wLen;
          const dwz = wz / wLen;

          const dirX = r00 * dwx + r10 * dwy + r20 * dwz;
          const dirY = r01 * dwx + r11 * dwy + r21 * dwz;
          const dirZ = r02 * dwx + r12 * dwy + r22 * dwz;

          // Intersect exact [-1.0, +1.0]^3 bounding box of the rounded cube
          const slab = intersectAABB(
            origX,
            origY,
            origZ,
            dirX,
            dirY,
            dirZ,
            1.0
          );
          if (!slab) {
            data[outIdx + 3] = 0;
            continue;
          }

          // Sphere-trace `sdRoundBox` for all rays inside the bounding box
          let t = slab[0];
          const tMax = slab[1] + 0.05;
          let hitX = origX + dirX * t;
          let hitY = origY + dirY * t;
          let hitZ = origZ + dirZ * t;
          let minDist = 999;

          for (let step = 0; step < 12; step++) {
            hitX = origX + dirX * t;
            hitY = origY + dirY * t;
            hitZ = origZ + dirZ * t;
            const d = sdRoundBox(hitX, hitY, hitZ, innerBox, cornerRadius);
            if (d < minDist) minDist = d;
            if (d < 0.0018 || t > tMax) break;
            t += Math.max(d * 0.9, 0.006);
          }

          // Smooth anti-aliased silhouette edge coverage around the 3D rounded corners & edges
          const aaWidth = 0.025;
          if (minDist > aaWidth) {
            data[outIdx + 3] = 0;
            continue;
          }
          const alphaCoverage =
            minDist <= 0.002
              ? 1.0
              : clamp(1.0 - (minDist - 0.002) / aaWidth, 0, 1);

          // ==================================================================
          // 3. SMOOTH 3D ROUNDED-CUBE NORMAL & TRIPLANAR FACE BLENDING
          // ==================================================================
          const qx = Math.max(Math.abs(hitX) - innerBox, 0);
          const qy = Math.max(Math.abs(hitY) - innerBox, 0);
          const qz = Math.max(Math.abs(hitZ) - innerBox, 0);

          let gnx = qx * (hitX >= 0 ? 1 : -1);
          let gny = qy * (hitY >= 0 ? 1 : -1);
          let gnz = qz * (hitZ >= 0 ? 1 : -1);
          const gLen = Math.hypot(gnx, gny, gnz);

          if (gLen > 1e-4) {
            gnx /= gLen;
            gny /= gLen;
            gnz /= gLen;
          } else {
            const ax = Math.abs(hitX);
            const ay = Math.abs(hitY);
            const az = Math.abs(hitZ);
            if (az >= ax && az >= ay) {
              gnx = 0;
              gny = 0;
              gnz = hitZ >= 0 ? 1 : -1;
            } else if (ay >= ax) {
              gnx = 0;
              gny = hitY >= 0 ? 1 : -1;
              gnz = 0;
            } else {
              gnx = hitX >= 0 ? 1 : -1;
              gny = 0;
              gnz = 0;
            }
          }

          const wx3 = Math.pow(Math.abs(gnx), 3.4);
          const wy3 = Math.pow(Math.abs(gny), 3.4);
          const wz3 = Math.pow(Math.abs(gnz), 3.4);
          const wSum = wx3 + wy3 + wz3 + 1e-6;
          const bwX = wx3 / wSum;
          const bwY = wy3 / wSum;
          const bwZ = wz3 / wSum;

          const bevelAmount = clamp(
            Math.hypot(qx, qy, qz) / cornerRadius,
            0,
            1
          );

          let colR = 0,
            colG = 0,
            colB = 0;
          let emR = 0,
            emG = 0,
            emB = 0;
          let rough = 0;
          let bumpX = 0,
            bumpY = 0,
            bumpZ = 0;

          const uvScale = 0.535;

          if (bwZ > 0.01) {
            const isFront = hitZ >= 0;
            const u = clamp(
              (isFront ? hitX : -hitX) * uvScale + 0.5,
              0,
              0.999
            );
            const v = clamp(hitY * uvScale + 0.5, 0, 0.999);
            const s = sampleFace3D(
              isFront ? faces.front : faces.back,
              u,
              v,
              isFront ? 1 : -1,
              0,
              0,
              0,
              1,
              0
            );
            colR += s.r * bwZ;
            colG += s.g * bwZ;
            colB += s.b * bwZ;
            emR += s.er * bwZ;
            emG += s.eg * bwZ;
            emB += s.eb * bwZ;
            rough += s.rough * bwZ;
            bumpX += s.dnx * bwZ;
            bumpY += s.dny * bwZ;
            bumpZ += s.dnz * bwZ;
          }

          if (bwY > 0.01) {
            const isTop = hitY < 0;
            const u = clamp(hitX * uvScale + 0.5, 0, 0.999);
            const v = clamp(
              (isTop ? hitZ : -hitZ) * uvScale + 0.5,
              0,
              0.999
            );
            const s = sampleFace3D(
              isTop ? faces.top : faces.bottom,
              u,
              v,
              1,
              0,
              0,
              0,
              0,
              isTop ? 1 : -1
            );
            colR += s.r * bwY;
            colG += s.g * bwY;
            colB += s.b * bwY;
            emR += s.er * bwY;
            emG += s.eg * bwY;
            emB += s.eb * bwY;
            rough += s.rough * bwY;
            bumpX += s.dnx * bwY;
            bumpY += s.dny * bwY;
            bumpZ += s.dnz * bwY;
          }

          if (bwX > 0.01) {
            const isRight = hitX >= 0;
            const u = clamp(
              (isRight ? -hitZ : hitZ) * uvScale + 0.5,
              0,
              0.999
            );
            const v = clamp(hitY * uvScale + 0.5, 0, 0.999);
            const s = sampleFace3D(
              isRight ? faces.right : faces.left,
              u,
              v,
              0,
              0,
              isRight ? -1 : 1,
              0,
              1,
              0
            );
            colR += s.r * bwX;
            colG += s.g * bwX;
            colB += s.b * bwX;
            emR += s.er * bwX;
            emG += s.eg * bwX;
            emB += s.eb * bwX;
            rough += s.rough * bwX;
            bumpX += s.dnx * bwX;
            bumpY += s.dny * bwX;
            bumpZ += s.dnz * bwX;
          }

          let nx = gnx + bumpX;
          let ny = gny + bumpY;
          let nz = gnz + bumpZ;
          const nLen = Math.hypot(nx, ny, nz);
          nx /= nLen;
          ny /= nLen;
          nz /= nLen;

          // ==================================================================
          // 4. VOLUMETRIC 3D INNER HYPERCUBE & GALAXY PARALLAX (TESSERACT & COSMO)
          // ==================================================================
          if (diceStyle === 'tesseract_cube' && bevelAmount < 0.75) {
            const innerX = hitX + dirX * 0.42;
            const innerY = hitY + dirY * 0.42;
            const innerZ = hitZ + dirZ * 0.42;
            const ca = Math.cos(-tSec * 2.1),
              sa = Math.sin(-tSec * 2.1);
            const rxIn = innerX * ca - innerZ * sa;
            const rzIn = innerX * sa + innerZ * ca;
            const ryIn = innerY * ca - rzIn * sa;
            const rzIn2 = innerY * sa + rzIn * ca;

            const axIn = Math.abs(rxIn);
            const ayIn = Math.abs(ryIn);
            const azIn = Math.abs(rzIn2);
            const maxIn = Math.max(axIn, Math.max(ayIn, azIn));
            const dEdge1 = Math.hypot(axIn - 0.42, ayIn - 0.42);
            const dEdge2 = Math.hypot(axIn - 0.42, azIn - 0.42);
            const dEdge3 = Math.hypot(ayIn - 0.42, azIn - 0.42);
            const minEdge =
              maxIn <= 0.46
                ? Math.min(dEdge1, Math.min(dEdge2, dEdge3))
                : 1.0;
            const innerWire = smoothstep(0.065, 0.008, minEdge);
            if (innerWire > 0) {
              emR += innerWire * 135;
              emG += innerWire * 220;
              emB += innerWire * 245;
            }
          } else if (diceStyle === 'cosmo_cube' && bevelAmount < 0.8) {
            const deepX = hitX + dirX * 0.35;
            const deepY = hitY + dirY * 0.35;
            const deepZ = hitZ + dirZ * 0.35;
            const rDeep = Math.hypot(deepX, deepY, deepZ);
            const coreNova = smoothstep(0.65, 0.0, rDeep);
            const swirl =
              0.5 +
              0.5 *
                Math.sin(
                  Math.atan2(deepY, deepX) * 2 - rDeep * 6 + tSec * 2.4
                );
            emR += coreNova * swirl * 80;
            emG += coreNova * (1 - swirl) * 70;
            emB += coreNova * 115;
          }

          // ==================================================================
          // 5. PBR LIGHTING: KEY DIFFUSE, RIM FILL, PHONG/GGX SPECULAR & FRESNEL
          // ==================================================================
          const nDotL = Math.max(0, nx * lKeyX + ny * lKeyY + nz * lKeyZ);
          const nDotRim = Math.max(0, nx * lRimX + ny * lRimY + nz * lRimZ);
          const nDotV = Math.max(0, nx * viewX + ny * viewY + nz * viewZ);
          const nDotH = Math.max(0, nx * lHalfX + ny * lHalfY + nz * lHalfZ);
          const gDotH = Math.max(
            0,
            gnx * lHalfX + gny * lHalfY + gnz * lHalfZ
          );

          const ambient =
            diceStyle === 'classic_ivory' || diceStyle === 'royal_gold'
              ? 0.48
              : 0.44;
          const diffuse = ambient + nDotL * 0.66 + nDotRim * 0.22;

          const shininess = mix(96, 16, clamp(rough, 0, 1));
          const specIntensity = mix(0.85, 0.22, clamp(rough, 0, 1));
          const surfaceSpec = Math.pow(nDotH, shininess) * specIntensity;

          const bevelSpec =
            Math.pow(gDotH, 28) * (0.35 + bevelAmount * 0.65);

          const fresnel = Math.pow(1.0 - nDotV, 3.2) * 0.38;

          let specColorR = 255,
            specColorG = 255,
            specColorB = 255;
          if (diceStyle === 'lava_cube') {
            specColorR = 255;
            specColorG = 175;
            specColorB = 105;
          } else if (diceStyle === 'electro_cube') {
            specColorR = 210;
            specColorG = 245;
            specColorB = 255;
          } else if (diceStyle === 'tesseract_cube') {
            specColorR = 225;
            specColorG = 240;
            specColorB = 255;
          } else if (diceStyle === 'cosmo_cube') {
            specColorR = 255;
            specColorG = 230;
            specColorB = 245;
          } else if (diceStyle === 'royal_gold') {
            specColorR = 255;
            specColorG = 248;
            specColorB = 205;
          }

          const totalSpec = surfaceSpec + bevelSpec * 0.55 + fresnel * 0.42;

          const finalR =
            colR * diffuse + specColorR * totalSpec + emR * emissivePulse * 0.55;
          const finalG =
            colG * diffuse + specColorG * totalSpec + emG * emissivePulse * 0.55;
          const finalB =
            colB * diffuse + specColorB * totalSpec + emB * emissivePulse * 0.55;

          data[outIdx] = clamp(Math.round(finalR), 0, 255);
          data[outIdx + 1] = clamp(Math.round(finalG), 0, 255);
          data[outIdx + 2] = clamp(Math.round(finalB), 0, 255);
          data[outIdx + 3] = Math.round(alphaCoverage * 255);
        }
      }

      ctx.putImageData(imgData, 0, 0);

      if (!reducedMotion) {
        animFrameId = window.requestAnimationFrame(renderFrame);
      }
    };

    renderFrame(performance.now());

    return () => {
      if (animFrameId) {
        window.cancelAnimationFrame(animFrameId);
      }
    };
  }, [value, isRolling, isLanding, diceStyle, activeColor, size, reducedMotion]);

  const visualSize = Math.round(size * 1.08);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="block pointer-events-none select-none shrink-0"
      style={{
        width: `${visualSize}px`,
        height: `${visualSize}px`,
      }}
    />
  );
};
