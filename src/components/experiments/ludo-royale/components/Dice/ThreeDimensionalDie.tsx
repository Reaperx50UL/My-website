import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildCosmoIdleCelestialSpecs,
  buildCosmoRollingSupernovaSpecs,
  buildElectroBodyPulseSpecs,
  buildElectroCircularWaveRings,
  buildElectroIdleSparkSpecs,
  buildElectroRollingPulseSpecs,
  buildLavaSteamVentSpecs,
  buildTesseractIdleEnergyPulses,
  buildTesseractWarpFaceSpecs,
  COLOR_META,
  computeLavaThermalState,
  computeTesseractWarpPhase,
  DICE_FACE_ROTATIONS,
  getDiceStyleOption,
  LAVA_COOLING_TIMEOUT_MS,
} from '../../game/constants';
import { DiceStyle, PlayerColor } from '../../game/gameTypes';
import {
  getDiceAudioIdentity,
  getDiceIdleAudioSpec,
  soundManager,
} from '../../services/sound';
import { RoundedCube3DCanvas } from './RoundedCube3DCanvas';

export interface ThreeDimensionalDieProps {
  value: number | null;
  isRolling: boolean;
  canRoll?: boolean;
  activeColor?: PlayerColor;
  diceStyle?: DiceStyle;
  size?: number;
  reducedMotion?: boolean;
  showShadow?: boolean;
  showSixGlow?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  coolingTimeoutMs?: number;
  interactionTrigger?: number;
}

export const FACE_ROTATIONS = DICE_FACE_ROTATIONS;

