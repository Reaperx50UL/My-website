import React from 'react';
import { COLOR_META, getDiceStyleOption } from '../../game/constants';
import { DiceStyle, PlayerColor } from '../../game/gameTypes';

export type CubeFaceOrientation =
  | 'front'
  | 'back'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right';

export const PIP_POSITIONS: Record<number, [number, number][]> = {
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
  const inner = r * 0.36;
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

interface BevelPalette {
  specStrong: string;
  specMedium: string;
  rimSoft: string;
  aoMid: string;
  aoDeep: string;
}

function getStyleBevelPalette(diceStyle: DiceStyle): BevelPalette {
  switch (diceStyle) {
    case 'lava_cube':
      return {
        specStrong: 'rgba(255, 170, 80, 0.62)',
        specMedium: 'rgba(255, 115, 36, 0.44)',
        rimSoft: 'rgba(255, 90, 20, 0.24)',
        aoMid: 'rgba(12, 4, 1, 0.56)',
        aoDeep: 'rgba(5, 1, 0, 0.82)',
      };
    case 'electro_cube':
      return {
        specStrong: 'rgba(224, 242, 254, 0.68)',
        specMedium: 'rgba(56, 189, 248, 0.48)',
        rimSoft: 'rgba(148, 163, 184, 0.30)',
        aoMid: 'rgba(2, 6, 23, 0.56)',
        aoDeep: 'rgba(1, 3, 12, 0.82)',
      };
    case 'tesseract_cube':
      return {
        specStrong: 'rgba(224, 242, 254, 0.72)',
        specMedium: 'rgba(103, 232, 249, 0.52)',
        rimSoft: 'rgba(192, 132, 252, 0.36)',
        aoMid: 'rgba(15, 7, 45, 0.54)',
        aoDeep: 'rgba(7, 3, 24, 0.80)',
      };
    case 'cosmo_cube':
      return {
        specStrong: 'rgba(254, 240, 138, 0.58)',
        specMedium: 'rgba(244, 114, 182, 0.44)',
        rimSoft: 'rgba(125, 211, 252, 0.32)',
        aoMid: 'rgba(5, 3, 20, 0.56)',
        aoDeep: 'rgba(2, 1, 10, 0.82)',
      };
    case 'royal_gold':
      return {
        specStrong: 'rgba(255, 251, 235, 0.82)',
        specMedium: 'rgba(254, 240, 138, 0.58)',
        rimSoft: 'rgba(251, 191, 36, 0.36)',
        aoMid: 'rgba(120, 53, 15, 0.52)',
        aoDeep: 'rgba(69, 26, 3, 0.78)',
      };
    case 'obsidian_neon':
      return {
        specStrong: 'rgba(186, 230, 253, 0.52)',
        specMedium: 'rgba(56, 189, 248, 0.38)',
        rimSoft: 'rgba(148, 163, 184, 0.24)',
        aoMid: 'rgba(2, 6, 23, 0.62)',
        aoDeep: 'rgba(0, 0, 0, 0.84)',
      };
    case 'emerald_jade':
      return {
        specStrong: 'rgba(209, 250, 229, 0.66)',
        specMedium: 'rgba(167, 243, 208, 0.46)',
        rimSoft: 'rgba(110, 231, 183, 0.28)',
        aoMid: 'rgba(2, 44, 34, 0.54)',
        aoDeep: 'rgba(1, 24, 18, 0.78)',
      };
    case 'crimson_ruby':
      return {
        specStrong: 'rgba(254, 226, 226, 0.68)',
        specMedium: 'rgba(252, 165, 165, 0.48)',
        rimSoft: 'rgba(248, 113, 113, 0.28)',
        aoMid: 'rgba(69, 10, 10, 0.56)',
        aoDeep: 'rgba(36, 4, 4, 0.82)',
      };
    case 'celestial_runic':
      return {
        specStrong: 'rgba(221, 214, 254, 0.58)',
        specMedium: 'rgba(196, 181, 253, 0.42)',
        rimSoft: 'rgba(167, 139, 250, 0.28)',
        aoMid: 'rgba(9, 5, 24, 0.58)',
        aoDeep: 'rgba(2, 1, 8, 0.84)',
      };
    default:
      // classic_ivory
      return {
        specStrong: 'rgba(255, 255, 255, 0.92)',
        specMedium: 'rgba(255, 255, 255, 0.68)',
        rimSoft: 'rgba(255, 253, 248, 0.42)',
        aoMid: 'rgba(138, 128, 112, 0.44)',
        aoDeep: 'rgba(88, 80, 66, 0.66)',
      };
  }
}

function getOrientationBevelVectors(
  orientation: CubeFaceOrientation,
  palette: BevelPalette
): {
  gradX1: string;
  gradY1: string;
  gradX2: string;
  gradY2: string;
  startColor: string;
  midColor: string;
  endColor: string;
  hotspotCx: string;
  hotspotCy: string;
  vertexCx: number;
  vertexCy: number;
  lightAzimuth: number;
} {
  switch (orientation) {
    case 'top':
      return {
        gradX1: '18%',
        gradY1: '92%',
        gradX2: '86%',
        gradY2: '8%',
        startColor: palette.specStrong,
        midColor: palette.specMedium,
        endColor: palette.rimSoft,
        hotspotCx: '28%',
        hotspotCy: '74%',
        vertexCx: 14,
        vertexCy: 86,
        lightAzimuth: 125,
      };
    case 'left':
      return {
        gradX1: '92%',
        gradY1: '16%',
        gradX2: '8%',
        gradY2: '88%',
        startColor: palette.specMedium,
        midColor: palette.aoMid,
        endColor: palette.aoDeep,
        hotspotCx: '74%',
        hotspotCy: '26%',
        vertexCx: 86,
        vertexCy: 14,
        lightAzimuth: 325,
      };
    case 'right':
      return {
        gradX1: '14%',
        gradY1: '14%',
        gradX2: '90%',
        gradY2: '90%',
        startColor: palette.rimSoft,
        midColor: palette.aoMid,
        endColor: palette.aoDeep,
        hotspotCx: '26%',
        hotspotCy: '26%',
        vertexCx: 14,
        vertexCy: 14,
        lightAzimuth: 215,
      };
    case 'bottom':
      return {
        gradX1: '18%',
        gradY1: '18%',
        gradX2: '88%',
        gradY2: '88%',
        startColor: palette.aoMid,
        midColor: palette.aoDeep,
        endColor: palette.aoDeep,
        hotspotCx: '28%',
        hotspotCy: '24%',
        vertexCx: 14,
        vertexCy: 14,
        lightAzimuth: 225,
      };
    case 'back':
      return {
        gradX1: '84%',
        gradY1: '16%',
        gradX2: '14%',
        gradY2: '88%',
        startColor: palette.rimSoft,
        midColor: palette.aoMid,
        endColor: palette.aoDeep,
        hotspotCx: '72%',
        hotspotCy: '26%',
        vertexCx: 86,
        vertexCy: 14,
        lightAzimuth: 315,
      };
    case 'front':
    default:
      return {
        gradX1: '14%',
        gradY1: '12%',
        gradX2: '90%',
        gradY2: '92%',
        startColor: palette.specStrong,
        midColor: palette.specMedium,
        endColor: palette.aoDeep,
        hotspotCx: '26%',
        hotspotCy: '24%',
        vertexCx: 14,
        vertexCy: 14,
        lightAzimuth: 225,
      };
  }
}

export interface DiceFaceSVGProps {
  face: number;
  diceStyle: DiceStyle;
  activeColor?: PlayerColor;
  faceOrientation?: CubeFaceOrientation;
  className?: string;
}

/**
 * Hyper-realistic 3D sculpted dice face renderer with smooth rounded corners (`rx="22"`),
 * curved 3D cushion bevels, procedural 3D normal/bump-mapped surface relief, and deeply
 * recessed 3D pip sockets for all 10 dice designs.
 */
export const DiceFaceSVG: React.FC<DiceFaceSVGProps> = ({
  face,
  diceStyle,
  activeColor = 'red',
  faceOrientation = 'front',
  className = 'w-10 h-10',
}) => {
  const rawUid = React.useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');
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

  const bevelPalette = getStyleBevelPalette(diceStyle);
  const bevelVec = getOrientationBevelVectors(faceOrientation, bevelPalette);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      data-face-texture={styleOpt.texturePattern}
      data-face-orientation={faceOrientation}
    >
      <defs>
        {/* Rounded 3D Die Face ClipPath (Smooth Rounded Corners rx="16") */}
        <clipPath id={`roundedDieClip-${uid}`}>
          <rect x="0" y="0" width="100" height="100" rx="16" ry="16" />
        </clipPath>

        {/* ====================================================================
            PROCEDURAL 3D NORMAL / BUMP-MAP SURFACE FILTERS
            Computes real 3D Lambertian diffuse & Phong specular surface relief
            ==================================================================== */}
        {/* 1. Volcanic Basalt 3D Crag Bump Filter (Lava Cube) */}
        <filter id={`volcanic3DBump-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.09"
            numOctaves="3"
            seed={safeFace * 7 + 11}
            result="rockNoise"
          />
          <feDiffuseLighting
            in="rockNoise"
            lightingColor="#FF9E44"
            surfaceScale="2.8"
            diffuseConstant="1.15"
            result="rockBumpLight"
          >
            <feDistantLight azimuth={bevelVec.lightAzimuth} elevation="46" />
          </feDiffuseLighting>
          <feComposite
            in="rockBumpLight"
            in2="SourceGraphic"
            operator="arithmetic"
            k1="0.42"
            k2="0.025"
            k3="0.88"
            k4="-0.02"
          />
        </filter>

        {/* 2. Brushed Metallic & Anodized Armor 3D Micro-Relief Filter */}
        <filter id={`metallic3DBump-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.04 0.35"
            numOctaves="2"
            seed={safeFace * 5 + 3}
            result="metalGrain"
          />
          <feDiffuseLighting
            in="metalGrain"
            lightingColor="#E0F2FE"
            surfaceScale="1.6"
            diffuseConstant="1.05"
            result="metalLight"
          >
            <feDistantLight azimuth={bevelVec.lightAzimuth} elevation="54" />
          </feDiffuseLighting>
          <feComposite
            in="metalLight"
            in2="SourceGraphic"
            operator="arithmetic"
            k1="0.34"
            k2="0.02"
            k3="0.90"
            k4="-0.02"
          />
        </filter>

        {/* 3. Fine Mineral Stone & Carved Ivory 3D Micro-Grain Filter */}
        <filter id={`stone3DBump-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.11"
            numOctaves="3"
            seed={safeFace * 13 + 5}
            result="stoneGrain"
          />
          <feDiffuseLighting
            in="stoneGrain"
            lightingColor="#FFFDF8"
            surfaceScale="1.65"
            diffuseConstant="1.08"
            result="stoneLight"
          >
            <feDistantLight azimuth={bevelVec.lightAzimuth} elevation="52" />
          </feDiffuseLighting>
          <feComposite
            in="stoneLight"
            in2="SourceGraphic"
            operator="arithmetic"
            k1="0.30"
            k2="0.02"
            k3="0.90"
            k4="-0.015"
          />
        </filter>

        {/* Continuous 3D Spherical Cushion Volume & Rounded Bevel Gradients */}
        <radialGradient
          id={`faceVolume-${uid}`}
          cx={bevelVec.hotspotCx}
          cy={bevelVec.hotspotCy}
          r="78%"
        >
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.24)" />
          <stop offset="46%" stopColor="rgba(255, 255, 255, 0.04)" />
          <stop offset="78%" stopColor="rgba(0, 0, 0, 0.16)" />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0.42)" />
        </radialGradient>

        <linearGradient
          id={`roundedBevelRing-${uid}`}
          x1={bevelVec.gradX1}
          y1={bevelVec.gradY1}
          x2={bevelVec.gradX2}
          y2={bevelVec.gradY2}
        >
          <stop offset="0%" stopColor={bevelVec.startColor} />
          <stop offset="48%" stopColor={bevelVec.midColor} />
          <stop offset="100%" stopColor={bevelVec.endColor} />
        </linearGradient>

        <radialGradient
          id={`sharedVertexHighlight-${uid}`}
          cx={`${bevelVec.vertexCx}%`}
          cy={`${bevelVec.vertexCy}%`}
          r="42%"
        >
          <stop offset="0%" stopColor={bevelPalette.specStrong} />
          <stop offset="50%" stopColor={bevelPalette.specMedium} stopOpacity="0.32" />
          <stop offset="100%" stopColor={bevelPalette.specMedium} stopOpacity="0" />
        </radialGradient>

        {/* 1. Classic Ivory Gradients */}
        <radialGradient
          id={`ivoryBody-${uid}`}
          cx={bevelVec.hotspotCx}
          cy={bevelVec.hotspotCy}
          r="86%"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="44%" stopColor="#F5F0E6" />
          <stop offset="80%" stopColor="#DDD5C5" />
          <stop offset="100%" stopColor="#B8AE9C" />
        </radialGradient>

        {/* 2. Sovereign Gold Gradients */}
        <radialGradient
          id={`goldBullion-${uid}`}
          cx={bevelVec.hotspotCx}
          cy={bevelVec.hotspotCy}
          r="88%"
        >
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="24%" stopColor="#FEF08A" />
          <stop offset="54%" stopColor="#D97706" />
          <stop offset="82%" stopColor="#92400E" />
          <stop offset="100%" stopColor="#451A03" />
        </radialGradient>
        <linearGradient id={`goldSheen-${uid}`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(120, 53, 15, 0.36)" />
          <stop offset="45%" stopColor="rgba(254, 240, 138, 0.08)" />
          <stop offset="55%" stopColor="rgba(255, 251, 235, 0.46)" />
          <stop offset="100%" stopColor="rgba(180, 83, 9, 0.22)" />
        </linearGradient>

        {/* 3. Cyber Obsidian Gradients */}
        <radialGradient
          id={`cyberObsidian-${uid}`}
          cx={bevelVec.hotspotCx}
          cy={bevelVec.hotspotCy}
          r="86%"
        >
          <stop offset="0%" stopColor="#334155" />
          <stop offset="38%" stopColor="#0F172A" />
          <stop offset="76%" stopColor="#060B16" />
          <stop offset="100%" stopColor="#02040A" />
        </radialGradient>

        {/* 4. Imperial Jade Gradients */}
        <radialGradient
          id={`jadeStone-${uid}`}
          cx={bevelVec.hotspotCx}
          cy={bevelVec.hotspotCy}
          r="84%"
        >
          <stop offset="0%" stopColor="#A7F3D0" />
          <stop offset="28%" stopColor="#10B981" />
          <stop offset="68%" stopColor="#047857" />
          <stop offset="100%" stopColor="#022C22" />
        </radialGradient>

        {/* 5. Dragon Ruby Gradients */}
        <radialGradient
          id={`rubyGem-${uid}`}
          cx={bevelVec.hotspotCx}
          cy={bevelVec.hotspotCy}
          r="84%"
        >
          <stop offset="0%" stopColor="#FECACA" />
          <stop offset="26%" stopColor="#EF4444" />
          <stop offset="64%" stopColor="#991B1B" />
          <stop offset="100%" stopColor="#2A0404" />
        </radialGradient>

        {/* 6. Astral Runic Gradients */}
        <radialGradient
          id={`astralStone-${uid}`}
          cx={bevelVec.hotspotCx}
          cy={bevelVec.hotspotCy}
          r="84%"
        >
          <stop offset="0%" stopColor="#5B21B6" />
          <stop offset="46%" stopColor="#1E1B4B" />
          <stop offset="82%" stopColor="#0D0924" />
          <stop offset="100%" stopColor="#050310" />
        </radialGradient>

        {/* 7. Lava Cube Gradients (3D Sculpted Volcanic Basalt + Molten Magma Core) */}
        <radialGradient id={`lavaMagmaSubsurface-${uid}`} cx="50%" cy="50%" r="74%">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="28%" stopColor="#FF9100" />
          <stop offset="62%" stopColor="#FF3D00" />
          <stop offset="88%" stopColor="#8E0E00" />
          <stop offset="100%" stopColor="#1F0501" />
        </radialGradient>
        <radialGradient
          id={`lavaObsidianRock-${uid}`}
          cx={bevelVec.hotspotCx}
          cy={bevelVec.hotspotCy}
          r="90%"
        >
          <stop offset="0%" stopColor="#3E322E" />
          <stop offset="34%" stopColor="#231B18" />
          <stop offset="72%" stopColor="#120D0B" />
          <stop offset="100%" stopColor="#070403" />
        </radialGradient>
        <linearGradient id={`lavaRockAlt-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#332824" />
          <stop offset="50%" stopColor="#191311" />
          <stop offset="100%" stopColor="#090605" />
        </linearGradient>
        <radialGradient id={`lavaPipSocket-${uid}`} cx="40%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="24%" stopColor="#FFF59D" />
          <stop offset="54%" stopColor="#FF6D00" />
          <stop offset="82%" stopColor="#B71C1C" />
          <stop offset="100%" stopColor="#1B0603" />
        </radialGradient>

        {/* 8. Electro Cube Gradients (3D Molded Titanium Armor & High-Voltage Plasma) */}
        <radialGradient
          id={`electroGunmetal-${uid}`}
          cx={bevelVec.hotspotCx}
          cy={bevelVec.hotspotCy}
          r="88%"
        >
          <stop offset="0%" stopColor="#334760" />
          <stop offset="36%" stopColor="#162235" />
          <stop offset="74%" stopColor="#090F1A" />
          <stop offset="100%" stopColor="#03060C" />
        </radialGradient>
        <linearGradient id={`electroSteelArmor-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="22%" stopColor="#E2E8F0" />
          <stop offset="52%" stopColor="#94A3B8" />
          <stop offset="78%" stopColor="#475569" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <radialGradient id={`electroCorePip-${uid}`} cx="40%" cy="38%" r="58%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="34%" stopColor="#E0F2FE" />
          <stop offset="64%" stopColor="#00F0FF" />
          <stop offset="88%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#082F49" stopOpacity="0" />
        </radialGradient>

        {/* 9. Tesseract Cube Gradients (3D Crystal Glass Prism + 4D Hypercube Portal) */}
        <radialGradient
          id={`tesseractCrystalBody-${uid}`}
          cx={bevelVec.hotspotCx}
          cy={bevelVec.hotspotCy}
          r="86%"
        >
          <stop offset="0%" stopColor="#6B21A8" />
          <stop offset="42%" stopColor="#1E1B4B" />
          <stop offset="80%" stopColor="#0F0B2E" />
          <stop offset="100%" stopColor="#060417" />
        </radialGradient>
        <radialGradient id={`tesseractCorePip-${uid}`} cx="38%" cy="36%" r="58%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#F5D0FE" />
          <stop offset="68%" stopColor="#A855F7" />
          <stop offset="92%" stopColor="#38BDF8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0" />
        </radialGradient>

        {/* 10. Cosmo Cube Gradients (3D Rounded Cosmic Lens + Spiral Galaxy Vortex) */}
        <radialGradient
          id={`cosmoDeepSpace-${uid}`}
          cx={bevelVec.hotspotCx}
          cy={bevelVec.hotspotCy}
          r="86%"
        >
          <stop offset="0%" stopColor="#4C1D95" />
          <stop offset="40%" stopColor="#1E1048" />
          <stop offset="76%" stopColor="#09051E" />
          <stop offset="100%" stopColor="#03020C" />
        </radialGradient>
        <radialGradient id={`cosmoEmbeddedNebula-${uid}`} cx="50%" cy="50%" r="54%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.96" />
          <stop offset="18%" stopColor="#F5D0FE" stopOpacity="0.86" />
          <stop offset="44%" stopColor="#A855F7" stopOpacity="0.68" />
          <stop offset="72%" stopColor="#2563EB" stopOpacity="0.46" />
          <stop offset="100%" stopColor="#050316" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`cosmoOrbPip-${uid}`} cx="38%" cy="36%" r="58%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="32%" stopColor="#E0F2FE" />
          <stop offset="64%" stopColor="#38BDF8" />
          <stop offset="88%" stopColor="#8B5CF6" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#09051E" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g clipPath={`url(#roundedDieClip-${uid})`}>
        {/* ========================================================================
            1. CLASSIC IVORY ("Pearl Micro-Grain")
            3D sculpted casino bone-ivory resin with micro-bump grain & cushion bevel
            ======================================================================== */}
        {styleOpt.texturePattern === 'ivory_grain' && (
          <g data-texture-layer="ivory_grain" pointerEvents="none">
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              fill={`url(#ivoryBody-${uid})`}
              filter={`url(#stone3DBump-${uid})`}
            />
            {/* Subtle 3D lathe-turned concentric ivory grain rings */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="rgba(168, 158, 142, 0.16)"
              strokeWidth="1.1"
            />
            <path
              d="M 0 32 Q 50 25 100 32 M 0 50 Q 50 44 100 50 M 0 68 Q 50 61 100 68"
              fill="none"
              stroke="rgba(148, 138, 120, 0.22)"
              strokeWidth="1.0"
            />
          </g>
        )}

        {/* ========================================================================
            2. SOVEREIGN GOLD ("24k Brushed Bullion")
            3D brushed 24k gold bullion with embossed royal filigree & golden bolsters
            ======================================================================== */}
        {styleOpt.texturePattern === 'brushed_bullion' && (
          <g data-texture-layer="brushed_bullion" pointerEvents="none">
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              fill={`url(#goldBullion-${uid})`}
              filter={`url(#metallic3DBump-${uid})`}
            />
            <rect x="0" y="0" width="100" height="100" fill={`url(#goldSheen-${uid})`} />
            {/* 3D Embossed Royal Bullion Cushion Frame & Filigree (Shadow + Specular Ridge) */}
            <rect
              x="9"
              y="9"
              width="82"
              height="82"
              rx="16"
              fill="none"
              stroke="rgba(69, 26, 3, 0.72)"
              strokeWidth="2.4"
            />
            <rect
              x="8.2"
              y="8.2"
              width="82"
              height="82"
              rx="16"
              fill="none"
              stroke="rgba(255, 251, 235, 0.75)"
              strokeWidth="1.1"
            />
            {/* 3D Embossed Corner Acanthus Scrollwork */}
            <path
              d="M 32 0 L 32 13 L 13 32 L 0 32 M 68 0 L 68 13 L 87 32 L 100 32 M 0 68 L 13 68 L 32 87 L 32 100 M 100 68 L 87 68 L 68 87 L 68 100"
              fill="none"
              stroke="rgba(69, 26, 3, 0.68)"
              strokeWidth="2.0"
              strokeLinejoin="round"
            />
            <path
              d="M 31.2 0 L 31.2 12.2 L 12.2 31.2 L 0 31.2 M 67.2 0 L 67.2 12.2 L 86.2 31.2 L 100 31.2"
              fill="none"
              stroke="rgba(255, 251, 235, 0.72)"
              strokeWidth="0.95"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* ========================================================================
            3. CYBER OBSIDIAN ("Carbon PCB Circuit")
            3D forged carbon-obsidian block with deep CNC-milled neon cyan trenches
            ======================================================================== */}
        {styleOpt.texturePattern === 'carbon_circuit' && (
          <g data-texture-layer="carbon_circuit" pointerEvents="none">
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              fill={`url(#cyberObsidian-${uid})`}
              filter={`url(#metallic3DBump-${uid})`}
            />
            {/* 3D Carbon-Weave Diagonal Relief */}
            <g stroke="rgba(15, 23, 42, 0.75)" strokeWidth="2.4">
              <line x1="0" y1="32" x2="32" y2="0" />
              <line x1="0" y1="68" x2="68" y2="0" />
              <line x1="0" y1="100" x2="100" y2="0" />
              <line x1="32" y1="100" x2="100" y2="32" />
              <line x1="68" y1="100" x2="100" y2="68" />
            </g>
            {/* Deep CNC-Milled Obsidian Trench Walls (Shadow + Rim Highlight) */}
            <g
              fill="none"
              stroke="#010309"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M 0 50 L 32 50 L 40 42 M 100 50 L 68 50 L 60 58 M 50 0 L 50 32 L 58 40 M 50 100 L 50 68 L 42 60" />
              <rect x="9" y="9" width="82" height="82" rx="16" />
            </g>
            {/* Glowing Neon Cyan Conduits Embedded Inside the Trenches */}
            <g
              className="animate-electro-channel-pulse"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M 0 50 L 32 50 L 40 42 M 100 50 L 68 50 L 60 58 M 50 0 L 50 32 L 58 40 M 50 100 L 50 68 L 42 60"
                stroke="#0284C7"
                strokeWidth="2.4"
              />
              <path
                d="M 0 50 L 32 50 L 40 42 M 100 50 L 68 50 L 60 58 M 50 0 L 50 32 L 58 40 M 50 100 L 50 68 L 42 60"
                stroke="#38BDF8"
                strokeWidth="1.2"
              />
              <rect
                x="9"
                y="9"
                width="82"
                height="82"
                rx="16"
                stroke="rgba(56, 189, 248, 0.65)"
                strokeWidth="1.3"
              />
            </g>
          </g>
        )}

        {/* ========================================================================
            4. IMPERIAL JADE ("Veined Imperial Jade")
            3D sculpted nephrite jade stone with mineral depth & embossed gold veins
            ======================================================================== */}
        {styleOpt.texturePattern === 'veined_jade' && (
          <g data-texture-layer="veined_jade" pointerEvents="none">
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              fill={`url(#jadeStone-${uid})`}
              filter={`url(#stone3DBump-${uid})`}
            />
            {/* Subsurface translucent jadeite clouds & 3D mineral veins */}
            <ellipse
              cx="34"
              cy="32"
              rx="32"
              ry="20"
              transform="rotate(-24 34 32)"
              fill="rgba(209, 250, 229, 0.24)"
            />
            <ellipse
              cx="68"
              cy="66"
              rx="28"
              ry="18"
              transform="rotate(32 68 66)"
              fill="rgba(2, 44, 34, 0.42)"
            />
            <path
              d="M 0 32 C 24 36, 36 18, 56 34 C 74 50, 74 64, 100 68"
              fill="none"
              stroke="rgba(209, 250, 229, 0.44)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M 32 100 C 36 70, 50 68, 64 44 C 72 26, 66 16, 68 0"
              fill="none"
              stroke="rgba(2, 44, 34, 0.56)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* 3D Recessed Gold-Leaf Inlay Channel */}
            <rect
              x="9.5"
              y="9.5"
              width="81"
              height="81"
              rx="16"
              fill="none"
              stroke="rgba(2, 44, 34, 0.72)"
              strokeWidth="2.4"
            />
            <rect
              x="8.8"
              y="8.8"
              width="81"
              height="81"
              rx="16"
              fill="none"
              stroke="rgba(253, 230, 138, 0.72)"
              strokeWidth="1.2"
            />
          </g>
        )}

        {/* ========================================================================
            5. DRAGON RUBY ("Prism Ruby Facets")
            3D multi-faceted crimson ruby gemstone with crown/pavilion depth
            ======================================================================== */}
        {styleOpt.texturePattern === 'faceted_gemstone' && (
          <g data-texture-layer="faceted_gemstone" pointerEvents="none">
            <rect x="0" y="0" width="100" height="100" fill={`url(#rubyGem-${uid})`} />
            {/* 3D Crown & Pavilion Gemstone Facet Planes */}
            <polygon points="0,0 100,0 50,50" fill="rgba(255, 255, 255, 0.20)" />
            <polygon points="0,100 0,0 50,50" fill="rgba(254, 202, 202, 0.12)" />
            <polygon points="100,0 100,100 50,50" fill="rgba(69, 10, 10, 0.28)" />
            <polygon points="100,100 0,100 50,50" fill="rgba(36, 4, 4, 0.52)" />
            {/* Inner Raised Table Facet & Gold Claw Bevels */}
            <polygon
              points="32,12 68,12 88,32 88,68 68,88 32,88 12,68 12,32"
              fill="rgba(239, 68, 68, 0.22)"
              stroke="rgba(254, 240, 138, 0.55)"
              strokeWidth="1.2"
            />
            <g stroke="rgba(255, 255, 255, 0.38)" strokeWidth="1.0">
              <line x1="0" y1="0" x2="32" y2="12" />
              <line x1="0" y1="0" x2="12" y2="32" />
              <line x1="100" y1="0" x2="68" y2="12" />
              <line x1="100" y1="0" x2="88" y2="32" />
              <line x1="100" y1="100" x2="88" y2="68" />
              <line x1="0" y1="100" x2="12" y2="68" />
            </g>
          </g>
        )}

        {/* ========================================================================
            6. ASTRAL RUNIC ("Nebula Star Chart")
            3D carved dark meteorite runestone with chiseled glowing violet runes
            ======================================================================== */}
        {styleOpt.texturePattern === 'nebula_astrolabe' && (
          <g data-texture-layer="nebula_astrolabe" pointerEvents="none">
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              fill={`url(#astralStone-${uid})`}
              filter={`url(#stone3DBump-${uid})`}
            />
            <ellipse
              cx="50"
              cy="50"
              rx="40"
              ry="26"
              transform="rotate(-28 50 50)"
              fill="rgba(168, 85, 247, 0.28)"
            />
            {/* Deeply Carved 3D Astrolabe Trenches */}
            <circle
              cx="50"
              cy="50"
              r="39"
              fill="none"
              stroke="rgba(0, 0, 0, 0.9)"
              strokeWidth="3.2"
            />
            <circle
              cx="50"
              cy="50"
              r="39"
              fill="none"
              stroke="rgba(196, 181, 253, 0.68)"
              strokeWidth="1.3"
            />
            <circle
              cx="50"
              cy="50"
              r="32"
              fill="none"
              stroke="rgba(253, 230, 138, 0.42)"
              strokeWidth="1.0"
              strokeDasharray="4 2.5"
            />
            <g stroke="rgba(216, 180, 254, 0.78)" strokeWidth="1.3" fill="none">
              <path d="M 13 21 L 17 14 L 21 21 M 15 18 L 19 18" />
              <path d="M 79 21 L 83 14 L 87 21 M 83 14 L 83 22" />
              <path d="M 13 79 L 17 86 L 21 79" />
              <path d="M 79 79 L 87 86 M 87 79 L 79 86" />
            </g>
          </g>
        )}

        {/* ========================================================================
            7. LAVA CUBE ("FORGED IN VOLCANIC CORE")
            Hyper-realistic 3D volcanic basalt crag boulders with procedural 3D bump
            lighting, chiseled rock bevels, and pulsing molten magma canyons
            ======================================================================== */}
        {styleOpt.texturePattern === 'volcanic_magma' && (
          <g data-texture-layer="volcanic_magma" pointerEvents="none">
            {/* Subsurface Incandescent Molten Magma Core */}
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              fill={`url(#lavaMagmaSubsurface-${uid})`}
            />

            {/* Deep 3D Canyon Drop Shadows Under Every Basalt Rock Slab */}
            <g fill="#060201" transform="translate(1.8, 2.2)">
              <polygon points="0,0 30,0 38,20 26,30 0,30" />
              <polygon points="34,0 66,0 61,19 50,25 40,19" />
              <polygon points="70,0 100,0 100,30 75,30 64,20" />
              <polygon points="0,34 25,34 32,49 18,54 0,66" />
              <polygon points="29,34 41,22 60,23 73,34 69,52 54,62 35,54" />
              <polygon points="76,34 100,34 100,66 80,55 71,49" />
              <polygon points="0,70 18,57 30,58 30,100 0,100" />
              <polygon points="34,73 53,65 65,73 66,100 34,100" />
              <polygon points="70,71 80,58 100,70 100,100 70,100" />
            </g>

            {/* 3D Bump-Lit Volcanic Basalt Boulders */}
            <g
              filter={`url(#volcanic3DBump-${uid})`}
              fill={`url(#lavaObsidianRock-${uid})`}
              stroke="#3E1408"
              strokeWidth="0.9"
              strokeLinejoin="round"
            >
              <polygon points="0,0 30,0 38,20 26,30 0,30" />
              <polygon points="34,0 66,0 61,19 50,25 40,19" fill={`url(#lavaRockAlt-${uid})`} />
              <polygon points="70,0 100,0 100,30 75,30 64,20" />
              <polygon points="0,34 25,34 32,49 18,54 0,66" fill={`url(#lavaRockAlt-${uid})`} />
              <polygon points="29,34 41,22 60,23 73,34 69,52 54,62 35,54" />
              <polygon points="76,34 100,34 100,66 80,55 71,49" fill={`url(#lavaRockAlt-${uid})`} />
              <polygon points="0,70 18,57 30,58 30,100 0,100" fill={`url(#lavaRockAlt-${uid})`} />
              <polygon points="34,73 53,65 65,73 66,100 34,100" />
              <polygon points="70,71 80,58 100,70 100,100 70,100" fill={`url(#lavaRockAlt-${uid})`} />
            </g>

            {/* 3D Chiseled Top-Left Rock Ridge Highlights & Bottom-Right Shadow Facets */}
            <g fill="rgba(255, 195, 145, 0.18)">
              <polygon points="3,3 28,3 34,16 14,14 3,24" />
              <polygon points="36,3 63,3 56,14 42,14" />
              <polygon points="72,3 95,3 82,16 68,15" />
              <polygon points="3,36 23,36 27,45 10,47" />
              <polygon points="33,34 43,24 58,25 65,35 48,39" />
              <polygon points="77,36 96,36 86,47 73,46" />
              <polygon points="4,71 18,59 28,60 22,74 6,84" />
              <polygon points="36,74 52,67 62,74 54,84 38,84" />
              <polygon points="72,72 80,60 95,71 84,84" />
            </g>
            <g fill="rgba(0, 0, 0, 0.58)">
              <polygon points="26,30 38,20 34,16 20,26 4,26 0,30" />
              <polygon points="54,62 69,52 73,34 65,35 62,49 49,56" />
              <polygon points="30,100 30,58 26,64 24,96 4,96 0,100" />
              <polygon points="100,100 100,70 92,76 90,92 70,100" />
            </g>

            {/* Pulsating 4-Stage Molten Magma Fissures Embedded Deep Between Rock Boulders */}
            <g
              className="animate-lava-crack"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M 32 0 L 39 20 L 27 32 L 0 32 M 68 0 L 63 20 L 50 25 L 39 20 M 100 32 L 75 32 L 63 20 M 27 32 L 33 51 L 18 55 L 0 68 M 75 32 L 70 51 L 80 56 L 100 68 M 33 51 L 54 63 L 70 51 M 33 51 L 32 72 L 32 100 M 54 63 L 67 72 L 68 100 M 67 72 L 80 56"
                stroke="rgba(220, 38, 38, 0.78)"
                strokeWidth="4.4"
              />
              <path
                d="M 32 0 L 39 20 L 27 32 L 0 32 M 68 0 L 63 20 L 50 25 L 39 20 M 100 32 L 75 32 L 63 20 M 27 32 L 33 51 L 18 55 L 0 68 M 75 32 L 70 51 L 80 56 L 100 68 M 33 51 L 54 63 L 70 51 M 33 51 L 32 72 L 32 100 M 54 63 L 67 72 L 68 100 M 67 72 L 80 56"
                stroke="#FF6D00"
                strokeWidth="2.3"
              />
              <path
                d="M 32 0 L 39 20 L 27 32 L 0 32 M 68 0 L 63 20 L 50 25 L 39 20 M 100 32 L 75 32 L 63 20 M 27 32 L 33 51 L 18 55 L 0 68 M 75 32 L 70 51 L 80 56 L 100 68 M 33 51 L 54 63 L 70 51 M 33 51 L 32 72 L 32 100 M 54 63 L 67 72 L 68 100"
                stroke="#FFF59D"
                strokeWidth="1.0"
              />
            </g>
          </g>
        )}

        {/* ========================================================================
            8. ELECTRO CUBE ("POWERED BY PURE ENERGY")
            Hyper-realistic 3D brushed gunmetal body with curved 3D titanium corner
            bumpers, hex-bolt sockets, and surging high-voltage cyan plasma trenches
            ======================================================================== */}
        {styleOpt.texturePattern === 'electric_plasma' && (
          <g data-texture-layer="electric_plasma" pointerEvents="none">
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              fill={`url(#electroGunmetal-${uid})`}
              filter={`url(#metallic3DBump-${uid})`}
            />

            {/* 3D Recessed Armor Panel Seams & Deep CNC Plasma Trenches */}
            <g fill="none" strokeLinejoin="round" strokeLinecap="round">
              <path
                d="M 50 0 L 50 100 M 0 50 L 100 50 M 18 18 L 82 82 M 82 18 L 18 82"
                stroke="#01040D"
                strokeWidth="3.8"
              />
              <rect
                x="11"
                y="11"
                width="78"
                height="78"
                rx="15"
                stroke="#01040D"
                strokeWidth="4.4"
              />
              {/* Surging High-Voltage Cyan Plasma Channels */}
              <g className="animate-electro-channel-pulse">
                <path
                  d="M 50 0 L 50 100 M 0 50 L 100 50"
                  stroke="rgba(0, 240, 255, 0.55)"
                  strokeWidth="3.2"
                />
                <path
                  d="M 50 0 L 50 100 M 0 50 L 100 50"
                  stroke="#E0F2FE"
                  strokeWidth="1.2"
                />
                <rect
                  x="11"
                  y="11"
                  width="78"
                  height="78"
                  rx="15"
                  stroke="rgba(0, 240, 255, 0.48)"
                  strokeWidth="3.2"
                />
                <rect
                  x="11"
                  y="11"
                  width="78"
                  height="78"
                  rx="15"
                  stroke="#00F0FF"
                  strokeWidth="1.5"
                />
                <rect
                  x="11"
                  y="11"
                  width="78"
                  height="78"
                  rx="15"
                  stroke="#FFFFFF"
                  strokeWidth="0.65"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="22"
                  stroke="rgba(56, 189, 248, 0.55)"
                  strokeWidth="1.3"
                />
              </g>
            </g>

            {/* 3D Cast Drop Shadows Under the 4 Molded Titanium Corner Bumpers */}
            <g fill="rgba(0, 0, 0, 0.85)" transform="translate(1.5, 1.8)">
              <path d="M 0 0 L 32 0 L 28 13 L 19 19 L 13 28 L 0 32 Z" />
              <path d="M 68 0 L 100 0 L 100 32 L 87 28 L 81 19 L 72 13 Z" />
              <path d="M 0 68 L 13 72 L 19 81 L 28 87 L 32 100 L 0 100 Z" />
              <path d="M 87 72 L 100 68 L 100 100 L 68 100 L 72 87 L 81 81 Z" />
            </g>

            {/* 4 Sculpted 3D Brushed-Titanium Rounded Corner Armor Bumpers */}
            <g stroke="#0F172A" strokeWidth="0.85" strokeLinejoin="round">
              {/* Top-Left Bumper */}
              <path
                d="M 0 0 L 32 0 L 28 13 L 19 19 L 13 28 L 0 32 Z"
                fill={`url(#electroSteelArmor-${uid})`}
              />
              <polyline
                points="2,28 11,25 17,17 25,11 28,2"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.2"
              />
              <circle cx="13" cy="13" r="2.8" fill="#091326" stroke="#CBD5E1" strokeWidth="0.8" />
              <circle cx="12.5" cy="12.5" r="1.1" fill="#00F0FF" />

              {/* Top-Right Bumper */}
              <path
                d="M 68 0 L 100 0 L 100 32 L 87 28 L 81 19 L 72 13 Z"
                fill={`url(#electroSteelArmor-${uid})`}
              />
              <polyline
                points="72,2 75,11 83,17 89,25 98,28"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.15"
              />
              <circle cx="87" cy="13" r="2.8" fill="#091326" stroke="#CBD5E1" strokeWidth="0.8" />
              <circle cx="86.5" cy="12.5" r="1.1" fill="#00F0FF" />

              {/* Bottom-Left Bumper */}
              <path
                d="M 0 68 L 13 72 L 19 81 L 28 87 L 32 100 L 0 100 Z"
                fill={`url(#electroSteelArmor-${uid})`}
              />
              <polyline
                points="2,72 11,75 17,83 25,89 28,98"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="1.05"
              />
              <circle cx="13" cy="87" r="2.8" fill="#091326" stroke="#CBD5E1" strokeWidth="0.8" />
              <circle cx="12.5" cy="86.5" r="1.1" fill="#00F0FF" />

              {/* Bottom-Right Bumper */}
              <path
                d="M 87 72 L 100 68 L 100 100 L 68 100 L 72 87 L 81 81 Z"
                fill={`url(#electroSteelArmor-${uid})`}
              />
              <polyline
                points="72,98 75,89 83,83 89,75 98,72"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="1.0"
              />
              <circle cx="87" cy="87" r="2.8" fill="#091326" stroke="#CBD5E1" strokeWidth="0.8" />
              <circle cx="86.5" cy="86.5" r="1.1" fill="#00F0FF" />
            </g>

            {/* Crackling Surface Lightning Arcs */}
            <g
              className="animate-electro-arc"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M 19 19 L 27 22 L 32 17 L 41 26 M 81 19 L 73 23 L 68 17 L 59 26 M 19 81 L 28 75 L 33 82 L 42 73 M 81 81 L 72 76 L 67 82 L 58 73"
                stroke="#00F0FF"
                strokeWidth="1.7"
              />
              <path
                d="M 19 19 L 27 22 L 32 17 L 41 26 M 81 19 L 73 23 L 68 17 L 59 26"
                stroke="#FFFFFF"
                strokeWidth="0.75"
              />
            </g>
          </g>
        )}

        {/* ========================================================================
            9. TESSERACT CUBE ("BEYOND DIMENSIONS")
            Hyper-realistic 3D crystal prism with stepped infinity-mirror 4D chambers
            ======================================================================== */}
        {styleOpt.texturePattern === 'dimensional_tesseract' && (
          <g data-texture-layer="dimensional_tesseract" pointerEvents="none">
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              fill={`url(#tesseractCrystalBody-${uid})`}
            />

            {/* 3D Perspective Crystal Refraction Facets */}
            <polygon points="0,0 100,0 74,26 26,26" fill="rgba(103, 232, 249, 0.18)" />
            <polygon points="0,0 26,26 26,74 0,100" fill="rgba(192, 132, 252, 0.15)" />
            <polygon points="74,26 100,0 100,100 74,74" fill="rgba(15, 7, 45, 0.46)" />
            <polygon points="26,74 74,74 100,100 0,100" fill="rgba(7, 3, 24, 0.62)" />

            {/* 4D Perspective Struts Connecting Outer Crystal to Inner Hypercube */}
            <g stroke="#67E8F9" strokeWidth="1.6">
              <line x1="6" y1="6" x2="36" y2="36" />
              <line x1="94" y1="6" x2="64" y2="36" />
              <line x1="6" y1="94" x2="36" y2="64" />
              <line x1="94" y1="94" x2="64" y2="64" />
            </g>

            {/* Recessed Dimensional Chamber Step 1 */}
            <g className="animate-tesseract-outer">
              <rect
                x="14"
                y="14"
                width="72"
                height="72"
                rx="12"
                fill="rgba(15, 10, 48, 0.42)"
                stroke="#A5B4FC"
                strokeWidth="1.5"
              />
            </g>

            {/* Recessed Dimensional Chamber Step 2 & Step 3 (Animated Counter-Shift) */}
            <g className="animate-tesseract-inner">
              <polygon
                points="50,11 89,50 50,89 11,50"
                fill="rgba(99, 102, 241, 0.16)"
                stroke="rgba(103, 232, 249, 0.62)"
                strokeWidth="1.2"
              />
              <rect
                x="24"
                y="24"
                width="52"
                height="52"
                rx="8"
                fill="rgba(56, 189, 248, 0.18)"
                stroke="#38BDF8"
                strokeWidth="1.6"
              />
              <rect
                x="35"
                y="35"
                width="30"
                height="30"
                rx="5"
                fill="rgba(192, 132, 252, 0.28)"
                stroke="#E879F9"
                strokeWidth="1.4"
              />
              <rect
                x="43"
                y="43"
                width="14"
                height="14"
                rx="3"
                fill="rgba(255, 255, 255, 0.28)"
                stroke="#FFFFFF"
                strokeWidth="1.0"
              />
            </g>

            {/* Luminous 4D Vertex Nodes */}
            <g fill="#FFFFFF">
              <circle cx="16" cy="16" r="1.6" />
              <circle cx="84" cy="16" r="1.6" />
              <circle cx="16" cy="84" r="1.6" />
              <circle cx="84" cy="84" r="1.6" />
              <circle cx="25" cy="25" r="1.4" fill="#67E8F9" />
              <circle cx="75" cy="25" r="1.4" fill="#67E8F9" />
              <circle cx="25" cy="75" r="1.4" fill="#67E8F9" />
              <circle cx="75" cy="75" r="1.4" fill="#67E8F9" />
            </g>
          </g>
        )}

        {/* ========================================================================
            10. COSMO CUBE ("A UNIVERSE IN YOUR HANDS")
            Deeply rounded cosmic crystal-glass block housing a swirling 3D spiral
            galaxy, glowing nebula arms, golden planetary orbits, and twinkling stars
            ======================================================================== */}
        {styleOpt.texturePattern === 'voidnod_cosmos' && (
          <g data-texture-layer="voidnod_cosmos" pointerEvents="none">
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              fill={`url(#cosmoDeepSpace-${uid})`}
            />

            {/* Swirling 3D Spiral Galaxy & Multi-Layer Nebula Vortex */}
            <g className="animate-orbit-cw">
              <circle cx="50" cy="50" r="46" fill={`url(#cosmoEmbeddedNebula-${uid})`} />
              {/* Magenta-Violet Spiral Arms */}
              <path
                d="M 50 50 C 58 36, 78 38, 86 56 C 90 72, 74 86, 54 88 M 50 50 C 42 64, 22 62, 14 44 C 10 28, 26 14, 46 12"
                fill="none"
                stroke="rgba(236, 72, 153, 0.48)"
                strokeWidth="8.5"
                strokeLinecap="round"
              />
              <path
                d="M 50 50 C 58 36, 78 38, 86 56 C 90 72, 74 86, 54 88 M 50 50 C 42 64, 22 62, 14 44 C 10 28, 26 14, 46 12"
                fill="none"
                stroke="#F0ABFC"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Sapphire-Cyan Spiral Arms */}
              <path
                d="M 50 50 C 64 58, 62 78, 44 86 C 28 90, 14 74, 12 54 M 50 50 C 36 42, 38 22, 56 14 C 72 10, 86 26, 88 46"
                fill="none"
                stroke="rgba(56, 189, 248, 0.48)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <path
                d="M 50 50 C 64 58, 62 78, 44 86 C 28 90, 14 74, 12 54 M 50 50 C 36 42, 38 22, 56 14 C 72 10, 86 26, 88 46"
                fill="none"
                stroke="#7DD3FC"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </g>

            {/* Golden & Violet Celestial Orbital Rings */}
            <ellipse
              cx="50"
              cy="50"
              rx="42"
              ry="15"
              transform="rotate(-30 50 50)"
              fill="none"
              stroke="rgba(251, 191, 36, 0.65)"
              strokeWidth="1.3"
            />
            <ellipse
              cx="50"
              cy="50"
              rx="39"
              ry="13"
              transform="rotate(28 50 50)"
              fill="none"
              stroke="rgba(192, 132, 252, 0.58)"
              strokeWidth="1.1"
              strokeDasharray="4 3"
            />

            {/* Twinkling Deep-Space Starfield */}
            <g className="animate-cosmo-twinkle">
              <circle cx="16" cy="18" r="1.4" fill="#FFFFFF" />
              <circle cx="82" cy="15" r="1.2" fill="#FDE68A" />
              <circle cx="15" cy="83" r="1.3" fill="#F5D0FE" />
              <circle cx="84" cy="82" r="1.4" fill="#FFFFFF" />
              <circle cx="50" cy="12" r="1.2" fill="#BAE6FD" />
              <circle cx="12" cy="48" r="1.1" fill="#FDE68A" />
              <circle cx="88" cy="52" r="1.2" fill="#F5D0FE" />
              <circle cx="50" cy="88" r="1.2" fill="#BAE6FD" />
              <circle cx="34" cy="20" r="0.9" fill="#FFFFFF" />
              <circle cx="67" cy="79" r="0.9" fill="#FFFFFF" />
            </g>
          </g>
        )}

        {/* ========================================================================
            SCULPTED 3D ROUNDED CUSHION BEVEL & SPHERICAL VERTEX HIGHLIGHT
            Curves the rounded perimeter (rx="22") smoothly into the 3D cube body
            without any straight rectangular grid lines or stitched seams.
            ======================================================================== */}
        <g pointerEvents="none" data-layer="shared-3d-bevels">
          {/* Continuous 3D Spherical Volume Shading */}
          <rect x="0" y="0" width="100" height="100" fill={`url(#faceVolume-${uid})`} />

          {/* Outer Molded 3D Cushion Rim (rx="15.5") */}
          <rect
            x="1.2"
            y="1.2"
            width="97.6"
            height="97.6"
            rx="15.5"
            ry="15.5"
            fill="none"
            stroke={`url(#roundedBevelRing-${uid})`}
            strokeWidth="3.6"
          />
          {/* Inner Soft Pillow Roll-Off Contour (rx="13.5") */}
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="13.5"
            ry="13.5"
            fill="none"
            stroke={`url(#roundedBevelRing-${uid})`}
            strokeWidth="1.4"
            opacity="0.52"
          />

          {/* Curved Glassy Crown Specular Arc */}
          <path
            d="M 14 24 C 14 12, 24 8, 46 8 L 74 8 C 52 11, 24 14, 14 24 Z"
            fill="rgba(255, 255, 255, 0.20)"
          />

          {/* Shared 3D Vertex Specular Glow (Wraps across the 3 meeting faces at V_TFL) */}
          <rect x="0" y="0" width="100" height="100" fill={`url(#sharedVertexHighlight-${uid})`} />
        </g>

        {/* ========================================================================
            DEEPLY RECESSED 3D DICE PIPS (Embedded into the 3D surface material)
            ======================================================================== */}
        {styleOpt.pipShape === 'roman' ? (
          <g>
            {pips.length > 1 && (
              <polyline
                points={pips.map(([cx, cy]) => `${cx},${cy}`).join(' ')}
                fill="none"
                stroke="rgba(192, 132, 252, 0.38)"
                strokeWidth="1.1"
                strokeDasharray="2 2"
              />
            )}
            {pips.map(([cx, cy], idx) => (
              <g key={idx}>
                <circle cx={cx} cy={cy} r={3.8} fill="rgba(253, 230, 138, 0.38)" />
                <circle cx={cx} cy={cy} r={1.8} fill="#FFFFFF" />
              </g>
            ))}
            <text
              x="51"
              y="64"
              textAnchor="middle"
              fill="rgba(0, 0, 0, 0.92)"
              fontSize={safeFace === 4 || safeFace === 6 ? '34' : '38'}
              fontWeight="800"
              fontFamily="Georgia, serif"
              letterSpacing="1"
            >
              {ROMAN_NUMERALS[safeFace]}
            </text>
            <text
              x="50"
              y="62.2"
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
            const r = safeFace === 1 ? 12.6 : 9.2;

            if (styleOpt.pipShape === 'magma') {
              return (
                <g key={idx} className="animate-pip-pulse-subtle">
                  {/* 3D Volcanic Crater Rim Catch-Light */}
                  <circle
                    cx={cx + 0.9}
                    cy={cy + 1.0}
                    r={r * 1.28}
                    fill="rgba(255, 135, 50, 0.46)"
                  />
                  {/* Deep Chiseled Volcanic Crater Wall */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 1.24}
                    fill="#090301"
                    stroke="#7F1D1D"
                    strokeWidth="1.4"
                  />
                  {/* Sunken Bubbling Molten Magma Pool */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 1.05}
                    fill={`url(#lavaPipSocket-${uid})`}
                  />
                  {/* Top-Left Overhanging Rock Crater Inner Shadow */}
                  <path
                    d={`M ${cx - r * 0.96} ${cy + r * 0.32} A ${r * 1.02} ${r * 1.02} 0 0 1 ${
                      cx + r * 0.68
                    } ${cy - r * 0.76}`}
                    fill="none"
                    stroke="rgba(12, 3, 1, 0.88)"
                    strokeWidth="2.0"
                    strokeLinecap="round"
                  />
                  {/* White-Hot Incandescent Magma Core */}
                  <circle cx={cx} cy={cy} r={r * 0.58} fill="#FFF176" />
                  <circle cx={cx - r * 0.2} cy={cy - r * 0.2} r={r * 0.28} fill="#FFFFFF" />
                </g>
              );
            }

            if (styleOpt.pipShape === 'plasma') {
              return (
                <g key={idx} className="animate-pip-pulse-subtle">
                  {/* High-Voltage Cyan Plasma Corona */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 1.42}
                    fill={`url(#electroCorePip-${uid})`}
                  />
                  {/* Metallic Socket Rim Catch-Light */}
                  <circle
                    cx={cx + 0.8}
                    cy={cy + 0.9}
                    r={r * 1.2}
                    fill="rgba(224, 242, 254, 0.55)"
                  />
                  {/* Recessed Gunmetal Capacitor Bezel */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 1.16}
                    fill="#030812"
                    stroke="#0284C7"
                    strokeWidth="1.4"
                  />
                  {/* Convex 3D Cyan Energy Lens */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 0.92}
                    fill="#00F0FF"
                    stroke="#E0F2FE"
                    strokeWidth="1.1"
                  />
                  {/* Inner Socket Shadow Arc */}
                  <path
                    d={`M ${cx - r * 0.82} ${cy + r * 0.28} A ${r * 0.88} ${r * 0.88} 0 0 1 ${
                      cx + r * 0.58
                    } ${cy - r * 0.64}`}
                    fill="none"
                    stroke="rgba(3, 105, 161, 0.72)"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  {/* Pure White-Cyan Plasma Core & Specular Glint */}
                  <circle cx={cx} cy={cy} r={r * 0.58} fill="#FFFFFF" />
                  <circle cx={cx - r * 0.24} cy={cy - r * 0.24} r={r * 0.24} fill="#FFFFFF" />
                </g>
              );
            }

            if (styleOpt.pipShape === 'tesseract') {
              return (
                <g key={idx} className="animate-pip-pulse-subtle">
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 1.42}
                    fill={`url(#tesseractCorePip-${uid})`}
                  />
                  {/* Recessed Crystal Socket Bezel */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 1.14}
                    fill="rgba(8, 5, 28, 0.92)"
                    stroke="#67E8F9"
                    strokeWidth="1.3"
                  />
                  {/* 3D Octahedron Crystal Gem Facet */}
                  <polygon
                    points={`${cx},${cy - r * 1.04} ${cx + r * 1.04},${cy} ${cx},${
                      cy + r * 1.04
                    } ${cx - r * 1.04},${cy}`}
                    fill="rgba(168, 85, 247, 0.62)"
                    stroke="#F5D0FE"
                    strokeWidth="1.0"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 0.8}
                    fill="#E879F9"
                    stroke="#FFFFFF"
                    strokeWidth="1.0"
                  />
                  <circle cx={cx - r * 0.15} cy={cy - r * 0.15} r={r * 0.48} fill="#FFFFFF" />
                </g>
              );
            }

            if (styleOpt.pipShape === 'cosmos') {
              return (
                <g key={idx} className="animate-pip-pulse-subtle">
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 1.44}
                    fill={`url(#cosmoOrbPip-${uid})`}
                  />
                  {/* Recessed Gravity-Well Socket */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 1.14}
                    fill="rgba(5, 3, 20, 0.9)"
                    stroke="rgba(192, 132, 252, 0.78)"
                    strokeWidth="1.2"
                  />
                  {/* 3D Celestial Star-Orb */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 0.9}
                    fill="#38BDF8"
                    stroke="#E0F2FE"
                    strokeWidth="1.15"
                  />
                  <path
                    d={getStarPath(cx, cy, r * 1.18)}
                    fill="#FFFFFF"
                    opacity="0.95"
                  />
                  <circle cx={cx - r * 0.15} cy={cy - r * 0.15} r={r * 0.5} fill="#FFFFFF" />
                </g>
              );
            }

            if (styleOpt.pipShape === 'diamond') {
              return (
                <g key={idx}>
                  <polygon
                    points={`${cx + 0.9},${cy - r * 1.26 + 0.9} ${cx + r * 1.26 + 0.9},${
                      cy + 0.9
                    } ${cx + 0.9},${cy + r * 1.26 + 0.9} ${cx - r * 1.26 + 0.9},${cy + 0.9}`}
                    fill="rgba(255, 251, 235, 0.72)"
                  />
                  <polygon
                    points={`${cx},${cy - r * 1.26} ${cx + r * 1.26},${cy} ${cx},${
                      cy + r * 1.26
                    } ${cx - r * 1.26},${cy}`}
                    fill="rgba(24, 10, 2, 0.84)"
                  />
                  <polygon
                    points={`${cx},${cy - r * 1.06} ${cx + r * 1.06},${cy} ${cx},${
                      cy + r * 1.06
                    } ${cx - r * 1.06},${cy}`}
                    fill={primaryPipFill}
                  />
                  <polygon
                    points={`${cx},${cy - r * 0.5} ${cx + r * 0.5},${cy} ${cx},${
                      cy + r * 0.5
                    } ${cx - r * 0.5},${cy}`}
                    fill="rgba(255, 255, 255, 0.74)"
                  />
                </g>
              );
            }

            if (styleOpt.pipShape === 'hexagon') {
              return (
                <g key={idx} className="animate-pip-pulse-subtle">
                  <polygon
                    points={getHexagonPoints(cx + 0.8, cy + 0.9, r * 1.26)}
                    fill="rgba(56, 189, 248, 0.42)"
                  />
                  <polygon
                    points={getHexagonPoints(cx, cy, r * 1.24)}
                    fill="#020617"
                    stroke={primaryPipFill}
                    strokeWidth="1.2"
                  />
                  <polygon
                    points={getHexagonPoints(cx, cy, r * 0.98)}
                    fill={primaryPipFill}
                  />
                  <circle cx={cx - r * 0.15} cy={cy - r * 0.15} r={r * 0.4} fill="#FFFFFF" />
                </g>
              );
            }

            if (styleOpt.pipShape === 'star') {
              return (
                <g key={idx}>
                  <circle
                    cx={cx + 0.8}
                    cy={cy + 0.9}
                    r={r * 1.16}
                    fill="rgba(209, 250, 229, 0.48)"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 1.14}
                    fill="rgba(1, 28, 22, 0.86)"
                    stroke="rgba(253, 230, 138, 0.55)"
                    strokeWidth="1.0"
                  />
                  <path d={getStarPath(cx, cy, r * 1.24)} fill={primaryPipFill} />
                  <circle cx={cx} cy={cy} r={r * 0.34} fill="#FFFFFF" />
                </g>
              );
            }

            // Default 'circle' pip (Classic Ivory 3D hemispherical lathe-drilled crater)
            return (
              <g key={idx}>
                {/* Bottom-right rim catch-light */}
                <circle
                  cx={cx + 0.9}
                  cy={cy + 1.0}
                  r={r * 1.14}
                  fill="rgba(255, 255, 255, 0.95)"
                />
                {/* Top-left inner crater shadow */}
                <circle
                  cx={cx - 0.7}
                  cy={cy - 0.8}
                  r={r * 1.1}
                  fill="rgba(45, 38, 28, 0.56)"
                />
                {/* Glossy recessed enamel pip */}
                <circle cx={cx} cy={cy} r={r * 0.98} fill={primaryPipFill} />
                {/* 3D concave specular highlight */}
                <ellipse
                  cx={cx - r * 0.28}
                  cy={cy - r * 0.28}
                  rx={r * 0.32}
                  ry={r * 0.22}
                  transform={`rotate(-30 ${cx - r * 0.28} ${cy - r * 0.28})`}
                  fill="rgba(255, 255, 255, 0.65)"
                />
              </g>
            );
          })
        )}
      </g>
    </svg>
  );
};