export const ThreeDimensionalDie: React.FC<ThreeDimensionalDieProps> = ({
  value,
  isRolling,
  canRoll = false,
  activeColor = 'red',
  diceStyle = 'classic_ivory',
  size = 54,
  reducedMotion = false,
  showShadow = true,
  showSixGlow = true,
  interactive = true,
  onClick,
  className = '',
  coolingTimeoutMs = LAVA_COOLING_TIMEOUT_MS,
  interactionTrigger = 0,
}) => {
  const [displayFace, setDisplayFace] = useState<number>(value || 6);
  const [isLanding, setIsLanding] = useState<boolean>(false);
  const [isCooling, setIsCooling] = useState<boolean>(false);
  const [activityTick, setActivityTick] = useState<number>(0);
  const prevRollingRef = useRef<boolean>(isRolling);

  const styleOpt = getDiceStyleOption(diceStyle);
  const colorMeta = COLOR_META[activeColor] || COLOR_META.red;
  const isPremium2D = Boolean(styleOpt.isPremium2D);

  // Immediately reactivate bright lava flow animation upon any user interaction
  const reactivateLavaFlow = useCallback(() => {
    setIsCooling(false);
    setActivityTick((t) => t + 1);
  }, []);

  // Sync external interactionTrigger (e.g. from parent DiceRoller card)
  useEffect(() => {
    if (interactionTrigger > 0) {
      setIsCooling(false);
      setActivityTick((t) => t + 1);
    }
  }, [interactionTrigger]);

  // Secondary Idle State ("Cooling Effect"):
  // When the Lava Cube hasn't been rolled or interacted with for >10 seconds (coolingTimeoutMs),
  // transition into the dimmed, slow-pulsing cooling state.
  useEffect(() => {
    if (
      diceStyle !== 'lava_cube' ||
      isRolling ||
      isLanding ||
      reducedMotion
    ) {
      setIsCooling(false);
      return;
    }

    setIsCooling(false);
    const coolingTimer = window.setTimeout(() => {
      setIsCooling(true);
    }, coolingTimeoutMs);

    return () => {
      window.clearTimeout(coolingTimer);
    };
  }, [
    diceStyle,
    isRolling,
    isLanding,
    value,
    reducedMotion,
    coolingTimeoutMs,
    activityTick,
  ]);

  // Sync displayFace whenever value updates and detect Phase 4-5 Landing & Settling
  useEffect(() => {
    if (value !== null && value >= 1 && value <= 6) {
      setDisplayFace(value);
    }
    if (prevRollingRef.current && !isRolling) {
      if (!reducedMotion) {
        setIsLanding(true);
        const timer = window.setTimeout(() => {
          setIsLanding(false);
        }, 540);
        prevRollingRef.current = isRolling;
        return () => window.clearTimeout(timer);
      }
    }
    prevRollingRef.current = isRolling;
  }, [isRolling, value, reducedMotion]);

  // Ambient Idle Sound Effects Loop for the active interactive die
  // (Lava Cube magma simmer/cooling ember, Electro Cube Tesla hum & micro-sparks,
  //  Tesseract Cube 4D crystal drone & conduit ping, Cosmo Cube celestial pad & starlight chimes)
  useEffect(() => {
    if (!interactive) return;
    if (isRolling || isLanding || reducedMotion) {
      soundManager.stopDiceIdleLoop();
      return;
    }
    soundManager.startDiceIdleLoop(diceStyle, { isCooling });
    return () => {
      soundManager.stopDiceIdleLoop();
    };
  }, [interactive, diceStyle, isRolling, isLanding, isCooling, reducedMotion]);

  const audioIdentity = getDiceAudioIdentity(diceStyle);
  const idleAudioSpec = getDiceIdleAudioSpec(diceStyle, { isCooling });

  const safeFace = displayFace >= 1 && displayFace <= 6 ? displayFace : 6;
  const isSix = !isRolling && value === 6;
  const lavaThermalState = computeLavaThermalState({
    diceStyle,
    isRolling,
    isLanding,
    elapsedIdleMs: isCooling ? coolingTimeoutMs + 1 : 0,
    coolingTimeoutMs,
  });
  const isLavaSpittingState =
    diceStyle === 'lava_cube' && (isRolling || isLanding);
  const lavaSteamVents = isLavaSpittingState ? buildLavaSteamVentSpecs(6) : [];
  const electroBodyPulses =
    diceStyle === 'electro_cube' ? buildElectroBodyPulseSpecs() : [];
  const electroIdleSparks =
    diceStyle === 'electro_cube' && !isRolling
      ? buildElectroIdleSparkSpecs(8)
      : [];
  const electroRollingPulses =
    diceStyle === 'electro_cube' && (isRolling || isLanding)
      ? buildElectroRollingPulseSpecs(8)
      : [];
  const electroCircularWaves =
    diceStyle === 'electro_cube' && (isRolling || isLanding)
      ? buildElectroCircularWaveRings(3)
      : [];
  const tesseractWarpPhase = computeTesseractWarpPhase({
    diceStyle,
    isRolling,
    isLanding,
  });
  const tesseractFaceSizePx = Math.max(24, Math.round(size * 0.76));
  const tesseractHalfExtentPx = Math.max(
    12,
    Math.round(tesseractFaceSizePx * 0.5)
  );
  const tesseractWarpFaces =
    diceStyle === 'tesseract_cube'
      ? buildTesseractWarpFaceSpecs(safeFace, tesseractHalfExtentPx)
      : [];
  const tesseractIdlePulses =
    diceStyle === 'tesseract_cube' ? buildTesseractIdleEnergyPulses() : [];
  const cosmoIdleCelestial =
    diceStyle === 'cosmo_cube' ? buildCosmoIdleCelestialSpecs() : null;
  const cosmoRollingSupernova =
    diceStyle === 'cosmo_cube' && (isRolling || isLanding)
      ? buildCosmoRollingSupernovaSpecs()
      : null;

  return (
    <div
      data-dice-style={styleOpt.id}
      data-dice-texture={styleOpt.texturePattern}
      data-dice-animation={styleOpt.animationProfile}
      data-dice-roll-class={styleOpt.rollPhysics.rollingEffectClass}
      data-dice-idle-audio={idleAudioSpec.idleProfile}
      data-dice-idle-audio-src={idleAudioSpec.audioAssetUrl}
      data-dice-roll-audio-src={audioIdentity.rollAudioAsset}
      data-dice-model={isPremium2D ? styleOpt.modelGeometry : 'cube_3d'}
      data-dice-landing={isLanding ? 'true' : 'false'}
      data-lava-state={
        diceStyle === 'lava_cube' ? lavaThermalState : undefined
      }
      data-tesseract-state={
        diceStyle === 'tesseract_cube' ? tesseractWarpPhase : undefined
      }
      className={`dice-stage-perspective relative inline-flex items-center justify-center select-none overflow-visible ${
        !isRolling && interactive && canRoll
          ? 'hover:scale-105 active:scale-95 transition-transform duration-150 cursor-pointer'
          : ''
      } ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      onPointerEnter={() => {
        if (diceStyle === 'lava_cube') {
          reactivateLavaFlow();
        }
        if (interactive && !isRolling && !isLanding && !reducedMotion && idleAudioSpec.enabled) {
          soundManager.startDiceIdleLoop(diceStyle, { isCooling: false });
        }
      }}
      onPointerDown={diceStyle === 'lava_cube' ? reactivateLavaFlow : undefined}
      onTouchStart={diceStyle === 'lava_cube' ? reactivateLavaFlow : undefined}
      onFocus={diceStyle === 'lava_cube' ? reactivateLavaFlow : undefined}
      onClick={() => {
        if (diceStyle === 'lava_cube') {
          reactivateLavaFlow();
        }
        if (interactive && canRoll && !isRolling && onClick) {
          onClick();
        }
      }}
      role={interactive && canRoll ? 'button' : undefined}
      tabIndex={interactive && canRoll ? 0 : undefined}
      aria-label={`${styleOpt.label} Dice (${safeFace}${
        isRolling ? ' - rolling' : ''
      })`}
      onKeyDown={(e) => {
        if (diceStyle === 'lava_cube') {
          reactivateLavaFlow();
        }
        if (
          interactive &&
          canRoll &&
          !isRolling &&
          onClick &&
          (e.key === 'Enter' || e.key === ' ')
        ) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Dynamic 3D Tabletop Contact Shadow & Ambient Subsurface Glow */}
      {showShadow && (
        <div
          aria-hidden="true"
          className={`absolute pointer-events-none transition-all duration-200 rounded-full ${
            isRolling && !reducedMotion
              ? 'animate-dice-shadow-bounce'
              : !reducedMotion
              ? 'animate-dice-shadow-breathe'
              : ''
          }`}
          style={{
            width: `${Math.round(size * 0.86)}px`,
            height: `${Math.round(size * 0.28)}px`,
            bottom: `-${Math.round(size * 0.1)}px`,
            background: `radial-gradient(ellipse at center, rgba(0,0,0,0.88) 0%, ${styleOpt.coreGlowHex} 52%, transparent 84%)`,
            opacity: isRolling ? 0.92 : 0.82,
            filter: 'blur(2.5px)',
          }}
        />
      )}

      {/* Celebratory Golden Aura on Rolling a 6 */}
      {showSixGlow && isSix && (
        <div
          aria-hidden="true"
          className="absolute inset-0.5 rounded-xl pointer-events-none border border-amber-400/75 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.55)]"
        />
      )}

      {/* ======================================================================
           1. LAVA CUBE PULSATING IDLE FLOWING CRACKS, COOLING EMBER STATE & ROLLING SPIT ERUPTION
          ====================================================================== */}
      {!reducedMotion && diceStyle === 'lava_cube' && (
        <div
          aria-hidden="true"
          data-testid="fx-lava-cube"
          data-cooling={isCooling && !isRolling ? 'true' : 'false'}
          className="absolute inset-0 -m-2.5 pointer-events-none overflow-visible flex items-center justify-center z-20"
        >
          {/* Ambient molten core heat aura behind the cube (dims and pulses slowly when cooling >10s) */}
          <div
            className={`w-full h-full rounded-full transition-opacity duration-700 -z-20 ${
              isCooling && !isRolling
                ? 'animate-lava-aura-cooling'
                : 'animate-lava-aura-pulse'
            }`}
            style={{
              background: isRolling
                ? 'radial-gradient(circle, rgba(255,109,0,0.42) 0%, rgba(220,38,38,0.22) 52%, transparent 74%)'
                : isCooling
                ? 'radial-gradient(circle, rgba(185,28,28,0.32) 0%, rgba(127,29,29,0.14) 52%, transparent 72%)'
                : 'radial-gradient(circle, rgba(255,106,0,0.46) 0%, rgba(239,68,68,0.22) 55%, transparent 76%)',
            }}
          />

          {/* Idle State: Bright Flowing Magma (<10s) OR Dimmed Slow-Pulsing Cooling Embers (>10s) */}
          {!isRolling && (
            <svg
              viewBox="0 0 100 100"
              className={`absolute inset-1.5 w-[calc(100%-12px)] h-[calc(100%-12px)] overflow-visible transition-opacity duration-700 ${
                isCooling ? 'opacity-45 animate-lava-crack-cooling' : 'opacity-90'
              }`}
            >
              {/* Flowing magma rim streams along the outer volcanic cracks */}
              <path
                d="M 32 10 L 38 24 L 26 34 L 12 34 M 68 10 L 63 24 L 50 28 L 38 24 M 88 34 L 74 34 L 63 24 M 12 66 L 24 56 L 34 52 L 32 88 M 88 66 L 76 56 L 68 52 L 68 88"
                fill="none"
                stroke={isCooling ? '#B91C1C' : '#FF9100'}
                strokeWidth={isCooling ? '1.35' : '1.8'}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="8 10"
                className={
                  isCooling
                    ? 'animate-lava-flow-cooling'
                    : 'animate-lava-flow-stream'
                }
                style={{
                  filter: isCooling
                    ? 'drop-shadow(0 0 2px #7F1D1D)'
                    : 'drop-shadow(0 0 4px #FF3D00)',
                }}
              />
              <path
                d="M 32 10 L 38 24 L 26 34 L 12 34 M 68 10 L 63 24 L 50 28 L 38 24 M 88 34 L 74 34 L 63 24 M 12 66 L 24 56 L 34 52 L 32 88 M 88 66 L 76 56 L 68 52 L 68 88"
                fill="none"
                stroke={isCooling ? '#EA580C' : '#FFF59D'}
                strokeWidth={isCooling ? '0.7' : '0.95'}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="4 14"
                className={
                  isCooling
                    ? 'animate-lava-flow-cooling'
                    : 'animate-lava-flow-reverse'
                }
              />
              {/* Bubbling magma nodes (only bright-bubbling when active; dim smoldering coals when cooling) */}
              <circle
                cx="38"
                cy="24"
                r={isCooling ? '1.2' : '1.8'}
                fill={isCooling ? '#DC2626' : '#FFF59D'}
                className={isCooling ? '' : 'animate-lava-bubble'}
              />
              <circle
                cx="63"
                cy="24"
                r={isCooling ? '1.1' : '1.7'}
                fill={isCooling ? '#B91C1C' : '#FF9100'}
                className={isCooling ? '' : 'animate-lava-bubble'}
                style={{ animationDelay: '0.45s' }}
              />
              <circle
                cx="34"
                cy="52"
                r={isCooling ? '1.2' : '1.9'}
                fill={isCooling ? '#EA580C' : '#FFF59D'}
                className={isCooling ? '' : 'animate-lava-bubble'}
                style={{ animationDelay: '0.9s' }}
              />
              <circle
                cx="68"
                cy="52"
                r={isCooling ? '1.1' : '1.7'}
                fill={isCooling ? '#B91C1C' : '#FF6D00'}
                className={isCooling ? '' : 'animate-lava-bubble'}
                style={{ animationDelay: '1.25s' }}
              />
            </svg>
          )}

          {/* Spitting State Periodic Volcanic Steam Vents: Soft atmospheric vapor puffs rising from the cracks */}
          {(isRolling || isLanding) && (
            <svg
              data-testid="lava-steam-vents"
              viewBox="0 0 120 120"
              className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] overflow-visible z-10 pointer-events-none"
              style={{
                filter: 'blur(0.75px)',
              }}
            >
              {lavaSteamVents.map((vent) => {
                const cx = vent.originX;
                const cy = vent.originY;
                const rx = vent.radiusX;
                const ry = vent.radiusY;
                return (
                  <g
                    key={vent.id}
                    data-testid="lava-steam-vent-puff"
                    className="animate-lava-steam-vent"
                    style={
                      {
                        '--steam-dx': `${vent.driftX}px`,
                        '--steam-dy': `${vent.riseY}px`,
                        animationDuration: `${vent.durationMs}ms`,
                        animationDelay: `${vent.delayMs}ms`,
                      } as React.CSSProperties
                    }
                  >
                    {/* Warm magma-lit under-glow at the crack vent mouth */}
                    <ellipse
                      cx={cx}
                      cy={cy + ry * 0.35}
                      rx={rx * 0.85}
                      ry={ry * 0.65}
                      fill={vent.baseTintHex}
                      opacity="0.48"
                    />
                    {/* Multi-lobed organic billowing volcanic steam cloud */}
                    <path
                      d={`M ${cx - rx} ${cy + ry * 0.2}
                          C ${cx - rx * 1.25} ${cy - ry * 0.55}, ${cx - rx * 0.55} ${cy - ry * 1.15}, ${cx} ${cy - ry * 0.95}
                          C ${cx + rx * 0.58} ${cy - ry * 1.2}, ${cx + rx * 1.25} ${cy - ry * 0.45}, ${cx + rx * 0.95} ${cy + ry * 0.22}
                          C ${cx + rx * 0.6} ${cy + ry * 0.72}, ${cx - rx * 0.55} ${cy + ry * 0.68}, ${cx - rx} ${cy + ry * 0.2} Z`}
                      fill={vent.vaporHex}
                      opacity="0.58"
                    />
                    {/* Upper wisp puff for atmospheric volcanic dispersion */}
                    <ellipse
                      cx={cx + (vent.driftX >= 0 ? 1.8 : -1.8)}
                      cy={cy - ry * 0.55}
                      rx={rx * 0.62}
                      ry={ry * 0.48}
                      fill="#F8FAFC"
                      opacity="0.42"
                    />
                  </g>
                );
              })}
            </svg>
          )}

          {/* Rolling State: Cube violently spits incandescent, viscous molten lava tongues, coalescing magma globs & cooling slag droplets from its cracks */}
          {isRolling && (
            <svg
              data-testid="lava-spit-particles"
              viewBox="0 0 140 140"
              className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] overflow-visible z-20 pointer-events-none"
              style={{
                filter:
                  'drop-shadow(0 0 3.5px rgba(255, 115, 0, 0.92)) drop-shadow(0 0 8px rgba(220, 38, 38, 0.7))',
              }}
            >
              <defs>
                {/* Viscous molten magma thermal gradient (white-hot core -> incandescent yellow -> fiery orange -> crimson mantle -> scorched basalt rim) */}
                <radialGradient id="lavaMagmaGlobGrad" cx="34%" cy="34%" r="68%">
                  <stop offset="0%" stopColor="#FFFDE7" />
                  <stop offset="24%" stopColor="#FFEE58" />
                  <stop offset="52%" stopColor="#FF7A00" />
                  <stop offset="80%" stopColor="#DC2626" />
                  <stop offset="100%" stopColor="#450A0A" />
                </radialGradient>
                {/* Hot liquid magma stream linear/radial gradient for stretching ribbons */}
                <radialGradient id="lavaSpatterDropGrad" cx="42%" cy="40%" r="64%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="32%" stopColor="#FFD600" />
                  <stop offset="68%" stopColor="#FF5722" />
                  <stop offset="100%" stopColor="#7F1D1D" />
                </radialGradient>
                {/* Subtle viscous liquid bloom filter so adjacent droplets coalesce into organic fluid magma */}
                <filter
                  id="lavaViscousFluidFilter"
                  x="-35%"
                  y="-35%"
                  width="170%"
                  height="170%"
                >
                  <feGaussianBlur
                    in="SourceGraphic"
                    stdDeviation="0.65"
                    result="softMagma"
                  />
                  <feColorMatrix
                    in="softMagma"
                    type="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 3.2 -0.55"
                    result="viscousCoalesced"
                  />
                  <feMerge>
                    <feMergeNode in="viscousCoalesced" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 1. Left-Upper Crack Curved Parabolic Magma Splash (roots at crack (48,50), whips left and curves down with gravity) */}
              <g
                className="animate-lava-spit"
                filter="url(#lavaViscousFluidFilter)"
                style={
                  {
                    '--spit-dx': '-11px',
                    '--spit-dy': '-4px',
                    '--spit-rot': '-18deg',
                    animationDelay: '0s',
                  } as React.CSSProperties
                }
              >
                {/* Curved viscous magma tongue stretching from crack (49,50) to multi-lobed head (25,44) */}
                <path
                  d="M 50 51 C 43 46, 36 41, 29 41 C 23 41, 19 45, 21 50 C 23 55, 30 55, 35 51 C 40 48, 45 50, 50 51 Z"
                  fill="url(#lavaMagmaGlobGrad)"
                />
                {/* Secondary irregular molten lobe branching off the main splash */}
                <path
                  d="M 34 43 C 30 37, 24 35, 22 39 C 20 42, 26 46, 32 45 Z"
                  fill="url(#lavaSpatterDropGrad)"
                />
                {/* Incandescent white-yellow thermal vein inside the liquid tongue */}
                <path
                  d="M 46 49 C 39 45, 32 43, 25 46 C 29 48, 37 47, 46 49 Z"
                  fill="#FFF9C4"
                />
                {/* Dark cooling volcanic basalt slag crust riding on the outer leading edge */}
                <path
                  d="M 21 43 C 19 46, 20 51, 24 53 C 22 49, 22 46, 24 43 Z"
                  fill="#3B0704"
                />
                {/* Detached parabolic falling spatter droplet & incandescent volcanic ember */}
                <path
                  d="M 18 52 C 15 53, 13 56, 15 58 C 17 59, 19 55, 18 52 Z"
                  fill="url(#lavaSpatterDropGrad)"
                />
                <circle cx="14" cy="46" r="1.15" fill="#FFF59D" />
              </g>

              {/* 2. Right-Upper Crack Whipping Magma Plume (asymmetric S-curve whipping right and arcing down) */}
              <g
                className="animate-lava-spit"
                filter="url(#lavaViscousFluidFilter)"
                style={
                  {
                    '--spit-dx': '11px',
                    '--spit-dy': '-3px',
                    '--spit-rot': '21deg',
                    animationDelay: '0.09s',
                  } as React.CSSProperties
                }
              >
                {/* Continuous curved liquid magma stream from crack (90,48) to bulbous head (115,45) */}
                <path
                  d="M 89 49 C 96 43, 104 39, 112 41 C 118 42, 121 48, 117 52 C 113 56, 106 53, 101 50 C 96 47, 92 49, 89 49 Z"
                  fill="url(#lavaMagmaGlobGrad)"
                />
                {/* Pinched lower-right coalescing magma droplet */}
                <path
                  d="M 106 51 C 110 55, 115 58, 117 55 C 119 52, 113 49, 106 51 Z"
                  fill="url(#lavaSpatterDropGrad)"
                />
                {/* White-hot pressurized core vein */}
                <path
                  d="M 93 48 C 100 44, 108 43, 114 46 C 109 48, 101 46, 93 48 Z"
                  fill="#FFFDE7"
                />
                {/* Dark cooling basalt crust patch on outer rim */}
                <path
                  d="M 116 42 C 120 45, 120 50, 116 53 C 118 49, 118 45, 115 42 Z"
                  fill="#3B0704"
                />
                <circle cx="122" cy="51" r="1.4" fill="url(#lavaSpatterDropGrad)" />
                <circle cx="124" cy="45" r="0.95" fill="#FFEE58" />
              </g>

              {/* 3. Left-Mid Fissure Heavy Viscous Magma Cascade (arcs outward and droops downward with gravity) */}
              <g
                className="animate-lava-spit"
                filter="url(#lavaViscousFluidFilter)"
                style={
                  {
                    '--spit-dx': '-12px',
                    '--spit-dy': '5px',
                    '--spit-rot': '-26deg',
                    animationDelay: '0.18s',
                  } as React.CSSProperties
                }
              >
                <path
                  d="M 46 70 C 38 69, 29 71, 22 76 C 17 80, 17 86, 23 87 C 29 88, 34 82, 38 77 C 41 73, 44 71, 46 70 Z"
                  fill="url(#lavaMagmaGlobGrad)"
                />
                {/* Stretched viscous bridge & secondary hanging drip */}
                <path
                  d="M 28 79 C 25 84, 24 90, 27 91 C 30 92, 31 85, 28 79 Z"
                  fill="url(#lavaSpatterDropGrad)"
                />
                <path
                  d="M 42 71 C 35 72, 27 75, 22 81 C 27 81, 35 76, 42 71 Z"
                  fill="#FFF9C4"
                />
                <path
                  d="M 19 79 C 17 83, 19 87, 24 88 C 21 85, 20 82, 21 79 Z"
                  fill="#450A0A"
                />
                <circle cx="15" cy="85" r="1.35" fill="url(#lavaSpatterDropGrad)" />
              </g>

              {/* 4. Right-Mid Fissure Dual-Lobed Magma Burst (whips outward right and drips down) */}
              <g
                className="animate-lava-spit"
                filter="url(#lavaViscousFluidFilter)"
                style={
                  {
                    '--spit-dx': '12px',
                    '--spit-dy': '4px',
                    '--spit-rot': '24deg',
                    animationDelay: '0.26s',
                  } as React.CSSProperties
                }
              >
                <path
                  d="M 94 69 C 102 68, 111 71, 118 76 C 123 80, 122 86, 116 87 C 110 88, 105 81, 101 76 C 98 72, 96 70, 94 69 Z"
                  fill="url(#lavaMagmaGlobGrad)"
                />
                <path
                  d="M 109 71 C 114 67, 120 68, 120 72 C 120 75, 114 74, 109 71 Z"
                  fill="url(#lavaSpatterDropGrad)"
                />
                <path
                  d="M 98 70 C 105 71, 113 75, 118 81 C 112 81, 105 75, 98 70 Z"
                  fill="#FFFDE7"
                />
                <path
                  d="M 121 78 C 123 82, 121 86, 116 88 C 119 85, 120 81, 119 78 Z"
                  fill="#3B0704"
                />
                <circle cx="125" cy="84" r="1.3" fill="#FF9100" />
              </g>

              {/* 5. Lower-Left Crack Heavy Molten Drip & Splatter Glob */}
              <g
                className="animate-lava-spit"
                filter="url(#lavaViscousFluidFilter)"
                style={
                  {
                    '--spit-dx': '-8px',
                    '--spit-dy': '9px',
                    '--spit-rot': '-30deg',
                    animationDelay: '0.13s',
                  } as React.CSSProperties
                }
              >
                <path
                  d="M 52 91 C 47 96, 41 102, 36 108 C 32 113, 36 118, 41 115 C 46 112, 48 104, 50 97 C 51 94, 52 92, 52 91 Z"
                  fill="url(#lavaMagmaGlobGrad)"
                />
                <path
                  d="M 49 94 C 45 99, 40 105, 38 111 C 42 108, 46 101, 49 94 Z"
                  fill="#FFF9C4"
                />
                <circle cx="33" cy="116" r="1.5" fill="url(#lavaSpatterDropGrad)" />
              </g>

              {/* 6. Lower-Right Crack Heavy Molten Drip & Splatter Glob */}
              <g
                className="animate-lava-spit"
                filter="url(#lavaViscousFluidFilter)"
                style={
                  {
                    '--spit-dx': '8px',
                    '--spit-dy': '9px',
                    '--spit-rot': '30deg',
                    animationDelay: '0.31s',
                  } as React.CSSProperties
                }
              >
                <path
                  d="M 88 91 C 93 96, 99 102, 104 108 C 108 113, 104 118, 99 115 C 94 112, 92 104, 90 97 C 89 94, 88 92, 88 91 Z"
                  fill="url(#lavaMagmaGlobGrad)"
                />
                <path
                  d="M 91 94 C 95 99, 100 105, 102 111 C 98 108, 94 101, 91 94 Z"
                  fill="#FFF9C4"
                />
                <circle cx="107" cy="116" r="1.5" fill="url(#lavaSpatterDropGrad)" />
              </g>

              {/* 7. Upper-Center Low-Arching Crown Fissure Surge (stays compact above the cube so it never touches HUD labels) */}
              <g
                className="animate-lava-spit"
                filter="url(#lavaViscousFluidFilter)"
                style={
                  {
                    '--spit-dx': '6px',
                    '--spit-dy': '-5px',
                    '--spit-rot': '14deg',
                    animationDelay: '0.21s',
                  } as React.CSSProperties
                }
              >
                <path
                  d="M 66 42 C 68 35, 74 30, 81 31 C 86 32, 87 37, 82 39 C 77 41, 71 40, 66 42 Z"
                  fill="url(#lavaMagmaGlobGrad)"
                />
                <path
                  d="M 69 40 C 72 35, 77 33, 82 35 C 78 37, 73 38, 69 40 Z"
                  fill="#FFFDE7"
                />
                <circle cx="88" cy="34" r="1.25" fill="#FFEE58" />
              </g>
            </svg>
          )}
        </div>
      )}

      {/* ======================================================================
           2. ELECTRO CUBE FULL-BODY ELECTRIC PULSES, IDLE TESLA SPARKS & ROLLING PULSE ERUPTIONS
          ====================================================================== */}
      {!reducedMotion && diceStyle === 'electro_cube' && (
        <div
          aria-hidden="true"
          data-testid="fx-electro-cube"
          className="absolute inset-0 -m-2.5 pointer-events-none overflow-visible flex items-center justify-center z-20"
        >
          {/* Ambient high-voltage ionized plasma field behind the cube */}
          <div
            className="w-full h-full rounded-full animate-electro-aura-pulse -z-20"
            style={{
              background: isRolling
                ? 'radial-gradient(circle, rgba(0,240,255,0.34) 0%, rgba(2,132,199,0.22) 48%, transparent 76%)'
                : 'radial-gradient(circle, rgba(0,240,255,0.46) 0%, rgba(56,189,248,0.24) 54%, transparent 78%)',
              filter: 'blur(2.5px)',
            }}
          />

          {/* A. Full-Body Electric Current Pulses Coursing Through the Cube Body (dimmed during 3D roll so tumbling cube stays crisp) */}
          <svg
            data-testid="electro-body-pulses"
            viewBox="0 0 120 120"
            className={`absolute inset-0 w-full h-full overflow-visible pointer-events-none z-10 transition-opacity duration-150 ${
              isRolling ? 'opacity-20' : 'opacity-100'
            }`}
            style={{
              filter: 'drop-shadow(0 0 2.5px rgba(0, 240, 255, 0.88))',
            }}
          >
            <defs>
              <radialGradient id="electroNodeFlareGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="38%" stopColor="#00F0FF" stopOpacity="0.82" />
                <stop offset="75%" stopColor="#0284C7" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#0369A1" stopOpacity="0" />
              </radialGradient>
            </defs>

            {electroBodyPulses.map((pulse) => (
              <g key={pulse.id} data-testid="electro-body-pulse-conduit">
                {/* Outer cobalt-cyan ionized plasma sheath */}
                <path
                  d={pulse.conduitPath}
                  fill="none"
                  stroke="rgba(2, 132, 199, 0.48)"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={pulse.dashArray}
                  className="animate-electro-body-pulse"
                  style={{
                    animationDuration: `${pulse.durationMs}ms`,
                    animationDelay: `${pulse.delayMs}ms`,
                  }}
                />
                {/* Mid electric cyan current wave */}
                <path
                  d={pulse.conduitPath}
                  fill="none"
                  stroke={pulse.plasmaHex}
                  strokeWidth="0.95"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={pulse.dashArray}
                  className="animate-electro-body-pulse"
                  style={{
                    animationDuration: `${pulse.durationMs}ms`,
                    animationDelay: `${pulse.delayMs}ms`,
                  }}
                />
                {/* Inner white-hot incandescent core filament */}
                <path
                  d={pulse.conduitPath}
                  fill="none"
                  stroke={pulse.coreHex}
                  strokeWidth="0.48"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={pulse.dashArray}
                  className="animate-electro-body-pulse"
                  style={{
                    animationDuration: `${pulse.durationMs}ms`,
                    animationDelay: `${pulse.delayMs}ms`,
                  }}
                />
                {/* Pulsing high-voltage junction node flare on the cube body */}
                <circle
                  cx={pulse.nodeX}
                  cy={pulse.nodeY}
                  r="2.4"
                  fill="url(#electroNodeFlareGrad)"
                  className="animate-electro-arc"
                  style={{ animationDelay: `${pulse.delayMs}ms` }}
                />
              </g>
            ))}
          </svg>

          {/* B. Idle State: Compact, Realistic Forked Electric Sparks Snapping Out of the Body of the Cube */}
          {!isRolling && (
            <svg
              data-testid="electro-idle-sparks"
              viewBox="0 0 120 120"
              className="absolute -inset-1.5 w-[calc(100%+12px)] h-[calc(100%+12px)] overflow-visible pointer-events-none z-20"
              style={{
                filter:
                  'drop-shadow(0 0 2px rgba(0, 240, 255, 0.92)) drop-shadow(0 0 4px rgba(2, 132, 199, 0.72))',
              }}
            >
              {electroIdleSparks.map((spark) => (
                <g
                  key={spark.id}
                  data-testid="electro-idle-spark-arc"
                  className="animate-electro-idle-spark"
                  style={
                    {
                      '--spark-dx': `${spark.snapDx}px`,
                      '--spark-dy': `${spark.snapDy}px`,
                      animationDuration: `${spark.durationMs}ms`,
                      animationDelay: `${spark.delayMs}ms`,
                    } as React.CSSProperties
                  }
                >
                  {/* Compact root electrode ionization flare on the cube body */}
                  <circle
                    cx={spark.rootX}
                    cy={spark.rootY}
                    r="2.0"
                    fill="url(#electroNodeFlareGrad)"
                  />
                  {/* Pass 1: Cobalt-blue plasma corona */}
                  <path
                    d={spark.mainBoltPath}
                    fill="none"
                    stroke={spark.coronaHex}
                    strokeWidth="1.85"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.62"
                  />
                  {/* Pass 2: Vivid electric cyan main fractal bolt & forked micro-branches */}
                  <path
                    d={spark.mainBoltPath}
                    fill="none"
                    stroke={spark.plasmaHex}
                    strokeWidth="1.05"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={spark.branchBoltPath}
                    fill="none"
                    stroke={spark.plasmaHex}
                    strokeWidth="0.72"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.88"
                  />
                  {/* Pass 3: Razor-sharp white-hot core filament */}
                  <path
                    d={spark.mainBoltPath}
                    fill="none"
                    stroke={spark.coreHex}
                    strokeWidth="0.48"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={spark.branchBoltPath}
                    fill="none"
                    stroke={spark.coreHex}
                    strokeWidth="0.34"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              ))}
            </svg>
          )}

          {/* C. Rolling State: Sleek Concentric 360° Circular Electric Pulse Waves + 4 Corner Discharges */}
          {(isRolling || isLanding) && (
            <svg
              data-testid="electro-rolling-pulses"
              viewBox="0 0 140 140"
              className="absolute -inset-3.5 w-[calc(100%+28px)] h-[calc(100%+28px)] overflow-visible pointer-events-none z-20"
              style={{
                filter:
                  'drop-shadow(0 0 2.5px rgba(0, 240, 255, 0.9)) drop-shadow(0 0 5px rgba(2, 132, 199, 0.7))',
              }}
            >
              {/* 1. Staggered 360-Degree Circular Realistic Electric Pulse Waves Expanding in a Wave-Like Pattern */}
              {electroCircularWaves.map((wave) => (
                <g
                  key={wave.id}
                  data-testid="electro-circular-wave-ring"
                  className="animate-electro-circular-wave"
                  style={{
                    animationDuration: `${wave.durationMs}ms`,
                    animationDelay: `-${wave.delayMs}ms`,
                  }}
                >
                  {/* Pass 1: Deep cobalt-blue outer circular wave corona */}
                  <path
                    d={wave.waveRingPath}
                    fill="none"
                    stroke={wave.coronaHex}
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.58"
                  />
                  {/* Pass 2: Vivid electric cyan sinusoidal circular wave */}
                  <path
                    d={wave.waveRingPath}
                    fill="none"
                    stroke={wave.plasmaHex}
                    strokeWidth="1.15"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Pass 3: Subtle counter-phased harmonic plasma filament */}
                  <path
                    d={wave.harmonicRingPath}
                    fill="none"
                    stroke={wave.plasmaHex}
                    strokeWidth="0.65"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.62"
                  />
                  {/* Pass 4: Crisp radial micro-sparks at wave crests */}
                  <path
                    d={wave.radialSparksPath}
                    fill="none"
                    stroke={wave.plasmaHex}
                    strokeWidth="0.82"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.85"
                  />
                  {/* Pass 5: Razor-sharp white-hot circular wave core */}
                  <path
                    d={wave.waveRingPath}
                    fill="none"
                    stroke={wave.coreHex}
                    strokeWidth="0.52"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              ))}

              {/* 2. 4 Clean Diagonal Corner Lightning Streamers (decluttered so wave rings & 3D cube dominate) */}
              {electroRollingPulses.slice(0, 4).map((pulse) => (
                <g
                  key={pulse.id}
                  data-testid="electro-rolling-pulse-burst"
                  className="animate-electro-roll-pulse"
                  style={
                    {
                      '--electro-dx': `${pulse.burstDx}px`,
                      '--electro-dy': `${pulse.burstDy}px`,
                      animationDuration: `${pulse.durationMs}ms`,
                      animationDelay: `${pulse.delayMs}ms`,
                    } as React.CSSProperties
                  }
                >
                  <circle
                    cx={pulse.originX}
                    cy={pulse.originY}
                    r="1.8"
                    fill="url(#electroNodeFlareGrad)"
                  />
                  <path
                    d={pulse.lightningBoltPath}
                    fill="none"
                    stroke={pulse.coronaHex}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.54"
                  />
                  <path
                    d={pulse.lightningBoltPath}
                    fill="none"
                    stroke={pulse.plasmaHex}
                    strokeWidth="0.88"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={pulse.forkBranchPath}
                    fill="none"
                    stroke={pulse.plasmaHex}
                    strokeWidth="0.58"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.76"
                  />
                  <path
                    d={pulse.lightningBoltPath}
                    fill="none"
                    stroke={pulse.coreHex}
                    strokeWidth="0.42"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              ))}
            </svg>
          )}
        </div>
      )}

      {/* ======================================================================
           3. TESSERACT CUBE TRANSPARENT CRYSTAL HYPERCUBE, IDLE 4D PRECESSION & 4D-WARP ROLLING EVERSION
          ====================================================================== */}
      {!reducedMotion && diceStyle === 'tesseract_cube' && (
        <div
          aria-hidden="true"
          data-testid="fx-tesseract-cube"
          className="absolute inset-0 pointer-events-none overflow-visible flex items-center justify-center z-20"
        >
          {/* Ambient 4D Prismatic Portal Glow Behind the Transparent Cube */}
          <div
            className="w-full h-full rounded-xl animate-tesseract-aura-pulse -z-20"
            style={{
              background: isRolling
                ? 'radial-gradient(circle, rgba(103,232,249,0.52) 0%, rgba(232,121,249,0.38) 48%, rgba(124,58,237,0.18) 68%, transparent 82%)'
                : 'radial-gradient(circle, rgba(103,232,249,0.32) 0%, rgba(192,132,252,0.24) 52%, transparent 78%)',
            }}
          />

          {/* A. Continuous 4D Hypercube Idle & Rolling Internal Conduit Animation */}
          <svg
            data-testid="tesseract-idle-4d-animation"
            viewBox="0 0 100 100"
            className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] overflow-visible pointer-events-none z-10"
            style={{
              filter:
                'drop-shadow(0 0 3px rgba(103, 232, 249, 0.85)) drop-shadow(0 0 5px rgba(232, 121, 249, 0.65))',
            }}
          >
            {/* Counter-precessing outer & inner 4D Schlegel hypercube chambers */}
            <g className="animate-tesseract-outer">
              <rect
                x="18"
                y="18"
                width="64"
                height="64"
                rx="6"
                fill="none"
                stroke="rgba(103, 232, 249, 0.62)"
                strokeWidth="1.1"
                strokeDasharray="6 4"
              />
            </g>
            <g className="animate-tesseract-inner">
              <rect
                x="30"
                y="30"
                width="40"
                height="40"
                rx="4"
                fill="rgba(103, 232, 249, 0.08)"
                stroke="rgba(232, 121, 249, 0.78)"
                strokeWidth="1.25"
              />
              <polygon
                points="50,24 76,50 50,76 24,50"
                fill="none"
                stroke="rgba(103, 232, 249, 0.7)"
                strokeWidth="0.95"
              />
            </g>

            {/* Traveling 4D energy light packets flowing through the diagonal struts & chambers */}
            {tesseractIdlePulses.map((tp) => (
              <g key={tp.id}>
                <path
                  d={tp.path}
                  fill="none"
                  stroke={tp.strokeHex}
                  strokeWidth={isRolling ? '1.65' : '1.25'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={tp.dashArray}
                  className="animate-tesseract-idle-energy"
                  style={{
                    animationDuration: `${isRolling ? Math.round(tp.durationMs * 0.45) : tp.durationMs}ms`,
                    animationDelay: `${tp.delayMs}ms`,
                  }}
                />
                <path
                  d={tp.path}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={isRolling ? '0.75' : '0.55'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={tp.dashArray}
                  className="animate-tesseract-idle-energy"
                  style={{
                    animationDuration: `${isRolling ? Math.round(tp.durationMs * 0.45) : tp.durationMs}ms`,
                    animationDelay: `${tp.delayMs}ms`,
                  }}
                />
              </g>
            ))}
          </svg>

          {/* B. 4D-Warp 6-Face Transparent Crystal CSS 3D Manifold (Active in Both Idle & Rolling States) */}
          <div
            data-testid="tesseract-4d-warp-stage"
            data-warp-phase={tesseractWarpPhase}
            className="tesseract-4d-warp-stage absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible"
          >
            <div
              data-testid="tesseract-4d-warp-manifold"
              className={`tesseract-4d-warp-manifold relative flex items-center justify-center ${
                isRolling
                  ? 'animate-tesseract-4d-manifold'
                  : 'animate-tesseract-idle-manifold'
              }`}
              style={{
                width: `${tesseractFaceSizePx}px`,
                height: `${tesseractFaceSizePx}px`,
                opacity: isRolling ? 0.9 : isLanding ? 0.52 : 0.26,
              }}
            >
              {/* Counter-Inverting / Precessing Inner 4D Hypercube Core Chamber */}
              <div
                data-testid="tesseract-4d-inner-core"
                className={`absolute inset-2.5 rounded-md border border-cyan-300/80 pointer-events-none ${
                  isRolling
                    ? 'animate-tesseract-4d-core'
                    : 'animate-tesseract-idle-core'
                }`}
                style={{
                  background:
                    'radial-gradient(circle, rgba(103,232,249,0.14) 0%, rgba(232,121,249,0.10) 60%, rgba(15,7,38,0.02) 100%)',
                  boxShadow:
                    '0 0 8px rgba(103,232,249,0.65), inset 0 0 6px rgba(232,121,249,0.55)',
                }}
              />

              {/* All 6 Transparent Crystal Tesseract Faces (Idle 4D Breathing + Rolling Inside-Out Eversion) */}
              {tesseractWarpFaces.map((face) => (
                <div
                  key={face.id}
                  data-testid={`tesseract-warp-face-${face.faceId}`}
                  data-face-id={face.faceId}
                  data-face-value={face.faceValue}
                  data-dimension-axis={face.dimensionLabel}
                  className={`tesseract-4d-face absolute inset-0 rounded-lg pointer-events-none ${
                    isRolling
                      ? 'animate-tesseract-4d-face'
                      : 'animate-tesseract-idle-face'
                  }`}
                  style={
                    {
                      '--tess-rest-transform': face.restTransform,
                      '--tess-idle-transform': face.idlePrecessTransform,
                      '--tess-inside-out-transform': face.insideOutTransform,
                      '--tess-shift-transform':
                        face.dimensionalShiftTransform,
                      transform: isRolling
                        ? face.insideOutTransform
                        : isLanding
                          ? face.dimensionalShiftTransform
                          : face.idlePrecessTransform,
                      animationDelay: `${face.warpDelayMs}ms`,
                      animationDuration: `${isRolling ? face.warpDurationMs : 2800}ms`,
                      background:
                        'linear-gradient(135deg, rgba(103,232,249,0.06) 0%, rgba(192,132,252,0.03) 50%, rgba(232,121,249,0.07) 100%)',
                      border: `1px solid ${face.primaryBorderHex}CC`,
                      boxShadow: `0 0 6px ${face.primaryBorderHex}55, inset 0 0 5px ${face.secondaryGlowHex}44`,
                    } as React.CSSProperties
                  }
                >
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full overflow-visible"
                  >
                    {/* 4D Schlegel Perspective Struts Connecting Outer Face to Inverted Inner Chamber */}
                    <line
                      x1="8"
                      y1="8"
                      x2="26"
                      y2="26"
                      stroke={face.primaryBorderHex}
                      strokeWidth="1.5"
                      opacity="0.88"
                    />
                    <line
                      x1="92"
                      y1="8"
                      x2="74"
                      y2="26"
                      stroke={face.primaryBorderHex}
                      strokeWidth="1.5"
                      opacity="0.88"
                    />
                    <line
                      x1="8"
                      y1="92"
                      x2="26"
                      y2="74"
                      stroke={face.secondaryGlowHex}
                      strokeWidth="1.5"
                      opacity="0.88"
                    />
                    <line
                      x1="92"
                      y1="92"
                      x2="74"
                      y2="74"
                      stroke={face.secondaryGlowHex}
                      strokeWidth="1.5"
                      opacity="0.88"
                    />
                    {/* See-Through Nested Inner Hypercube Chamber Square */}
                    <rect
                      x="26"
                      y="26"
                      width="48"
                      height="48"
                      rx="5"
                      fill="rgba(103, 232, 249, 0.06)"
                      stroke={face.secondaryGlowHex}
                      strokeWidth="1.4"
                      opacity="0.92"
                    />
                    {/* Inner-most 4D Singularity Frame */}
                    <rect
                      x="38"
                      y="38"
                      width="24"
                      height="24"
                      rx="3"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="0.9"
                      opacity="0.85"
                    />
                    {/* Dimensional Face Pips (1..6) */}
                    {face.pipCoords.map(([px, py], pIdx) => (
                      <g key={`${face.id}-pip-${pIdx}`}>
                        <circle
                          cx={px}
                          cy={py}
                          r="5.8"
                          fill={face.primaryBorderHex}
                          opacity="0.42"
                        />
                        <circle
                          cx={px}
                          cy={py}
                          r="3.2"
                          fill="#FFFFFF"
                          opacity="0.95"
                        />
                      </g>
                    ))}
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* C. Enhanced Dual Counter-Rotating 4D Portal Rings During Rolling */}
          {isRolling && (
            <>
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full overflow-visible animate-orbit-ccw"
              >
                <polygon
                  points="50,5 82,18 95,50 82,82 50,95 18,82 5,50 18,18"
                  fill="none"
                  stroke="#67E8F9"
                  strokeWidth="1.35"
                  strokeDasharray="6 4"
                  opacity="0.88"
                />
                <circle cx="50" cy="5" r="2.0" fill="#FFFFFF" />
                <circle cx="95" cy="50" r="2.0" fill="#67E8F9" />
                <circle cx="50" cy="95" r="2.0" fill="#FFFFFF" />
                <circle cx="5" cy="50" r="2.0" fill="#67E8F9" />
              </svg>
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full overflow-visible animate-orbit-cw-fast"
              >
                <polygon
                  points="50,9 79,21 91,50 79,79 50,91 21,79 9,50 21,21"
                  fill="none"
                  stroke="#E879F9"
                  strokeWidth="1.15"
                  strokeDasharray="4 4"
                  opacity="0.82"
                />
                <polygon
                  points="50,16 84,50 50,84 16,50"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="0.75"
                  opacity="0.65"
                />
              </svg>
            </>
          )}
        </div>
      )}

      {/* ======================================================================
           4. COSMO CUBE: CELESTIAL NEBULA IDLE ANIMATION & SUPERNOVA VORTEX ROLL
          ====================================================================== */}
      {!reducedMotion && diceStyle === 'cosmo_cube' && (
        <div
          aria-hidden="true"
          data-testid="fx-cosmo-cube"
          className="absolute inset-0 -m-1.5 pointer-events-none overflow-visible flex items-center justify-center"
        >
          {/* Ambient Deep-Space Nebula Corona */}
          <div
            className="w-full h-full rounded-full animate-cosmo-aura-pulse"
            style={{
              background:
                'radial-gradient(circle, rgba(244,114,182,0.44) 0%, rgba(139,92,246,0.28) 50%, rgba(56,189,248,0.14) 68%, transparent 78%)',
            }}
          />

          {/* A. Idle State: Swirling Spiral Galaxy Arms, Dual Tilted Planetary Rings & Twinkling Starlight Glints */}
          {!isRolling && cosmoIdleCelestial && (
            <svg
              data-testid="cosmo-idle-celestial"
              viewBox="0 0 100 100"
              className={`absolute overflow-visible pointer-events-none z-20 ${
                showShadow
                  ? '-inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)]'
                  : 'inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)]'
              }`}
              style={{
                filter:
                  'drop-shadow(0 0 2.5px rgba(244, 114, 182, 0.78)) drop-shadow(0 0 5px rgba(139, 92, 246, 0.55))',
              }}
            >
              {/* 1. Slowly Swirling 4-Arm Logarithmic Spiral Galaxy Filaments */}
              <g className="animate-cosmo-galaxy-idle" opacity="0.52">
                {cosmoIdleCelestial.galaxySpiralArms.map((arm) => (
                  <g key={arm.id}>
                    <path
                      d={arm.armPath}
                      fill="none"
                      stroke={arm.glowHex}
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      opacity="0.45"
                    />
                    <path
                      d={arm.armPath}
                      fill="none"
                      stroke={arm.coreHex}
                      strokeWidth="0.85"
                      strokeLinecap="round"
                      opacity="0.68"
                    />
                  </g>
                ))}
              </g>

              {/* 2. Dual Tilted Elliptical Planetary Orbits with Revolving Planets & Moons */}
              {cosmoIdleCelestial.orbits.map((orbit) => (
                <g
                  key={orbit.id}
                  data-testid="cosmo-idle-orbit"
                  className={
                    orbit.direction === 'cw'
                      ? 'animate-cosmo-orbit-cw'
                      : 'animate-cosmo-orbit-ccw'
                  }
                  style={{
                    animationDuration: `${orbit.durationMs}ms`,
                  }}
                >
                  <g transform={`rotate(${orbit.tiltDeg} 50 50)`}>
                    {/* Soft outer ring glow */}
                    <ellipse
                      cx="50"
                      cy="50"
                      rx={orbit.rx + 4}
                      ry={orbit.ry + 1.5}
                      fill="none"
                      stroke={orbit.strokeHex}
                      strokeWidth="2.1"
                      opacity="0.34"
                    />
                    {/* Crisp dashed celestial ring */}
                    <ellipse
                      cx="50"
                      cy="50"
                      rx={orbit.rx + 4}
                      ry={orbit.ry + 1.5}
                      fill="none"
                      stroke={orbit.strokeHex}
                      strokeWidth="1.05"
                      strokeDasharray={orbit.dashArray}
                      opacity="0.88"
                    />
                  </g>
                  {/* Primary orbiting planet + white-hot core */}
                  <circle
                    cx={orbit.planetX}
                    cy={orbit.planetY}
                    r={orbit.planetRadius}
                    fill={orbit.planetHex}
                  />
                  <circle
                    cx={orbit.planetX}
                    cy={orbit.planetY}
                    r={orbit.planetRadius * 0.48}
                    fill="#FFFFFF"
                  />
                  {/* Opposite companion moon */}
                  <circle
                    cx={orbit.moonX}
                    cy={orbit.moonY}
                    r={orbit.planetRadius * 0.72}
                    fill={orbit.moonHex}
                    opacity="0.92"
                  />
                </g>
              ))}

              {/* 3. Twinkling 4-Point Diamond Starlight Glints */}
              {cosmoIdleCelestial.starGlints.map((star) => (
                <path
                  key={star.id}
                  data-testid="cosmo-idle-star-glint"
                  d={star.diamondPath}
                  fill={star.colorHex}
                  className="animate-cosmo-star-twinkle"
                  style={{
                    animationDuration: `${star.durationMs}ms`,
                    animationDelay: `-${star.delayMs}ms`,
                  }}
                />
              ))}
            </svg>
          )}

          {/* B. Rolling State: Supernova Spiral Galaxy Vortex, Fast Gyroscopic Planetary Rings & Streaking Comets */}
          {(isRolling || isLanding) && cosmoRollingSupernova && (
            <svg
              data-testid="cosmo-rolling-supernova"
              viewBox="0 0 120 120"
              className="absolute -inset-1.5 w-[calc(100%+12px)] h-[calc(100%+12px)] overflow-visible pointer-events-none z-20"
              style={{
                filter:
                  'drop-shadow(0 0 3px rgba(244, 114, 182, 0.92)) drop-shadow(0 0 6px rgba(56, 189, 248, 0.72))',
              }}
            >
              {/* 1. Dual Fast-Precessing Gyroscopic Planetary Accretion Rings */}
              <g
                className="animate-orbit-cw-fast"
                style={{ transformOrigin: '60px 60px' }}
              >
                <ellipse
                  cx="60"
                  cy="60"
                  rx={cosmoRollingSupernova.accretionRingRadius + 4}
                  ry="16.5"
                  fill="none"
                  stroke="#FDE68A"
                  strokeWidth="1.45"
                  strokeDasharray="16 8"
                  transform="rotate(-32 60 60)"
                  opacity="0.88"
                />
                <ellipse
                  cx="60"
                  cy="60"
                  rx={cosmoRollingSupernova.accretionRingRadius * 0.96 + 3}
                  ry="15"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="1.35"
                  strokeDasharray="12 9"
                  transform="rotate(34 60 60)"
                  opacity="0.84"
                />
              </g>

              {/* 2. 4 Expanding Logarithmic Spiral Galaxy Arms Whipping Outward */}
              {cosmoRollingSupernova.spiralArms.map((arm) => (
                <g
                  key={arm.id}
                  data-testid="cosmo-rolling-spiral-arm"
                  className="animate-cosmo-spiral-roll"
                  style={{
                    animationDelay: `-${arm.delayMs}ms`,
                  }}
                >
                  {/* Outer nebula glow filament */}
                  <path
                    d={arm.spiralArmPath}
                    fill="none"
                    stroke={arm.nebulaHex}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.64"
                  />
                  {/* Starlight secondary trail */}
                  <path
                    d={arm.starlightTrailPath}
                    fill="none"
                    stroke={arm.nebulaHex}
                    strokeWidth="1.05"
                    strokeDasharray="4 3"
                    strokeLinecap="round"
                    opacity="0.72"
                  />
                  {/* Inner bright starlight core filament */}
                  <path
                    d={arm.spiralArmPath}
                    fill="none"
                    stroke={arm.coreHex}
                    strokeWidth="1.15"
                    strokeLinecap="round"
                  />
                  {/* Starburst node at spiral arm tip */}
                  <circle cx={arm.tipX} cy={arm.tipY} r="1.9" fill="#FFFFFF" />
                </g>
              ))}

              {/* 3. Blazing Shooting-Star Comet Trails Streaking Around Perimeter */}
              {cosmoRollingSupernova.comets.map((comet) => (
                <g
                  key={comet.id}
                  data-testid="cosmo-rolling-comet"
                  className="animate-cosmo-comet-roll"
                  style={{
                    animationDuration: `${comet.durationMs}ms`,
                    animationDelay: `-${comet.delayMs}ms`,
                  }}
                >
                  {/* Glowing comet tail */}
                  <path
                    d={comet.cometTailPath}
                    fill="none"
                    stroke={comet.tailHex}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    opacity="0.88"
                  />
                  {/* White-hot comet head */}
                  <circle
                    cx={comet.headX}
                    cy={comet.headY}
                    r="2.4"
                    fill={comet.headHex}
                  />
                  <circle
                    cx={comet.headX}
                    cy={comet.headY}
                    r="1.3"
                    fill="#FFFFFF"
                  />
                </g>
              ))}
            </svg>
          )}
        </div>
      )}

      {/* ======================================================================
          LANDING IMPACT SHOCKWAVE PER DIE (Underneath the 3D cube at z-0)
          ====================================================================== */}
      {isLanding && !reducedMotion && (
        <div
          aria-hidden="true"
          data-testid="dice-landing-impact"
          className="absolute inset-0 -m-2.5 pointer-events-none flex items-center justify-center overflow-visible z-0"
        >
          {diceStyle === 'lava_cube' && (
            <>
              {/* Tabletop Surface Lava Drop Splash Puddle underneath the landing cube */}
              <svg
                data-testid="die-surface-lava-drop-splash"
                viewBox="0 0 120 120"
                className="absolute -inset-3.5 w-[calc(100%+28px)] h-[calc(100%+28px)] overflow-visible animate-lava-board-puddle pointer-events-none"
                style={{ filter: 'drop-shadow(0 0 8px rgba(255, 61, 0, 0.85))' }}
              >
                {/* Organic multi-lobed molten lava splash puddle on surface */}
                <path
                  d="M 60 12 C 74 10, 88 20, 98 30 C 108 40, 110 56, 104 70 C 98 84, 106 96, 92 104 C 78 112, 66 104, 52 108 C 38 112, 22 104, 16 90 C 10 76, 14 60, 12 44 C 10 28, 26 16, 42 14 C 50 13, 54 13, 60 12 Z"
                  fill="rgba(153, 27, 27, 0.65)"
                  stroke="#FF3D00"
                  strokeWidth="2"
                />
                <path
                  d="M 60 20 C 72 19, 83 26, 90 36 C 97 46, 98 58, 93 69 C 88 80, 92 90, 81 96 C 70 102, 61 95, 49 98 C 37 101, 26 93, 22 82 C 18 71, 21 58, 20 46 C 19 34, 32 23, 45 21 Z"
                  fill="rgba(255, 109, 0, 0.58)"
                />
                {/* Outer splashing lava drops on surface */}
                <ellipse
                  cx="14"
                  cy="24"
                  rx="6.5"
                  ry="4.2"
                  transform="rotate(-35 14 24)"
                  fill="#FF6D00"
                />
                <ellipse
                  cx="14"
                  cy="24"
                  rx="3.5"
                  ry="2.2"
                  transform="rotate(-35 14 24)"
                  fill="#FFF59D"
                />
                <ellipse
                  cx="106"
                  cy="26"
                  rx="6.2"
                  ry="4.0"
                  transform="rotate(35 106 26)"
                  fill="#FF6D00"
                />
                <ellipse
                  cx="106"
                  cy="26"
                  rx="3.2"
                  ry="2.0"
                  transform="rotate(35 106 26)"
                  fill="#FFF59D"
                />
                <ellipse
                  cx="12"
                  cy="94"
                  rx="6.8"
                  ry="4.2"
                  transform="rotate(-140 12 94)"
                  fill="#FF3D00"
                />
                <ellipse
                  cx="12"
                  cy="94"
                  rx="3.4"
                  ry="2.1"
                  transform="rotate(-140 12 94)"
                  fill="#FFEE58"
                />
                <ellipse
                  cx="108"
                  cy="94"
                  rx="6.5"
                  ry="4.2"
                  transform="rotate(140 108 94)"
                  fill="#FF6D00"
                />
                <ellipse
                  cx="108"
                  cy="94"
                  rx="3.4"
                  ry="2.1"
                  transform="rotate(140 108 94)"
                  fill="#FFF59D"
                />
              </svg>
              <div
                className="w-full h-full rounded-xl border-2 border-orange-500 animate-dice-impact-ripple"
                style={{
                  boxShadow:
                    '0 0 24px rgba(255, 106, 0, 0.95), inset 0 0 16px rgba(255, 42, 0, 0.85)',
                }}
              />
              <svg
                viewBox="0 0 100 100"
                className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] overflow-visible animate-dice-impact-ripple"
                style={{ filter: 'drop-shadow(0 1px 4px rgba(185, 28, 28, 0.85))' }}
              >
                {/* Organic teardrop lava splatter blobs on landing (no straight lines) */}
                <g transform="translate(10, 10) rotate(-45)">
                  <ellipse cx="0" cy="0" rx="6.2" ry="3.8" fill="#450A0A" />
                  <ellipse cx="-1" cy="0" rx="4.8" ry="2.8" fill="#DC2626" />
                  <ellipse cx="-2" cy="0" rx="2.6" ry="1.6" fill="#FF6D00" />
                </g>
                <g transform="translate(90, 12) rotate(45)">
                  <ellipse cx="0" cy="0" rx="6.0" ry="3.6" fill="#450A0A" />
                  <ellipse cx="1" cy="0" rx="4.6" ry="2.6" fill="#DC2626" />
                  <ellipse cx="2" cy="0" rx="2.5" ry="1.5" fill="#FF6D00" />
                </g>
                <g transform="translate(12, 90) rotate(-135)">
                  <ellipse cx="0" cy="0" rx="6.2" ry="3.8" fill="#450A0A" />
                  <ellipse cx="1" cy="0" rx="4.8" ry="2.8" fill="#DC2626" />
                  <ellipse cx="2" cy="0" rx="2.6" ry="1.6" fill="#FF5722" />
                </g>
                <g transform="translate(90, 90) rotate(135)">
                  <ellipse cx="0" cy="0" rx="6.2" ry="3.8" fill="#450A0A" />
                  <ellipse cx="1" cy="0" rx="4.8" ry="2.8" fill="#DC2626" />
                  <ellipse cx="2" cy="0" rx="2.6" ry="1.6" fill="#FF6D00" />
                </g>
              </svg>
            </>
          )}

          {diceStyle === 'electro_cube' && (
            <>
              <div
                className="w-full h-full rounded-xl border-2 border-cyan-300 animate-dice-impact-ripple"
                style={{
                  boxShadow:
                    '0 0 22px rgba(0, 240, 255, 0.95), inset 0 0 14px rgba(56, 189, 248, 0.8)',
                }}
              />
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full overflow-visible animate-dice-impact-ripple"
              >
                <polyline points="4,4 -8,-4 -3,-10" fill="none" stroke="#FFFFFF" strokeWidth="2" />
                <polyline points="96,4 108,-4 103,-10" fill="none" stroke="#00F0FF" strokeWidth="2" />
                <polyline points="4,96 -8,104 -3,110" fill="none" stroke="#00F0FF" strokeWidth="2" />
                <polyline points="96,96 108,104 103,110" fill="none" stroke="#FFFFFF" strokeWidth="2" />
              </svg>
            </>
          )}

          {diceStyle === 'tesseract_cube' && (
            <>
              <div
                className="w-full h-full rounded-lg border-2 border-purple-400 animate-dice-impact-ripple"
                style={{
                  boxShadow:
                    '0 0 20px rgba(192, 132, 252, 0.9), inset 0 0 14px rgba(56, 189, 248, 0.8)',
                }}
              />
              <div
                className="absolute inset-1 rounded-lg border border-cyan-300 animate-dice-impact-ripple"
                style={{ transform: 'rotate(45deg) scale(0.9)' }}
              />
            </>
          )}

          {diceStyle === 'cosmo_cube' && (
            <div
              className="w-full h-full rounded-full border-2 border-indigo-300 animate-dice-impact-ripple"
              style={{
                boxShadow:
                  '0 0 20px rgba(192, 132, 252, 0.85), 0 0 28px rgba(56, 189, 248, 0.7)',
              }}
            />
          )}

          {!isPremium2D && (
            <div
              className="w-full h-full rounded-xl border border-white/40 animate-dice-impact-ripple"
              style={{
                boxShadow: `0 0 14px ${styleOpt.coreGlowHex}`,
              }}
            />
          )}
        </div>
      )}

      {/* ======================================================================
          HYPER-REALISTIC 3D RAYCASTED ROUNDED-CUBE RENDERER
          Single solid 3D rounded cube (`sdRoundBox` with 24% corner/edge fillet)
          with 3D bump-mapped surface relief, PBR specular reflections, and
          style-specific pulsating 3D idle & rolling animations
          ====================================================================== */}
      <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none">
        <RoundedCube3DCanvas
          value={safeFace}
          isRolling={isRolling}
          isLanding={isLanding}
          diceStyle={diceStyle}
          activeColor={activeColor}
          size={size}
          reducedMotion={reducedMotion}
          isCooling={isCooling}
        />
      </div>

      {/* Interactive Can-Roll Indicator Pip */}
      {interactive && canRoll && !isRolling && (
        <span
          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 pointer-events-none animate-pulse z-20"
          style={{ backgroundColor: colorMeta.primaryHex }}
        />
      )}
    </div>
  );
};
